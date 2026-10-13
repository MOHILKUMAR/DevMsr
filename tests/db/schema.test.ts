import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, createUser, leadPayload, type TestDb } from './harness';
import { SERVICE_SEED } from '../../src/data/seed/services';
import { PRICING_SEED } from '../../src/data/seed/pricing';

/**
 * Applies the real migrations and seed to an in-process PostgreSQL (PGlite)
 * with Supabase-like roles, then checks constraints, functions and RLS.
 */

let t: TestDb;
let ownerId: string;
let adminId: string;
let editorId: string;
let plainUserId: string;
let inactiveAdminId: string;

async function createLeadAsServer(overrides: Record<string, unknown> = {}) {
  return t.as(
    'service_role',
    null,
    async (tx) => {
      const { rows } = await tx.query<{ lead_id: string; reference_number: string; is_duplicate: boolean }>(
        'select * from public.create_lead($1::jsonb)',
        [JSON.stringify(leadPayload(overrides))],
      );
      return rows[0]!;
    },
    true,
  );
}

beforeAll(async () => {
  t = await createTestDb();
  ownerId = await createUser(t.db, { role: 'owner' });
  adminId = await createUser(t.db, { role: 'admin' });
  editorId = await createUser(t.db, { role: 'editor' });
  inactiveAdminId = await createUser(t.db, { role: 'admin', active: false });
  plainUserId = await createUser(t.db);
});

describe('migrations and seed', () => {
  it('seeds the full catalogue', async () => {
    const { rows } = await t.db.query<{ services: number; prices: number; industries: number }>(
      'select (select count(*)::int from public.services) as services, (select count(*)::int from public.service_pricing) as prices, (select count(*)::int from public.industries) as industries',
    );
    expect(rows[0]).toEqual({ services: SERVICE_SEED.length, prices: PRICING_SEED.length, industries: 6 });
  });

  it('is idempotent when the seed runs twice', async () => {
    const { readFileSync } = await import('node:fs');
    await t.db.exec(readFileSync(new URL('../../supabase/seed.sql', import.meta.url), 'utf8'));
    const { rows } = await t.db.query<{ n: number }>('select count(*)::int as n from public.service_pricing');
    expect(rows[0]!.n).toBe(PRICING_SEED.length);
  });

  it('rejects inconsistent price ranges', async () => {
    await expect(
      t.db.query(
        `insert into public.service_pricing (service_id, display_group, pricing_model, minimum_amount, maximum_amount)
         select id, 'websites', 'range', 5000, 1000 from public.services where slug = 'landing-page'`,
      ),
    ).rejects.toThrow(/service_pricing_amounts_consistent/);
  });

  it('rejects non-https image URLs and invalid slugs', async () => {
    await expect(t.db.query(`insert into public.products (name, slug, image_urls) values ('Bad', 'bad-images', array['http://x.test/a.png'])`)).rejects.toThrow();
    await expect(t.db.query(`insert into public.products (name, slug) values ('Bad', 'Bad Slug')`)).rejects.toThrow();
  });
});

describe('public catalogue (anon)', () => {
  it('returns the catalogue with exact decimal amounts as text', async () => {
    const catalogue = await t.as('anon', null, async (tx) => {
      const { rows } = await tx.query<{ c: Record<string, unknown[]> }>('select public.get_public_catalogue() as c');
      return rows[0]!.c as { pricing: { service_slug: string; minimum_amount: string; maximum_amount: string }[]; services: unknown[] };
    });
    expect(catalogue.services).toHaveLength(SERVICE_SEED.length);
    const ecommerce = catalogue.pricing.find((p) => p.service_slug === 'ecommerce-website');
    expect(ecommerce).toMatchObject({ minimum_amount: '25000.00', maximum_amount: '100000.00' });
  });

  it('returns what can increase each price', async () => {
    const pricing = await t.as('anon', null, async (tx) => {
      const { rows } = await tx.query<{ c: { pricing: { service_slug: string; price_factors: string[] }[] } }>('select public.get_public_catalogue() as c');
      return rows[0]!.c.pricing;
    });
    expect(pricing).toHaveLength(PRICING_SEED.length);
    for (const price of pricing) expect(price.price_factors.length, price.service_slug).toBeGreaterThan(0);
    const landing = PRICING_SEED.find((row) => row.serviceSlug === 'landing-page')!;
    expect(pricing.find((p) => p.service_slug === 'landing-page')?.price_factors).toEqual(landing.factors);
  });

  it('hides inactive services and their prices', async () => {
    await t.db.query(`update public.services set is_active = false where slug = 'landing-page'`);
    const result = await t.as('anon', null, async (tx) => {
      const { rows } = await tx.query<{ c: { services: { slug: string }[]; pricing: { service_slug: string }[] } }>('select public.get_public_catalogue() as c');
      return rows[0]!.c;
    });
    expect(result.services.some((s) => s.slug === 'landing-page')).toBe(false);
    expect(result.pricing.some((p) => p.service_slug === 'landing-page')).toBe(false);
    await t.db.query(`update public.services set is_active = true where slug = 'landing-page'`);
  });

  it('cannot see draft posts or unpublished projects', async () => {
    await t.db.query(`insert into public.blog_posts (title, slug, status) values ('Draft', 'secret-draft', 'draft')`);
    await t.db.query(`insert into public.portfolio_projects (title, slug, is_published) values ('Hidden', 'hidden-project', false)`);
    const counts = await t.as('anon', null, async (tx) => {
      const posts = await tx.query('select 1 from public.blog_posts where slug = $1', ['secret-draft']);
      const projects = await tx.query('select 1 from public.public_portfolio where slug = $1', ['hidden-project']);
      return [posts.rows.length, projects.rows.length];
    });
    expect(counts).toEqual([0, 0]);
  });

  it('cannot write to the catalogue', async () => {
    await expect(t.as('anon', null, (tx) => tx.query(`update public.service_pricing set minimum_amount = 1`))).rejects.toThrow(/permission denied/);
    await expect(t.as('anon', null, (tx) => tx.query(`insert into public.industries (name, slug) values ('X', 'x-industry')`))).rejects.toThrow(/permission denied/);
  });
});

describe('private data is closed to visitors', () => {
  it.each([
    ['leads', 'select * from public.leads'],
    ['lead_activities', 'select * from public.lead_activities'],
    ['notification_events', 'select * from public.notification_events'],
    ['admin_profiles', 'select * from public.admin_profiles'],
    ['audit_log', 'select * from public.audit_log'],
  ])('anon cannot read %s', async (_name, sql) => {
    await expect(t.as('anon', null, (tx) => tx.query(sql))).rejects.toThrow(/permission denied/);
  });

  it('anon cannot insert leads or call server-only functions', async () => {
    await expect(
      t.as('anon', null, (tx) =>
        tx.query(`insert into public.leads (submission_id, form_type, name, email, project_description, content_fingerprint, privacy_acknowledged_at)
                  values (gen_random_uuid(), 'contact', 'Bot', 'bot@example.com', 'xxxxxxxxxxxxxxxxxxxxxxxx', 'x', now())`),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(t.as('anon', null, (tx) => tx.query('select * from public.create_lead($1::jsonb)', [JSON.stringify(leadPayload())])))
      .rejects.toThrow(/permission denied/);
    await expect(t.as('anon', null, (tx) => tx.query(`select public.check_rate_limit('k', 1, 60)`))).rejects.toThrow(/permission denied/);
    await expect(t.as('anon', null, (tx) => tx.query(`select public.purge_expired_leads()`))).rejects.toThrow(/permission denied/);
  });

  it('signed-in users without an admin profile see no leads and cannot escalate', async () => {
    await createLeadAsServer();
    const rows = await t.as('authenticated', plainUserId, async (tx) => (await tx.query('select id from public.leads')).rows);
    expect(rows).toHaveLength(0);
    await expect(
      t.as('authenticated', plainUserId, (tx) =>
        tx.query(`insert into public.admin_profiles (auth_user_id, display_name, role) values ($1, 'Me', 'owner')`, [plainUserId]),
      ),
    ).rejects.toThrow(/permission denied/);
    const updated = await t.as('authenticated', plainUserId, async (tx) => (await tx.query(`update public.service_pricing set minimum_amount = 1 returning id`)).rows);
    expect(updated).toHaveLength(0);
  });

  it('inactive admins are treated as visitors', async () => {
    const rows = await t.as('authenticated', inactiveAdminId, async (tx) => (await tx.query('select id from public.leads')).rows);
    expect(rows).toHaveLength(0);
  });

  it('a user sees only their own admin profile unless owner', async () => {
    const adminSees = await t.as('authenticated', adminId, async (tx) => (await tx.query('select auth_user_id from public.admin_profiles')).rows);
    expect(adminSees).toEqual([{ auth_user_id: adminId }]);
    const ownerSees = await t.as('authenticated', ownerId, async (tx) => (await tx.query('select id from public.admin_profiles')).rows);
    expect(ownerSees.length).toBeGreaterThanOrEqual(4);
  });
});

describe('lead intake (service role)', () => {
  it('creates a lead with a reference number and a created activity', async () => {
    const result = await createLeadAsServer();
    expect(result.is_duplicate).toBe(false);
    expect(result.reference_number).toMatch(/^DM-\d{6}-[0-9A-F]{6}$/);
    const { rows } = await t.db.query<{ activity_type: string }>('select activity_type from public.lead_activities where lead_id = $1', [result.lead_id]);
    expect(rows.map((r) => r.activity_type)).toEqual(['created']);
    const lead = await t.db.query<{ industry_id: string | null; service_category: string }>('select industry_id, service_category from public.leads where id = $1', [result.lead_id]);
    expect(lead.rows[0]!.industry_id).not.toBeNull();
    expect(lead.rows[0]!.service_category).toBe('management-systems');
  });

  it('is idempotent on submission id', async () => {
    const submission = crypto.randomUUID();
    const first = await createLeadAsServer({ submission_id: submission });
    const second = await createLeadAsServer({ submission_id: submission, project_description: 'A different description that is long enough.' });
    expect(second.lead_id).toBe(first.lead_id);
    expect(second.is_duplicate).toBe(true);
  });

  it('treats an identical email + description within 30 minutes as a duplicate', async () => {
    const email = `dup.${crypto.randomUUID().slice(0, 6)}@example.com`;
    const first = await createLeadAsServer({ email });
    const second = await createLeadAsServer({ email: email.toUpperCase() });
    expect(second.lead_id).toBe(first.lead_id);
    expect(second.is_duplicate).toBe(true);
  });

  it('stores unknown industry or service slugs as null rather than failing', async () => {
    const result = await createLeadAsServer({ industry_slug: 'does-not-exist', service_slug: 'nope', service_category: 'web-development' });
    const { rows } = await t.db.query<{ industry_id: string | null; service_id: string | null; service_category: string }>(
      'select industry_id, service_id, service_category from public.leads where id = $1',
      [result.lead_id],
    );
    expect(rows[0]).toEqual({ industry_id: null, service_id: null, service_category: 'web-development' });
  });

  it('enforces field constraints in the database too', async () => {
    await expect(createLeadAsServer({ email: 'not-an-email' })).rejects.toThrow();
    await expect(createLeadAsServer({ project_description: 'too short' })).rejects.toThrow();
    await expect(createLeadAsServer({ phone: '12' })).rejects.toThrow();
  });

  it('rate limits per key and window', async () => {
    const key = `test:${crypto.randomUUID()}`;
    const results = await t.as('service_role', null, async (tx) => {
      const out: boolean[] = [];
      for (let i = 0; i < 4; i += 1) {
        const { rows } = await tx.query<{ ok: boolean }>('select public.check_rate_limit($1, 3, 3600) as ok', [key]);
        out.push(rows[0]!.ok);
      }
      return out;
    });
    expect(results).toEqual([true, true, true, false]);
  });
});

describe('admin lead management', () => {
  it('records status and follow-up changes with the acting admin', async () => {
    const { lead_id } = await createLeadAsServer();
    await t.as(
      'authenticated',
      adminId,
      (tx) => tx.query(`update public.leads set status = 'contacted', follow_up_at = now() + interval '2 days' where id = $1`, [lead_id]),
      true,
    );
    const { rows } = await t.db.query<{ activity_type: string; actor_id: string | null; metadata: { from?: string; to?: string } }>(
      `select a.activity_type, a.actor_id, a.metadata from public.lead_activities a where a.lead_id = $1 order by a.created_at, a.activity_type`,
      [lead_id],
    );
    const types = rows.map((r) => r.activity_type).sort();
    expect(types).toEqual(['created', 'follow_up_set', 'status_changed']);
    const statusChange = rows.find((r) => r.activity_type === 'status_changed')!;
    expect(statusChange.metadata).toMatchObject({ from: 'new', to: 'contacted' });
    const profile = await t.db.query<{ id: string }>('select id from public.admin_profiles where auth_user_id = $1', [adminId]);
    expect(statusChange.actor_id).toBe(profile.rows[0]!.id);
  });

  it('rejects invalid statuses', async () => {
    const { lead_id } = await createLeadAsServer();
    await expect(t.as('authenticated', adminId, (tx) => tx.query(`update public.leads set status = 'archived' where id = $1`, [lead_id]))).rejects.toThrow();
  });

  it('lets admins add notes as themselves only', async () => {
    const { lead_id } = await createLeadAsServer();
    const profile = await t.db.query<{ id: string }>('select id from public.admin_profiles where auth_user_id = $1', [adminId]);
    await t.as('authenticated', adminId, (tx) =>
      tx.query(`insert into public.lead_activities (lead_id, actor_id, activity_type, description) values ($1, $2, 'note', 'Called, will send proposal')`, [
        lead_id,
        profile.rows[0]!.id,
      ]),
    );
    await expect(
      t.as('authenticated', adminId, (tx) =>
        tx.query(`insert into public.lead_activities (lead_id, actor_id, activity_type, description) values ($1, $2, 'status_changed', 'forged')`, [
          lead_id,
          profile.rows[0]!.id,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
    const ownerProfile = await t.db.query<{ id: string }>('select id from public.admin_profiles where auth_user_id = $1', [ownerId]);
    await expect(
      t.as('authenticated', adminId, (tx) =>
        tx.query(`insert into public.lead_activities (lead_id, actor_id, activity_type, description) values ($1, $2, 'note', 'impersonation')`, [
          lead_id,
          ownerProfile.rows[0]!.id,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('only owners can delete leads', async () => {
    const { lead_id } = await createLeadAsServer();
    const byAdmin = await t.as('authenticated', adminId, async (tx) => (await tx.query('delete from public.leads where id = $1 returning id', [lead_id])).rows);
    expect(byAdmin).toHaveLength(0);
    const byOwner = await t.as('authenticated', ownerId, async (tx) => (await tx.query('delete from public.leads where id = $1 returning id', [lead_id])).rows);
    expect(byOwner).toHaveLength(1);
  });

  it('editors manage content but not leads or prices', async () => {
    const leads = await t.as('authenticated', editorId, async (tx) => (await tx.query('select id from public.leads')).rows);
    expect(leads).toHaveLength(0);
    const prices = await t.as('authenticated', editorId, async (tx) => (await tx.query('update public.service_pricing set price_note = $1 returning id', ['x'])).rows);
    expect(prices).toHaveLength(0);
    const posts = await t.as('authenticated', editorId, async (tx) =>
      (await tx.query(`insert into public.blog_posts (title, slug, status) values ('Editor post', 'editor-post', 'draft') returning id`)).rows,
    );
    expect(posts).toHaveLength(1);
  });

  it('writes an audit entry for price changes', async () => {
    await t.as(
      'authenticated',
      adminId,
      (tx) =>
        tx.query(
          `update public.service_pricing set minimum_amount = 3500 where service_id = (select id from public.services where slug = 'landing-page')`,
        ),
      true,
    );
    const { rows } = await t.db.query<{ changed_fields: Record<string, { old: unknown; new: unknown }>; actor_auth_id: string }>(
      `select changed_fields, actor_auth_id from public.audit_log where table_name = 'service_pricing' order by id desc limit 1`,
    );
    expect(rows[0]!.actor_auth_id).toBe(adminId);
    expect(rows[0]!.changed_fields.minimum_amount).toEqual({ old: 3000, new: 3500 });
  });

  it('dashboard stats and search are computed from real rows and respect RLS', async () => {
    const stats = await t.as('authenticated', adminId, async (tx) => (await tx.query<{ s: { total: number } }>('select public.lead_dashboard_stats() as s')).rows[0]!.s);
    const total = await t.db.query<{ n: number }>('select count(*)::int as n from public.leads');
    expect(stats.total).toBe(total.rows[0]!.n);
    const anonStats = await t.as('anon', null, (tx) => tx.query('select public.lead_dashboard_stats()')).catch((e: Error) => e);
    expect(anonStats).toBeInstanceOf(Error);
    const visitorStats = await t.as('authenticated', plainUserId, async (tx) => (await tx.query<{ s: { total: number } }>('select public.lead_dashboard_stats() as s')).rows[0]!.s);
    expect(visitorStats.total).toBe(0);
  });

  it('search treats input as data, not filter syntax', async () => {
    const { reference_number } = await createLeadAsServer({ name: 'Ravi Kumar' });
    const found = await t.as('authenticated', adminId, async (tx) =>
      (await tx.query<{ reference_number: string; total_count: number }>(`select * from public.admin_search_leads($1)`, [reference_number])).rows,
    );
    expect(found.map((r) => r.reference_number)).toEqual([reference_number]);
    const weird = await t.as('authenticated', adminId, async (tx) =>
      (await tx.query(`select * from public.admin_search_leads($1)`, [`'),or(1.eq.1`])).rows,
    );
    expect(weird).toHaveLength(0);
  });
});

describe('retention', () => {
  it('purges stale leads but keeps won leads', async () => {
    const stale = await createLeadAsServer();
    const won = await createLeadAsServer();
    await t.db.query(`update public.leads set status = 'won' where id = $1`, [won.lead_id]);
    await t.db.query(`update public.leads set last_activity_at = now() - interval '30 months' where id = any($1::uuid[])`, [[stale.lead_id, won.lead_id]]);
    // The update trigger refreshes last_activity_at, so set it directly with triggers disabled for the test.
    await t.db.query(`alter table public.leads disable trigger leads_track_changes`);
    await t.db.query(`update public.leads set last_activity_at = now() - interval '30 months' where id = any($1::uuid[])`, [[stale.lead_id, won.lead_id]]);
    await t.db.query(`alter table public.leads enable trigger leads_track_changes`);
    const deleted = await t.as('service_role', null, async (tx) => (await tx.query<{ n: number }>('select public.purge_expired_leads() as n')).rows[0]!.n, true);
    expect(deleted).toBeGreaterThanOrEqual(1);
    const remaining = await t.db.query<{ id: string }>('select id from public.leads where id = any($1::uuid[])', [[stale.lead_id, won.lead_id]]);
    expect(remaining.rows.map((r) => r.id)).toEqual([won.lead_id]);
  });
});

describe('admin helper functions', () => {
  it('syncs service ↔ industry links atomically for admins only', async () => {
    const { rows } = await t.db.query<{ id: string }>(`select id from public.services where slug = 'landing-page'`);
    const serviceId = rows[0]!.id;
    const industries = (await t.db.query<{ id: string }>(`select id from public.industries order by sort_order limit 2`)).rows.map((r) => r.id);

    await t.as('authenticated', adminId, (tx) => tx.query('select public.admin_set_service_industries($1, $2::uuid[])', [serviceId, industries]), true);
    let links = await t.db.query('select industry_id from public.service_industries where service_id = $1', [serviceId]);
    expect(links.rows).toHaveLength(2);

    await t.as('authenticated', adminId, (tx) => tx.query('select public.admin_set_service_industries($1, $2::uuid[])', [serviceId, [industries[0]]]), true);
    links = await t.db.query('select industry_id from public.service_industries where service_id = $1', [serviceId]);
    expect(links.rows).toHaveLength(1);

    // A signed-in non-admin is limited by RLS: nothing changes.
    await t
      .as('authenticated', plainUserId, (tx) => tx.query('select public.admin_set_service_industries($1, $2::uuid[])', [serviceId, industries]), true)
      .catch(() => undefined);
    links = await t.db.query('select industry_id from public.service_industries where service_id = $1', [serviceId]);
    expect(links.rows).toHaveLength(1);
    await expect(t.as('anon', null, (tx) => tx.query('select public.admin_set_service_industries($1, $2::uuid[])', [serviceId, industries]))).rejects.toThrow(
      /permission denied/,
    );
  });

  it('records notification outcomes with an atomic attempt counter (server only)', async () => {
    const { lead_id } = await createLeadAsServer();
    const record = (status: string, delta: number, error: string | null) =>
      t.as(
        'service_role',
        null,
        (tx) => tx.query(`select public.record_notification_event($1, 'owner_new_lead', 'resend', $2, $3, $4, null, null)`, [lead_id, status, delta, error]),
        true,
      );
    await record('failed', 1, 'Resend 500');
    await record('failed', 1, 'Resend 500');
    await record('sent', 1, null);
    const { rows } = await t.db.query<{ status: string; attempt_count: number; last_error: string | null }>(
      'select status, attempt_count, last_error from public.notification_events where lead_id = $1',
      [lead_id],
    );
    expect(rows).toEqual([{ status: 'sent', attempt_count: 3, last_error: null }]);
    await expect(
      t.as('authenticated', adminId, (tx) =>
        tx.query(`select public.record_notification_event($1, 'owner_new_lead', 'x', 'sent', 1, null, null, null)`, [lead_id]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('pricing detail migration (20261013000004)', () => {
  const migration = readFileSync(join(import.meta.dirname, '..', '..', 'supabase/migrations/20261013000004_pricing_detail.sql'), 'utf8');
  const priceOf = async (slug: string) =>
    (
      await t.db.query<{ price_factors: string[]; included_features: string[]; price_note: string | null }>(
        'select p.price_factors, p.included_features, p.price_note from public.service_pricing p join public.services s on s.id = p.service_id where s.slug = $1',
        [slug],
      )
    ).rows[0]!;

  const setFactors = (slug: string, value: string[]) =>
    t.db.query('update public.service_pricing p set price_factors = $2 from public.services s where s.id = p.service_id and s.slug = $1', [slug, value]);

  it('fills empty values on an existing database and keeps edited ones', async () => {
    const blog = PRICING_SEED.find((row) => row.serviceSlug === 'blog-website')!;
    const landing = PRICING_SEED.find((row) => row.serviceSlug === 'landing-page')!;
    // As on a database seeded before this change: no factors, no scope, no note.
    await t.db.query(
      `update public.service_pricing p set price_factors = '{}', included_features = '{}', price_note = null from public.services s where s.id = p.service_id and s.slug = 'blog-website'`,
    );
    // A value the owner already edited in the admin.
    await setFactors('landing-page', ['Owner wording']);

    await t.db.exec(migration);
    await t.db.exec(migration); // safe to run twice

    expect(await priceOf('blog-website')).toEqual({ price_factors: blog.factors, included_features: blog.included, price_note: blog.note });
    expect((await priceOf('landing-page')).price_factors).toEqual(['Owner wording']);
    await setFactors('landing-page', landing.factors!);
  });

  it('limits factors to 30 items of up to 200 characters', async () => {
    await expect(setFactors('blog-website', Array.from({ length: 31 }, (_, i) => `Factor ${i}`))).rejects.toThrow();
    await expect(setFactors('blog-website', ['x'.repeat(201)])).rejects.toThrow();
  });
});
