-- =====================================================================
-- Row Level Security and grants
--
-- Roles (Supabase):
--   anon           — visitors (publishable key, no session)
--   authenticated  — signed-in users; admin rights additionally require an
--                    active row in admin_profiles (has_admin_role)
--   service_role   — server-only secret key; bypasses RLS. Used solely for
--                    lead intake, rate limiting and notification logging.
--
-- Deny by default: RLS is enabled everywhere; anything not granted by a
-- policy below is refused.
-- =====================================================================

alter table public.admin_profiles enable row level security;
alter table public.industries enable row level security;
alter table public.services enable row level security;
alter table public.service_industries enable row level security;
alter table public.service_pricing enable row level security;
alter table public.products enable row level security;
alter table public.portfolio_projects enable row level security;
alter table public.portfolio_industries enable row level security;
alter table public.blog_posts enable row level security;
alter table public.faqs enable row level security;
alter table public.site_settings enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.notification_events enable row level security;
alter table public.audit_log enable row level security;

-- ---------------------------------------------------------------------
-- Table privileges. RLS still applies on top of these.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Catalogue: anyone may read (RLS limits rows); admins may write.
grant select on public.industries, public.services, public.service_industries, public.service_pricing,
  public.products, public.portfolio_projects, public.portfolio_industries, public.blog_posts, public.faqs,
  public.site_settings, public.public_portfolio
  to anon, authenticated;
grant insert, update, delete on public.industries, public.services, public.service_industries, public.service_pricing,
  public.products, public.portfolio_projects, public.portfolio_industries, public.blog_posts, public.faqs,
  public.site_settings
  to authenticated;

-- Private data: signed-in users only (RLS limits to admins). Never anon.
grant select, update, delete on public.leads to authenticated;
grant select, insert on public.lead_activities to authenticated;
grant select, update on public.notification_events to authenticated;
grant select on public.admin_profiles to authenticated;
grant select on public.audit_log to authenticated;

-- Functions
grant execute on function public.get_public_catalogue() to anon, authenticated;
grant execute on function public.has_admin_role(text[]) to authenticated;
grant execute on function public.current_admin_id() to authenticated;
grant execute on function public.lead_dashboard_stats() to authenticated;
grant execute on function public.admin_search_leads(text, text, uuid, text, integer, integer) to authenticated;
grant execute on function public.all_https_urls(text[]) to anon, authenticated;
grant execute on function public.valid_text_list(text[], integer, integer) to anon, authenticated;
-- Server-only (secret key) functions:
revoke all on function public.create_lead(jsonb) from public, anon, authenticated;
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.purge_expired_leads() from public, anon, authenticated;
revoke all on function public.record_notification_event(uuid, text, text, text, integer, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.create_lead(jsonb) to service_role;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
grant execute on function public.purge_expired_leads() to service_role;
grant execute on function public.record_notification_event(uuid, text, text, text, integer, text, text, timestamptz) to service_role;

-- ---------------------------------------------------------------------
-- Policies: admin profiles
-- ---------------------------------------------------------------------
-- A signed-in user can see only their own profile; owners see all.
-- No insert/update/delete policies: profiles are managed with SQL only,
-- so no API call can grant or escalate admin rights.
create policy admin_profiles_select_own on public.admin_profiles
  for select to authenticated
  using (auth_user_id = (select auth.uid()) or (select public.has_admin_role(array['owner'])));

-- ---------------------------------------------------------------------
-- Policies: public catalogue
-- ---------------------------------------------------------------------
create policy industries_public_read on public.industries
  for select to anon, authenticated using (is_active);
create policy industries_admin_all on public.industries
  for all to authenticated
  using ((select public.has_admin_role(array['owner', 'admin'])))
  with check ((select public.has_admin_role(array['owner', 'admin'])));

create policy services_public_read on public.services
  for select to anon, authenticated using (is_active);
create policy services_admin_all on public.services
  for all to authenticated
  using ((select public.has_admin_role(array['owner', 'admin'])))
  with check ((select public.has_admin_role(array['owner', 'admin'])));

create policy service_industries_public_read on public.service_industries
  for select to anon, authenticated using (true);
create policy service_industries_admin_all on public.service_industries
  for all to authenticated
  using ((select public.has_admin_role(array['owner', 'admin'])))
  with check ((select public.has_admin_role(array['owner', 'admin'])));

create policy service_pricing_public_read on public.service_pricing
  for select to anon, authenticated using (is_active);
create policy service_pricing_admin_all on public.service_pricing
  for all to authenticated
  using ((select public.has_admin_role(array['owner', 'admin'])))
  with check ((select public.has_admin_role(array['owner', 'admin'])));

create policy faqs_public_read on public.faqs
  for select to anon, authenticated using (is_active);
create policy faqs_admin_all on public.faqs
  for all to authenticated
  using ((select public.has_admin_role(array['owner', 'admin'])))
  with check ((select public.has_admin_role(array['owner', 'admin'])));

create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated using (true);
create policy site_settings_admin_all on public.site_settings
  for all to authenticated
  using ((select public.has_admin_role(array['owner', 'admin'])))
  with check ((select public.has_admin_role(array['owner', 'admin'])));

-- Content (editors may manage products, portfolio and blog).
create policy products_public_read on public.products
  for select to anon, authenticated using (is_published);
create policy products_admin_all on public.products
  for all to authenticated
  using ((select public.has_admin_role(array['owner', 'admin', 'editor'])))
  with check ((select public.has_admin_role(array['owner', 'admin', 'editor'])));

create policy portfolio_public_read on public.portfolio_projects
  for select to anon, authenticated using (is_published);
create policy portfolio_admin_all on public.portfolio_projects
  for all to authenticated
  using ((select public.has_admin_role(array['owner', 'admin', 'editor'])))
  with check ((select public.has_admin_role(array['owner', 'admin', 'editor'])));

create policy portfolio_industries_public_read on public.portfolio_industries
  for select to anon, authenticated using (true);
create policy portfolio_industries_admin_all on public.portfolio_industries
  for all to authenticated
  using ((select public.has_admin_role(array['owner', 'admin', 'editor'])))
  with check ((select public.has_admin_role(array['owner', 'admin', 'editor'])));

create policy blog_public_read on public.blog_posts
  for select to anon, authenticated using (status = 'published');
create policy blog_admin_all on public.blog_posts
  for all to authenticated
  using ((select public.has_admin_role(array['owner', 'admin', 'editor'])))
  with check ((select public.has_admin_role(array['owner', 'admin', 'editor'])));

-- ---------------------------------------------------------------------
-- Policies: leads and related private data (owner/admin only)
-- ---------------------------------------------------------------------
-- No insert policy: leads are created only by public.create_lead()
-- through the server's secret key.
create policy leads_admin_select on public.leads
  for select to authenticated
  using ((select public.has_admin_role(array['owner', 'admin'])));
create policy leads_admin_update on public.leads
  for update to authenticated
  using ((select public.has_admin_role(array['owner', 'admin'])))
  with check ((select public.has_admin_role(array['owner', 'admin'])));
create policy leads_owner_delete on public.leads
  for delete to authenticated
  using ((select public.has_admin_role(array['owner'])));

create policy lead_activities_admin_select on public.lead_activities
  for select to authenticated
  using ((select public.has_admin_role(array['owner', 'admin'])));
-- Admins may add notes as themselves; system activities come from triggers.
create policy lead_activities_admin_insert_note on public.lead_activities
  for insert to authenticated
  with check (
    (select public.has_admin_role(array['owner', 'admin']))
    and activity_type = 'note'
    and actor_id = (select public.current_admin_id())
  );

create policy notification_events_admin_select on public.notification_events
  for select to authenticated
  using ((select public.has_admin_role(array['owner', 'admin'])));
create policy notification_events_admin_update on public.notification_events
  for update to authenticated
  using ((select public.has_admin_role(array['owner', 'admin'])))
  with check ((select public.has_admin_role(array['owner', 'admin'])));

create policy audit_log_admin_select on public.audit_log
  for select to authenticated
  using ((select public.has_admin_role(array['owner', 'admin'])));
