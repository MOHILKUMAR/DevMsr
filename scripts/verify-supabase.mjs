#!/usr/bin/env node
/**
 * Read-only checks against a live Supabase project.
 *
 *   node scripts/verify-supabase.mjs            # reads .dev.vars
 *
 * Verifies that migrations and seed are applied and that visitors (the
 * publishable key) cannot reach private data or server-only functions.
 * Prints results only — never keys, lead content or personal data.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function readVars(path) {
  const vars = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) vars[match[1]] = match[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return vars;
}

const env = { ...readVars('.dev.vars'), ...process.env };
const url = env.SUPABASE_URL;
const publishable = env.SUPABASE_PUBLISHABLE_KEY;
const secret = env.SUPABASE_SECRET_KEY;
if (!url || !publishable || !secret) {
  console.error('SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY are required.');
  process.exit(1);
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const visitor = createClient(url, publishable, options);
const server = createClient(url, secret, options);

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });
// Only a real permission error counts as "denied". PGRST202/PGRST205 mean the
// function or table does not exist, which says nothing about access control.
const denied = (error) => Boolean(error) && /42501|permission denied/i.test(`${error.code} ${error.message}`);

// 0. Is the schema there at all?
const probe = await server.from('services').select('id', { count: 'exact', head: true });
const missing = (error) => Boolean(error) && /PGRST20[25]|does not exist|schema cache/i.test(`${error.code} ${error.message}`);
if (missing(probe.error) || probe.count === null) {
  console.error('FAIL  The schema is not installed in this project (table public.services not found).');
  console.error('      Run supabase/migrations/*.sql in filename order, then supabase/seed.sql (docs/SETUP.md, step 3).');
  process.exit(2);
}

// 1. Schema and seed (as a visitor, through RLS)
const { data: catalogue, error: catalogueError } = await visitor.rpc('get_public_catalogue');
if (catalogueError) {
  check('get_public_catalogue() callable by visitors', false, `${catalogueError.code}: ${catalogueError.message}`);
} else {
  const count = (key) => (Array.isArray(catalogue?.[key]) ? catalogue[key].length : 0);
  check('get_public_catalogue() callable by visitors', true);
  check('Seed: 6 industries', count('industries') === 6, `${count('industries')} found`);
  check('Seed: 125 services', count('services') === 125, `${count('services')} found`);
  check('Seed: 43 prices', count('pricing') === 43, `${count('pricing')} found`);
  check('Seed: 7 products', count('products') === 7, `${count('products')} found`);
  check('Seed: FAQs present', count('faqs') >= 20, `${count('faqs')} found`);
  const price = catalogue?.pricing?.[0];
  check('Amounts returned as exact decimal strings', typeof price?.minimum_amount === 'string', `got ${typeof price?.minimum_amount}`);
  check('Site settings present', catalogue?.settings && typeof catalogue.settings === 'object');
}
const portfolio = await visitor.from('public_portfolio').select('slug');
check('Published portfolio readable', !portfolio.error && (portfolio.data?.length ?? 0) >= 1, portfolio.error?.message ?? `${portfolio.data?.length} found`);
const posts = await visitor.from('blog_posts').select('slug').eq('status', 'published');
check('Published blog posts readable', !posts.error, posts.error?.message ?? `${posts.data?.length} found`);

// 2. Visitors are locked out of private data
for (const table of ['leads', 'lead_activities', 'notification_events', 'admin_profiles', 'audit_log']) {
  const { data, error } = await visitor.from(table).select('id').limit(1);
  check(`Visitor cannot read ${table}`, denied(error) || (Array.isArray(data) && data.length === 0), error ? error.code : `${data?.length ?? 0} rows`);
}
const insert = await visitor.from('leads').insert({ name: 'x' });
check('Visitor cannot insert leads directly', denied(insert.error), insert.error?.code ?? 'insert succeeded!');
const updatePrice = await visitor.from('service_pricing').update({ price_note: 'x' }).neq('id', '00000000-0000-0000-0000-000000000000').select('id');
check('Visitor cannot change prices', denied(updatePrice.error) || (updatePrice.data?.length ?? 0) === 0, updatePrice.error?.code ?? `${updatePrice.data?.length} rows`);
for (const fn of ['create_lead', 'check_rate_limit', 'purge_expired_leads', 'record_notification_event']) {
  const ARGS = {
    create_lead: { p: {} },
    check_rate_limit: { p_key: 'x', p_limit: 1, p_window_seconds: 60 },
    purge_expired_leads: {},
    record_notification_event: {
      p_lead_id: '00000000-0000-0000-0000-000000000000', p_event_type: 'owner_new_lead', p_provider: 'x', p_status: 'sent',
      p_attempt_delta: 0, p_last_error: null, p_provider_message_id: null, p_sent_at: null,
    },
  };
  const args = ARGS[fn];
  const { error } = await visitor.rpc(fn, args);
  check(`Visitor cannot call ${fn}()`, denied(error), error ? error.code : 'call succeeded!');
}
const internal = await visitor.schema('internal').from('rate_limits').select('key').limit(1);
check('internal schema not exposed through the API', Boolean(internal.error), internal.error?.code ?? 'readable!');

// 3. Server-side state (secret key; counts only)
const owners = await server.from('admin_profiles').select('id', { count: 'exact', head: true }).eq('role', 'owner').eq('is_active', true);
check('An active owner admin profile exists', !owners.error && (owners.count ?? 0) >= 1, owners.error?.message ?? `${owners.count} owner(s)`);
const leads = await server.from('leads').select('id', { count: 'exact', head: true });
check('Secret key can reach leads (server only)', !leads.error && leads.count !== null, leads.error?.message ?? `${leads.count} lead(s) stored`);

// Report
let failed = 0;
for (const result of results) {
  if (!result.ok) failed += 1;
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? `  (${result.detail})` : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
