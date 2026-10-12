-- =====================================================================
-- Admin helpers that must change several rows atomically.
-- SECURITY INVOKER: they run with the caller's rights, so the RLS policies
-- on service_industries / portfolio_industries decide who may use them.
-- =====================================================================

create or replace function public.admin_set_service_industries(p_service_id uuid, p_industry_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.service_industries
  where service_id = p_service_id and not (industry_id = any (coalesce(p_industry_ids, '{}')));

  insert into public.service_industries (service_id, industry_id)
  select p_service_id, i from unnest(coalesce(p_industry_ids, '{}')) as i
  on conflict do nothing;
end;
$$;

create or replace function public.admin_set_portfolio_industries(p_portfolio_id uuid, p_industry_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.portfolio_industries
  where portfolio_id = p_portfolio_id and not (industry_id = any (coalesce(p_industry_ids, '{}')));

  insert into public.portfolio_industries (portfolio_id, industry_id)
  select p_portfolio_id, i from unnest(coalesce(p_industry_ids, '{}')) as i
  on conflict do nothing;
end;
$$;

revoke all on function public.admin_set_service_industries(uuid, uuid[]) from public, anon;
revoke all on function public.admin_set_portfolio_industries(uuid, uuid[]) from public, anon;
grant execute on function public.admin_set_service_industries(uuid, uuid[]) to authenticated;
grant execute on function public.admin_set_portfolio_industries(uuid, uuid[]) to authenticated;
