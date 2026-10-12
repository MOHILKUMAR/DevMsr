-- =====================================================================
-- DevMsr.in — core schema
-- Catalogue (industries, services, pricing, products, portfolio, blog,
-- FAQs, settings), leads, activity history, notifications, admin
-- profiles, audit log and rate limiting.
--
-- Security model (see docs/SECURITY.md):
--   * RLS is enabled on every table in `public`.
--   * Visitors (anon) can read only active/published catalogue rows.
--   * Leads are never readable or writable by anon. Lead intake runs on
--     the server with the secret key through public.create_lead().
--   * Admin access requires a row in admin_profiles, which cannot be
--     created or changed through the API.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Schemas
-- ---------------------------------------------------------------------
-- `internal` is not exposed through the Data API (PostgREST only exposes
-- the schemas listed in the project's API settings; keep it out of that list).
create schema if not exists internal;
revoke all on schema internal from public;

-- ---------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when every element is an https:// URL (used for image lists).
create or replace function public.all_https_urls(urls text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(u ~ '^https://[^\s]+$' and char_length(u) <= 500), true)
  from unnest(urls) as u;
$$;

-- True when every element is a non-empty string within a length limit.
create or replace function public.valid_text_list(items text[], max_items integer, max_length integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(items) <= max_items
     and coalesce(bool_and(char_length(trim(i)) between 1 and max_length), true)
  from unnest(items) as i;
$$;

-- ---------------------------------------------------------------------
-- Admin profiles and role helpers
-- ---------------------------------------------------------------------
create table public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role text not null default 'admin' check (role in ('owner', 'admin', 'editor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_profiles_updated_at before update on public.admin_profiles
  for each row execute function public.set_updated_at();

-- Role check used by RLS policies. SECURITY DEFINER so policies on
-- admin_profiles itself do not recurse; search_path is pinned.
create or replace function public.has_admin_role(allowed text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active
      and p.role = any (allowed)
  );
$$;

create or replace function public.current_admin_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.admin_profiles p
  where p.auth_user_id = auth.uid() and p.is_active
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------
create table public.industries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  description text not null default '' check (char_length(description) <= 1000),
  icon text not null default 'building' check (icon ~ '^[a-z0-9-]{1,40}$'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  short_description text not null default '' check (char_length(short_description) <= 400),
  description text not null default '' check (char_length(description) <= 10000),
  category text not null check (category in (
    'web-development', 'ecommerce', 'custom-software', 'management-systems', 'pos-billing', 'crm-erp',
    'ai-automation', 'ai-agents-chatbots', 'voice-ai', 'integrations-payments', 'hosting-maintenance'
  )),
  features text[] not null default '{}' check (public.valid_text_list(features, 30, 200)),
  status text not null default 'offered' check (status in ('offered', 'on_request')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  seo_title text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 320),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_category_idx on public.services (category) where is_active;

create table public.service_industries (
  service_id uuid not null references public.services (id) on delete cascade,
  industry_id uuid not null references public.industries (id) on delete cascade,
  primary key (service_id, industry_id)
);
create index service_industries_industry_idx on public.service_industries (industry_id);

create table public.service_pricing (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  label text check (char_length(label) between 1 and 160),
  display_group text not null check (display_group in (
    'websites', 'healthcare', 'hospitality', 'restaurants', 'retail', 'travel-education', 'ai-integrations-support'
  )),
  pricing_model text not null default 'range' check (pricing_model in ('fixed', 'starting_from', 'range', 'quote_only', 'usage_based')),
  -- Exact decimal amounts. Never stored or computed as floating point.
  minimum_amount numeric(12, 2) check (minimum_amount >= 0),
  maximum_amount numeric(12, 2) check (maximum_amount >= 0),
  max_open_ended boolean not null default false,
  currency char(3) not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  billing_interval text not null default 'one_time' check (billing_interval in ('one_time', 'monthly', 'yearly', 'per_use')),
  price_note text check (char_length(price_note) <= 500),
  included_features text[] not null default '{}' check (public.valid_text_list(included_features, 30, 200)),
  excluded_features text[] not null default '{}' check (public.valid_text_list(excluded_features, 30, 200)),
  estimated_delivery text check (char_length(estimated_delivery) <= 120),
  tax_inclusive boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_pricing_amounts_consistent check (
    case pricing_model
      when 'quote_only' then true
      when 'usage_based' then true
      when 'range' then minimum_amount is not null and (maximum_amount is null or maximum_amount >= minimum_amount)
      else minimum_amount is not null
    end
  )
);
create index service_pricing_service_idx on public.service_pricing (service_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  summary text not null default '' check (char_length(summary) <= 400),
  description text not null default '' check (char_length(description) <= 20000),
  status text not null default 'concept' check (status in ('available', 'demo', 'in_development', 'concept')),
  industry_id uuid references public.industries (id) on delete set null,
  service_category text check (service_category in (
    'web-development', 'ecommerce', 'custom-software', 'management-systems', 'pos-billing', 'crm-erp',
    'ai-automation', 'ai-agents-chatbots', 'voice-ai', 'integrations-payments', 'hosting-maintenance'
  )),
  demo_url text check (demo_url ~ '^https://[^\s]+$' and char_length(demo_url) <= 500),
  repository_url text check (repository_url ~ '^https://[^\s]+$' and char_length(repository_url) <= 500),
  features text[] not null default '{}' check (public.valid_text_list(features, 30, 200)),
  image_urls text[] not null default '{}' check (cardinality(image_urls) <= 12 and public.all_https_urls(image_urls)),
  technology_stack text[] not null default '{}' check (public.valid_text_list(technology_stack, 20, 60)),
  seo_title text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 320),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_industry_idx on public.products (industry_id);

create table public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  summary text not null default '' check (char_length(summary) <= 400),
  description text not null default '' check (char_length(description) <= 20000),
  project_type text not null default 'client' check (project_type in ('client', 'internal', 'prototype')),
  technology_stack text[] not null default '{}' check (public.valid_text_list(technology_stack, 20, 60)),
  image_urls text[] not null default '{}' check (cardinality(image_urls) <= 12 and public.all_https_urls(image_urls)),
  demo_url text check (demo_url ~ '^https://[^\s]+$' and char_length(demo_url) <= 500),
  repository_url text check (repository_url ~ '^https://[^\s]+$' and char_length(repository_url) <= 500),
  seo_title text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 320),
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portfolio_industries (
  portfolio_id uuid not null references public.portfolio_projects (id) on delete cascade,
  industry_id uuid not null references public.industries (id) on delete cascade,
  primary key (portfolio_id, industry_id)
);
create index portfolio_industries_industry_idx on public.portfolio_industries (industry_id);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  excerpt text not null default '' check (char_length(excerpt) <= 400),
  content text not null default '' check (char_length(content) <= 100000),
  cover_image text check (cover_image ~ '^https://[^\s]+$' and char_length(cover_image) <= 500),
  status text not null default 'draft' check (status in ('draft', 'published')),
  seo_title text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 320),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_published_has_date check (status = 'draft' or published_at is not null)
);
create index blog_posts_published_idx on public.blog_posts (published_at desc) where status = 'published';

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('general', 'industry', 'service_category', 'pricing')),
  industry_id uuid references public.industries (id) on delete cascade,
  service_category text check (service_category in (
    'web-development', 'ecommerce', 'custom-software', 'management-systems', 'pos-billing', 'crm-erp',
    'ai-automation', 'ai-agents-chatbots', 'voice-ai', 'integrations-payments', 'hosting-maintenance'
  )),
  question text not null check (char_length(question) between 5 and 300),
  answer text not null check (char_length(answer) between 5 and 3000),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faqs_scope_target check (
    (scope = 'industry' and industry_id is not null and service_category is null)
    or (scope = 'service_category' and service_category is not null and industry_id is null)
    or (scope in ('general', 'pricing') and industry_id is null and service_category is null)
  )
);
create index faqs_industry_idx on public.faqs (industry_id);

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in (
    'contact_email', 'contact_phone', 'whatsapp_number', 'business_hours', 'service_area', 'announcement', 'lead_retention_months'
  )),
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

-- updated_at triggers
create trigger industries_updated_at before update on public.industries for each row execute function public.set_updated_at();
create trigger services_updated_at before update on public.services for each row execute function public.set_updated_at();
create trigger service_pricing_updated_at before update on public.service_pricing for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger portfolio_projects_updated_at before update on public.portfolio_projects for each row execute function public.set_updated_at();
create trigger blog_posts_updated_at before update on public.blog_posts for each row execute function public.set_updated_at();
create trigger faqs_updated_at before update on public.faqs for each row execute function public.set_updated_at();
create trigger site_settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();

-- Publishing sets published_at once, so the date reflects first publication.
create or replace function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'blog_posts' then
    if new.status = 'published' and new.published_at is null then
      new.published_at := now();
    end if;
  elsif new.is_published and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
create trigger blog_posts_published_at before insert or update on public.blog_posts for each row execute function public.set_published_at();
create trigger products_published_at before insert or update on public.products for each row execute function public.set_published_at();
create trigger portfolio_projects_published_at before insert or update on public.portfolio_projects for each row execute function public.set_published_at();

-- ---------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------
create or replace function public.generate_lead_reference()
returns text
language sql
volatile
set search_path = ''
as $$
  -- e.g. DM-261012-4F2A9C : date in IST + 6 random hex characters.
  -- Random rather than sequential so references do not reveal lead volume.
  select 'DM-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-'
         || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
$$;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique default public.generate_lead_reference(),
  -- Client-generated idempotency key: resubmitting the same form returns the same lead.
  submission_id uuid not null unique,
  form_type text not null check (form_type in ('contact', 'quote', 'demo')),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  business_name text check (char_length(business_name) <= 160),
  phone text check (phone ~ '^\+?[0-9]{7,15}$'),
  industry_id uuid references public.industries (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  service_category text check (service_category in (
    'web-development', 'ecommerce', 'custom-software', 'management-systems', 'pos-billing', 'crm-erp',
    'ai-automation', 'ai-agents-chatbots', 'voice-ai', 'integrations-payments', 'hosting-maintenance'
  )),
  project_description text not null check (char_length(project_description) between 20 and 5000),
  budget_range text check (budget_range in ('under_10k', '10k_25k', '25k_50k', '50k_1l', 'above_1l', 'not_sure')),
  timeline text check (timeline in ('asap', 'within_1_month', '1_3_months', '3_6_months', 'flexible')),
  preferred_contact text check (preferred_contact in ('email', 'phone', 'whatsapp')),
  website_url text check (website_url ~ '^https?://[^\s]+$' and char_length(website_url) <= 300),
  consultation_time text check (char_length(consultation_time) <= 120),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost')),
  source text not null default 'website' check (char_length(source) <= 60),
  source_path text check (char_length(source_path) <= 200),
  referrer text check (char_length(referrer) <= 500),
  utm_source text check (char_length(utm_source) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 150),
  -- md5(lower(email) || description) for soft duplicate detection; not a security hash.
  content_fingerprint text not null,
  privacy_acknowledged_at timestamptz not null,
  follow_up_at timestamptz,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_status_idx on public.leads (status);
create index leads_created_at_idx on public.leads (created_at desc);
create index leads_follow_up_idx on public.leads (follow_up_at) where follow_up_at is not null;
create index leads_email_idx on public.leads (lower(email));
create index leads_industry_idx on public.leads (industry_id);
create index leads_service_idx on public.leads (service_id);
create index leads_fingerprint_idx on public.leads (content_fingerprint, created_at desc);
create index leads_last_activity_idx on public.leads (last_activity_at);

create trigger leads_updated_at before update on public.leads for each row execute function public.set_updated_at();

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  actor_id uuid references public.admin_profiles (id) on delete set null,
  activity_type text not null check (activity_type in (
    'created', 'status_changed', 'note', 'follow_up_set', 'follow_up_cleared', 'contact_updated',
    'notification_sent', 'notification_failed', 'notification_skipped'
  )),
  description text not null check (char_length(description) between 1 and 5000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 4096),
  created_at timestamptz not null default now()
);
create index lead_activities_lead_idx on public.lead_activities (lead_id, created_at desc);
create index lead_activities_actor_idx on public.lead_activities (actor_id);

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  event_type text not null check (event_type in ('owner_new_lead', 'lead_acknowledgement')),
  provider text not null check (char_length(provider) <= 40),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text check (char_length(last_error) <= 1000),
  provider_message_id text check (char_length(provider_message_id) <= 200),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, event_type)
);
create index notification_events_retry_idx on public.notification_events (status, updated_at) where status in ('pending', 'failed');

create trigger notification_events_updated_at before update on public.notification_events for each row execute function public.set_updated_at();

-- Every lead gets a 'created' activity, in the same transaction as the insert.
create or replace function public.lead_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lead_activities (lead_id, actor_id, activity_type, description, metadata)
  values (new.id, null, 'created', 'Enquiry received via ' || new.form_type || ' form',
          jsonb_build_object('form_type', new.form_type, 'source_path', new.source_path));
  return null;
end;
$$;
create trigger leads_after_insert after insert on public.leads for each row execute function public.lead_after_insert();

-- Meaningful changes are recorded automatically, with the acting admin,
-- so the history cannot be skipped by a code path that forgets to log.
create or replace function public.lead_track_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.current_admin_id();
  labels constant jsonb := '{"new":"New","contacted":"Contacted","qualified":"Qualified","proposal_sent":"Proposal Sent","won":"Won","lost":"Lost"}';
begin
  if new.status is distinct from old.status then
    insert into public.lead_activities (lead_id, actor_id, activity_type, description, metadata)
    values (new.id, actor, 'status_changed',
            'Status changed from ' || (labels ->> old.status) || ' to ' || (labels ->> new.status),
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;

  if new.follow_up_at is distinct from old.follow_up_at then
    if new.follow_up_at is null then
      insert into public.lead_activities (lead_id, actor_id, activity_type, description, metadata)
      values (new.id, actor, 'follow_up_cleared', 'Follow-up date cleared', jsonb_build_object('previous', old.follow_up_at));
    else
      insert into public.lead_activities (lead_id, actor_id, activity_type, description, metadata)
      values (new.id, actor, 'follow_up_set',
              'Follow-up set for ' || to_char(new.follow_up_at at time zone 'Asia/Kolkata', 'DD Mon YYYY'),
              jsonb_build_object('previous', old.follow_up_at, 'next', new.follow_up_at));
    end if;
  end if;

  if (new.name, new.email, new.phone, new.business_name, new.website_url)
     is distinct from (old.name, old.email, old.phone, old.business_name, old.website_url) then
    insert into public.lead_activities (lead_id, actor_id, activity_type, description, metadata)
    values (new.id, actor, 'contact_updated', 'Contact details updated', '{}'::jsonb);
  end if;

  new.last_activity_at := now();
  return new;
end;
$$;
create trigger leads_track_changes before update on public.leads for each row
  when (old.* is distinct from new.*)
  execute function public.lead_track_changes();

-- Notes and other activities keep the lead's last_activity_at fresh (used for retention).
create or replace function public.lead_activity_touch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.activity_type in ('note', 'created') then
    update public.leads set last_activity_at = now() where id = new.lead_id and last_activity_at < now() - interval '1 second';
  end if;
  return null;
end;
$$;
create trigger lead_activities_touch after insert on public.lead_activities for each row execute function public.lead_activity_touch();

-- ---------------------------------------------------------------------
-- Rate limiting (fixed window counters, internal schema)
-- ---------------------------------------------------------------------
create table internal.rate_limits (
  key text not null check (char_length(key) <= 200),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
create index rate_limits_window_idx on internal.rate_limits (window_start);

create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  bucket timestamptz;
  current_hits integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or char_length(p_key) > 200 then
    raise exception 'invalid rate limit arguments';
  end if;
  bucket := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into internal.rate_limits as r (key, window_start, hits)
  values (p_key, bucket, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into current_hits;

  -- Opportunistic cleanup of old windows (cheap, indexed).
  if random() < 0.02 then
    delete from internal.rate_limits where window_start < now() - interval '2 days';
  end if;

  return current_hits <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------
-- Lead intake (called by the server with the secret key only)
-- ---------------------------------------------------------------------
create or replace function public.create_lead(p jsonb)
returns table (lead_id uuid, reference_number text, is_duplicate boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission uuid := (p ->> 'submission_id')::uuid;
  v_email text := lower(trim(p ->> 'email'));
  v_description text := p ->> 'project_description';
  v_fingerprint text := md5(lower(trim(p ->> 'email')) || '|' || coalesce(p ->> 'project_description', ''));
  v_existing record;
  v_industry uuid;
  v_service uuid;
begin
  -- 1. Idempotency: the same submission id always maps to the same lead.
  select l.id, l.reference_number into v_existing from public.leads l where l.submission_id = v_submission;
  if found then
    return query select v_existing.id, v_existing.reference_number, true;
    return;
  end if;

  -- 2. Soft duplicate: identical email + description within 30 minutes.
  select l.id, l.reference_number into v_existing
  from public.leads l
  where l.content_fingerprint = v_fingerprint and l.created_at > now() - interval '30 minutes'
  order by l.created_at desc
  limit 1;
  if found then
    return query select v_existing.id, v_existing.reference_number, true;
    return;
  end if;

  -- 3. Resolve references by slug; unknown or inactive slugs become null.
  select i.id into v_industry from public.industries i where i.slug = p ->> 'industry_slug' and i.is_active;
  select s.id into v_service from public.services s where s.slug = p ->> 'service_slug' and s.is_active;

  return query
  insert into public.leads as l (
    submission_id, form_type, name, email, business_name, phone, industry_id, service_id, service_category,
    project_description, budget_range, timeline, preferred_contact, website_url, consultation_time,
    source, source_path, referrer, utm_source, utm_medium, utm_campaign, content_fingerprint, privacy_acknowledged_at
  ) values (
    v_submission,
    p ->> 'form_type',
    p ->> 'name',
    v_email,
    nullif(p ->> 'business_name', ''),
    nullif(p ->> 'phone', ''),
    v_industry,
    v_service,
    coalesce(nullif(p ->> 'service_category', ''), (select s.category from public.services s where s.id = v_service)),
    v_description,
    nullif(p ->> 'budget_range', ''),
    nullif(p ->> 'timeline', ''),
    nullif(p ->> 'preferred_contact', ''),
    nullif(p ->> 'website_url', ''),
    nullif(p ->> 'consultation_time', ''),
    coalesce(nullif(p ->> 'source', ''), 'website'),
    nullif(p ->> 'source_path', ''),
    nullif(p ->> 'referrer', ''),
    nullif(p ->> 'utm_source', ''),
    nullif(p ->> 'utm_medium', ''),
    nullif(p ->> 'utm_campaign', ''),
    v_fingerprint,
    now()
  )
  on conflict (submission_id) do nothing
  returning l.id, l.reference_number, false;

  -- Lost a race with an identical concurrent submission: return the winner.
  if not found then
    return query select l.id, l.reference_number, true from public.leads l where l.submission_id = v_submission;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Public catalogue in one round trip (SECURITY INVOKER: RLS applies)
-- ---------------------------------------------------------------------
create or replace function public.get_public_catalogue()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'industries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'slug', i.slug, 'name', i.name, 'description', i.description, 'icon', i.icon, 'sort_order', i.sort_order
      ) order by i.sort_order, i.name)
      from public.industries i where i.is_active
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'slug', s.slug, 'name', s.name, 'short_description', s.short_description, 'description', s.description,
        'category', s.category, 'features', to_jsonb(s.features), 'status', s.status, 'sort_order', s.sort_order,
        'seo_title', s.seo_title, 'seo_description', s.seo_description,
        'industry_slugs', coalesce((
          select jsonb_agg(i.slug order by i.sort_order)
          from public.service_industries si join public.industries i on i.id = si.industry_id and i.is_active
          where si.service_id = s.id
        ), '[]'::jsonb)
      ) order by s.sort_order, s.name)
      from public.services s where s.is_active
    ), '[]'::jsonb),
    'pricing', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'service_slug', s.slug, 'label', p.label, 'display_group', p.display_group,
        'pricing_model', p.pricing_model,
        -- numeric → text keeps amounts exact in JSON.
        'minimum_amount', p.minimum_amount::text, 'maximum_amount', p.maximum_amount::text,
        'max_open_ended', p.max_open_ended, 'currency', p.currency, 'billing_interval', p.billing_interval,
        'price_note', p.price_note, 'included_features', to_jsonb(p.included_features), 'excluded_features', to_jsonb(p.excluded_features),
        'estimated_delivery', p.estimated_delivery, 'tax_inclusive', p.tax_inclusive, 'sort_order', p.sort_order
      ) order by p.sort_order)
      from public.service_pricing p join public.services s on s.id = p.service_id and s.is_active
      where p.is_active
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pr.id, 'slug', pr.slug, 'name', pr.name, 'summary', pr.summary, 'description', pr.description, 'status', pr.status,
        'industry_slug', i.slug, 'service_category', pr.service_category, 'features', to_jsonb(pr.features),
        'image_urls', to_jsonb(pr.image_urls), 'technology_stack', to_jsonb(pr.technology_stack),
        'demo_url', pr.demo_url, 'repository_url', pr.repository_url, 'seo_title', pr.seo_title, 'seo_description', pr.seo_description,
        'sort_order', pr.sort_order
      ) order by pr.sort_order, pr.name)
      from public.products pr left join public.industries i on i.id = pr.industry_id
      where pr.is_published
    ), '[]'::jsonb),
    'faqs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'scope', f.scope, 'scope_key', coalesce(i.slug, f.service_category), 'question', f.question, 'answer', f.answer,
        'sort_order', f.sort_order
      ) order by f.sort_order)
      from public.faqs f left join public.industries i on i.id = f.industry_id
      where f.is_active
    ), '[]'::jsonb),
    'settings', (
      select jsonb_object_agg(st.key, st.value) from public.site_settings st
    )
  );
$$;

-- Public portfolio with industry slugs (security invoker view: RLS applies).
create view public.public_portfolio
with (security_invoker = true)
as
select
  p.id, p.slug, p.title, p.summary, p.description, p.project_type, p.technology_stack, p.image_urls, p.demo_url,
  p.repository_url, p.seo_title, p.seo_description, p.published_at,
  coalesce(array(
    select i.slug from public.portfolio_industries pi join public.industries i on i.id = pi.industry_id
    where pi.portfolio_id = p.id order by i.sort_order
  ), '{}') as industry_slugs
from public.portfolio_projects p
where p.is_published;

-- ---------------------------------------------------------------------
-- Admin dashboard helpers (SECURITY INVOKER: RLS applies)
-- ---------------------------------------------------------------------
create or replace function public.lead_dashboard_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'total', (select count(*) from public.leads),
    'by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) as n from public.leads group by status) s), '{}'::jsonb),
    'follow_ups_due', (select count(*) from public.leads where follow_up_at is not null and follow_up_at <= now() + interval '1 day' and status not in ('won', 'lost')),
    'new_last_7_days', (select count(*) from public.leads where created_at > now() - interval '7 days'),
    'failed_notifications', (select count(*) from public.notification_events where status in ('failed', 'pending') and updated_at < now() - interval '2 minutes')
  );
$$;

-- Parameterised search: user input never becomes part of a filter string.
create or replace function public.admin_search_leads(
  p_query text default null,
  p_status text default null,
  p_industry uuid default null,
  p_follow_up text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid, reference_number text, name text, email text, business_name text, phone text, status text,
  form_type text, industry_name text, service_label text, budget_range text, follow_up_at timestamptz,
  created_at timestamptz, total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with filtered as (
    select l.*
    from public.leads l
    where (p_status is null or l.status = p_status)
      and (p_industry is null or l.industry_id = p_industry)
      and (
        p_follow_up is null
        or (p_follow_up = 'due' and l.follow_up_at <= now() + interval '1 day' and l.status not in ('won', 'lost'))
        or (p_follow_up = 'scheduled' and l.follow_up_at is not null)
        or (p_follow_up = 'none' and l.follow_up_at is null)
      )
      and (
        p_query is null or p_query = ''
        or l.reference_number ilike '%' || p_query || '%'
        or l.name ilike '%' || p_query || '%'
        or l.email ilike '%' || p_query || '%'
        or coalesce(l.business_name, '') ilike '%' || p_query || '%'
        or coalesce(l.phone, '') like '%' || regexp_replace(p_query, '\D', '', 'g') || '%' and regexp_replace(p_query, '\D', '', 'g') <> ''
      )
  )
  select
    f.id, f.reference_number, f.name, f.email, f.business_name, f.phone, f.status, f.form_type,
    i.name as industry_name,
    coalesce(s.name, f.service_category) as service_label,
    f.budget_range, f.follow_up_at, f.created_at,
    count(*) over () as total_count
  from filtered f
  left join public.industries i on i.id = f.industry_id
  left join public.services s on s.id = f.service_id
  order by f.created_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

-- ---------------------------------------------------------------------
-- Audit log for administrative changes
-- ---------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  actor_auth_id uuid,
  actor_profile_id uuid,
  changed_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_record_idx on public.audit_log (table_name, record_id);

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changes jsonb := '{}'::jsonb;
  old_row jsonb;
  new_row jsonb;
  k text;
begin
  if tg_op = 'UPDATE' then
    old_row := to_jsonb(old);
    new_row := to_jsonb(new);
    for k in select jsonb_object_keys(new_row) loop
      if k not in ('updated_at', 'last_activity_at') and (old_row -> k) is distinct from (new_row -> k) then
        -- Long text values are summarised, not copied, to keep the log small.
        changes := changes || jsonb_build_object(k, jsonb_build_object(
          'old', case when pg_column_size(old_row -> k) > 300 then to_jsonb('[changed]'::text) else old_row -> k end,
          'new', case when pg_column_size(new_row -> k) > 300 then to_jsonb('[changed]'::text) else new_row -> k end
        ));
      end if;
    end loop;
    if changes = '{}'::jsonb then
      return new;
    end if;
  end if;

  insert into public.audit_log (table_name, record_id, action, actor_auth_id, actor_profile_id, changed_fields)
  values (
    tg_table_name,
    case when tg_op = 'DELETE' then (to_jsonb(old) ->> 'id')::uuid else (to_jsonb(new) ->> 'id')::uuid end,
    lower(tg_op),
    auth.uid(),
    public.current_admin_id(),
    changes
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_industries after insert or update or delete on public.industries for each row execute function public.audit_row_change();
create trigger audit_services after insert or update or delete on public.services for each row execute function public.audit_row_change();
create trigger audit_service_pricing after insert or update or delete on public.service_pricing for each row execute function public.audit_row_change();
create trigger audit_products after insert or update or delete on public.products for each row execute function public.audit_row_change();
create trigger audit_portfolio_projects after insert or update or delete on public.portfolio_projects for each row execute function public.audit_row_change();
create trigger audit_blog_posts after insert or update or delete on public.blog_posts for each row execute function public.audit_row_change();
create trigger audit_faqs after insert or update or delete on public.faqs for each row execute function public.audit_row_change();
create trigger audit_site_settings after insert or update or delete on public.site_settings for each row execute function public.audit_row_change();
create trigger audit_admin_profiles after insert or update or delete on public.admin_profiles for each row execute function public.audit_row_change();
create trigger audit_leads_delete after delete on public.leads for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------
-- Data retention
-- ---------------------------------------------------------------------
-- Deletes enquiries with no activity for longer than the configured
-- retention period (site_settings.lead_retention_months, default 24).
-- Won leads are kept: they are client records. Returns rows deleted.
create or replace function public.purge_expired_leads()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  months integer := coalesce((select (value #>> '{}')::integer from public.site_settings where key = 'lead_retention_months'), 24);
  deleted integer;
begin
  if months < 1 then
    raise exception 'lead_retention_months must be at least 1';
  end if;
  delete from public.leads
  where status <> 'won' and last_activity_at < now() - make_interval(months => months);
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

-- ---------------------------------------------------------------------
-- Notification outcome recording (server-only), with atomic attempt count
-- ---------------------------------------------------------------------
create or replace function public.record_notification_event(
  p_lead_id uuid,
  p_event_type text,
  p_provider text,
  p_status text,
  p_attempt_delta integer,
  p_last_error text,
  p_provider_message_id text,
  p_sent_at timestamptz
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notification_events as n
    (lead_id, event_type, provider, status, attempt_count, last_error, provider_message_id, sent_at)
  values
    (p_lead_id, p_event_type, p_provider, p_status, greatest(p_attempt_delta, 0), left(p_last_error, 1000), p_provider_message_id, p_sent_at)
  on conflict (lead_id, event_type) do update set
    provider = excluded.provider,
    status = excluded.status,
    attempt_count = n.attempt_count + greatest(p_attempt_delta, 0),
    last_error = excluded.last_error,
    provider_message_id = coalesce(excluded.provider_message_id, n.provider_message_id),
    sent_at = coalesce(excluded.sent_at, n.sent_at);
$$;
