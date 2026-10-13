import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { LEAD_STATUSES, type LeadStatus } from '../leads/status';

/**
 * Admin reads. All queries run through the admin's session client, so RLS
 * decides what is visible; inactive and draft records are included.
 */

function data<T>(result: { data: unknown; error: { message: string; code?: string } | null }): T {
  if (result.error) throw Object.assign(new Error(result.error.message), { code: result.error.code });
  return result.data as T;
}

// ── Dashboard ─────────────────────────────────────────────────────────
const statsSchema = z.object({
  total: z.number(),
  by_status: z.record(z.string(), z.number()),
  follow_ups_due: z.number(),
  new_last_7_days: z.number(),
  failed_notifications: z.number(),
});
export type DashboardStats = z.infer<typeof statsSchema>;

export async function getDashboardStats(db: SupabaseClient): Promise<DashboardStats> {
  return statsSchema.parse(data(await db.rpc('lead_dashboard_stats')));
}

export interface LeadListRow {
  id: string;
  reference_number: string;
  name: string;
  email: string;
  business_name: string | null;
  phone: string | null;
  status: LeadStatus;
  form_type: 'contact' | 'quote' | 'demo';
  industry_name: string | null;
  service_label: string | null;
  budget_range: string | null;
  follow_up_at: string | null;
  created_at: string;
  total_count: number;
}

export interface LeadFilters {
  q: string;
  status: LeadStatus | '';
  industry: string;
  followUp: 'due' | 'scheduled' | 'none' | '';
  page: number;
}

export const LEADS_PAGE_SIZE = 20;

export function readLeadFilters(url: URL): LeadFilters {
  const status = url.searchParams.get('status') ?? '';
  const followUp = url.searchParams.get('follow_up') ?? '';
  const industry = url.searchParams.get('industry') ?? '';
  const page = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
  return {
    // Wildcards are stripped so the search is a plain substring match.
    q: (url.searchParams.get('q') ?? '').replace(/[%_\\]/g, '').trim().slice(0, 100),
    status: (LEAD_STATUSES as readonly string[]).includes(status) ? (status as LeadStatus) : '',
    industry: z.uuid().safeParse(industry).success ? industry : '',
    followUp: followUp === 'due' || followUp === 'scheduled' || followUp === 'none' ? followUp : '',
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10000) : 1,
  };
}

export async function searchLeads(db: SupabaseClient, filters: LeadFilters, pageSize = LEADS_PAGE_SIZE): Promise<{ rows: LeadListRow[]; total: number }> {
  const rows = data<LeadListRow[]>(
    await db.rpc('admin_search_leads', {
      p_query: filters.q || null,
      p_status: filters.status || null,
      p_industry: filters.industry || null,
      p_follow_up: filters.followUp || null,
      p_limit: pageSize,
      p_offset: (filters.page - 1) * pageSize,
    }),
  );
  return { rows, total: rows[0]?.total_count ?? 0 };
}

export interface NotificationRow {
  id: string;
  lead_id: string;
  event_type: 'owner_new_lead' | 'lead_acknowledgement';
  provider: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  attempt_count: number;
  last_error: string | null;
  sent_at: string | null;
  updated_at: string;
  leads?: { reference_number: string; name: string } | null;
}

export async function listProblemNotifications(db: SupabaseClient, limit = 10): Promise<NotificationRow[]> {
  return data(
    await db
      .from('notification_events')
      .select('id, lead_id, event_type, provider, status, attempt_count, last_error, sent_at, updated_at, leads(reference_number, name)')
      .in('status', ['failed', 'pending'])
      .lt('updated_at', new Date(Date.now() - 2 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false })
      .limit(limit),
  );
}

// ── Lead detail ───────────────────────────────────────────────────────
export interface LeadDetail {
  id: string;
  reference_number: string;
  form_type: 'contact' | 'quote' | 'demo';
  name: string;
  email: string;
  business_name: string | null;
  phone: string | null;
  industry_id: string | null;
  service_id: string | null;
  service_category: string | null;
  project_description: string;
  budget_range: string | null;
  timeline: string | null;
  preferred_contact: string | null;
  website_url: string | null;
  consultation_time: string | null;
  status: LeadStatus;
  source: string;
  source_path: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  privacy_acknowledged_at: string;
  follow_up_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  industries: { name: string } | null;
  services: { name: string; slug: string } | null;
}

export interface ActivityRow {
  id: string;
  activity_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  admin_profiles: { display_name: string } | null;
}

export async function getLead(db: SupabaseClient, id: string): Promise<LeadDetail | null> {
  if (!z.uuid().safeParse(id).success) return null;
  return data(await db.from('leads').select('*, industries(name), services(name, slug)').eq('id', id).maybeSingle());
}

export async function getLeadActivities(db: SupabaseClient, id: string): Promise<ActivityRow[]> {
  return data(
    await db
      .from('lead_activities')
      .select('id, activity_type, description, metadata, created_at, admin_profiles(display_name)')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(200),
  );
}

export async function getLeadNotifications(db: SupabaseClient, id: string): Promise<NotificationRow[]> {
  return data(
    await db
      .from('notification_events')
      .select('id, lead_id, event_type, provider, status, attempt_count, last_error, sent_at, updated_at')
      .eq('lead_id', id)
      .order('created_at'),
  );
}

// ── Catalogue and content ─────────────────────────────────────────────
export interface IndustryRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export async function listIndustries(db: SupabaseClient): Promise<IndustryRow[]> {
  return data(await db.from('industries').select('id, name, slug, description, icon, sort_order, is_active').order('sort_order').order('name'));
}

export interface ServiceRow {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  category: string;
  status: 'offered' | 'on_request';
  features: string[];
  sort_order: number;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string;
  service_industries: { industry_id: string }[];
}

export async function listServices(db: SupabaseClient): Promise<ServiceRow[]> {
  return data(
    await db
      .from('services')
      .select('id, name, slug, short_description, description, category, status, features, sort_order, is_active, seo_title, seo_description, updated_at, service_industries(industry_id)')
      .order('category')
      .order('sort_order')
      .order('name'),
  );
}

export interface PricingRow {
  id: string;
  service_id: string;
  label: string | null;
  display_group: string;
  pricing_model: string;
  minimum_amount: string | null;
  maximum_amount: string | null;
  max_open_ended: boolean;
  currency: string;
  billing_interval: string;
  price_note: string | null;
  included_features: string[];
  excluded_features: string[];
  price_factors: string[];
  estimated_delivery: string | null;
  tax_inclusive: boolean;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
  services: { name: string; slug: string; is_active: boolean } | null;
}

export async function listPricing(db: SupabaseClient): Promise<PricingRow[]> {
  // Amounts are cast to text so they stay exact decimal strings.
  return data(
    await db
      .from('service_pricing')
      .select(
        'id, service_id, label, display_group, pricing_model, minimum_amount::text, maximum_amount::text, max_open_ended, currency, billing_interval, price_note, included_features, excluded_features, price_factors, estimated_delivery, tax_inclusive, sort_order, is_active, updated_at, services(name, slug, is_active)',
      )
      .order('display_group')
      .order('sort_order'),
  );
}

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  status: 'available' | 'demo' | 'in_development' | 'concept';
  industry_id: string | null;
  service_category: string | null;
  features: string[];
  technology_stack: string[];
  image_urls: string[];
  demo_url: string | null;
  repository_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
}

export async function listProducts(db: SupabaseClient): Promise<ProductRow[]> {
  return data(await db.from('products').select('*').order('sort_order').order('name'));
}

export interface PortfolioRow {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  project_type: 'client' | 'internal' | 'prototype';
  technology_stack: string[];
  image_urls: string[];
  demo_url: string | null;
  repository_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean;
  published_at: string | null;
  updated_at: string;
  portfolio_industries: { industry_id: string }[];
}

export async function listPortfolio(db: SupabaseClient): Promise<PortfolioRow[]> {
  return data(await db.from('portfolio_projects').select('*, portfolio_industries(industry_id)').order('updated_at', { ascending: false }));
}

export interface BlogRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  status: 'draft' | 'published';
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  updated_at: string;
}

export async function listBlogPosts(db: SupabaseClient): Promise<BlogRow[]> {
  return data(await db.from('blog_posts').select('*').order('updated_at', { ascending: false }));
}

export interface FaqRow {
  id: string;
  scope: 'general' | 'industry' | 'service_category' | 'pricing';
  industry_id: string | null;
  service_category: string | null;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  industries: { name: string } | null;
}

export async function listFaqs(db: SupabaseClient): Promise<FaqRow[]> {
  return data(await db.from('faqs').select('*, industries(name)').order('scope').order('sort_order'));
}

export async function getSettings(db: SupabaseClient): Promise<Record<string, unknown>> {
  const rows = data<{ key: string; value: unknown }[]>(await db.from('site_settings').select('key, value'));
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export interface AuditRow {
  id: number;
  table_name: string;
  record_id: string | null;
  action: 'insert' | 'update' | 'delete';
  changed_fields: Record<string, { old: unknown; new: unknown }>;
  created_at: string;
  admin_profiles?: { display_name: string } | null;
}

export async function listAudit(db: SupabaseClient, limit = 30): Promise<AuditRow[]> {
  return data(await db.from('audit_log').select('id, table_name, record_id, action, changed_fields, created_at').order('id', { ascending: false }).limit(limit));
}
