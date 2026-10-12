import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const root = join(import.meta.dirname, '..', '..');

export type Role = 'anon' | 'authenticated' | 'service_role';

export interface TestDb {
  db: PGlite;
  /** Runs `fn` inside a transaction as the given role (and optional auth user), then rolls back unless `commit`. */
  as<T>(role: Role, userId: string | null, fn: (tx: Pick<PGlite, 'query' | 'exec'>) => Promise<T>, commit?: boolean): Promise<T>;
}

export async function createTestDb({ seed = true } = {}): Promise<TestDb> {
  const db = await PGlite.create();
  await db.exec(readFileSync(join(root, 'tests/db/supabase-stubs.sql'), 'utf8'));
  const migrationsDir = join(root, 'supabase/migrations');
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
  }
  if (seed) await db.exec(readFileSync(join(root, 'supabase/seed.sql'), 'utf8'));

  async function as<T>(role: Role, userId: string | null, fn: (tx: Pick<PGlite, 'query' | 'exec'>) => Promise<T>, commit = false): Promise<T> {
    await db.exec('begin');
    try {
      await db.exec(`set local role ${role}`);
      await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
      await db.query(`select set_config('request.jwt.claim.role', $1, true)`, [role]);
      const result = await fn(db);
      await db.exec(commit ? 'commit' : 'rollback');
      return result;
    } catch (error) {
      await db.exec('rollback');
      throw error;
    }
  }

  return { db, as };
}

/** Creates an auth user and (optionally) an admin profile; returns the auth user id. */
export async function createUser(db: PGlite, opts: { role?: 'owner' | 'admin' | 'editor'; active?: boolean } = {}): Promise<string> {
  const { rows } = await db.query<{ id: string }>(`insert into auth.users (email) values ('user-' || gen_random_uuid() || '@example.com') returning id`);
  const id = rows[0]!.id;
  if (opts.role) {
    await db.query(`insert into public.admin_profiles (auth_user_id, display_name, role, is_active) values ($1, 'Test', $2, $3)`, [
      id,
      opts.role,
      opts.active ?? true,
    ]);
  }
  return id;
}

export function leadPayload(overrides: Record<string, unknown> = {}) {
  return {
    submission_id: crypto.randomUUID(),
    form_type: 'quote',
    name: 'Asha Verma',
    email: `asha.${crypto.randomUUID().slice(0, 8)}@example.com`,
    industry_slug: 'healthcare',
    service_slug: 'opd-token-management',
    service_category: null,
    project_description: 'We need an OPD token system for three doctors with a TV display.',
    phone: '+919876543210',
    budget_range: '25k_50k',
    timeline: '1_3_months',
    preferred_contact: 'whatsapp',
    source_path: '/request-quote',
    ...overrides,
  };
}
