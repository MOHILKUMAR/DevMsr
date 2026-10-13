-- =====================================================================
-- Pricing detail: "what can increase the price" for every price, and the
-- scope ("included") and notes from the owner's Service Pricing Master and
-- Business Services & Pricing Guide (v1.2, 13 Oct 2026).
--
-- Safe to run more than once. The backfill only fills values that are still
-- empty (or a null note), so anything already edited in /admin/pricing is
-- kept. Generated from src/data/seed/pricing.ts; on a fresh database the
-- table is empty here and supabase/seed.sql inserts the same values.
-- =====================================================================

alter table public.service_pricing
  add column if not exists price_factors text[] not null default '{}'
  check (public.valid_text_list(price_factors, 30, 200));

-- Same as 20261012000001, plus 'price_factors' in each price.
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
        'price_note', p.price_note, 'included_features', to_jsonb(p.included_features), 'excluded_features', to_jsonb(p.excluded_features), 'price_factors', to_jsonb(p.price_factors),
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

-- Backfill existing rows (43 services).
update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Page complexity', 'Custom design', 'Copywriting', 'Animations', 'Integrations', 'Form requirements']::text[] else p.price_factors end
from public.services s
where s.id = p.service_id and s.slug = 'landing-page';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Number of pages or projects', 'CMS', 'Case studies', 'Custom interactions']::text[] else p.price_factors end
from public.services s
where s.id = p.service_id and s.slug = 'portfolio-website';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Page count', 'Content readiness', 'Custom layouts', 'Multilingual support', 'Integrations']::text[] else p.price_factors end
from public.services s
where s.id = p.service_id and s.slug = 'business-website';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['CMS choice', 'Author roles', 'Search', 'Migration', 'Article count', 'Editorial workflows']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Blog structure', 'Article templates', 'Category and tag structure', 'Basic SEO']::text[] else p.included_features end,
  price_note = coalesce(p.price_note, 'The exact CMS and editor scope is confirmed in your quote.')
from public.services s
where s.id = p.service_id and s.slug = 'blog-website';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Product count', 'Variants', 'Filters', 'Search', 'CMS', 'Bulk imports']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Product listing pages', 'Product detail pages', 'Enquiry and contact path']::text[] else p.included_features end,
  price_note = coalesce(p.price_note, 'Catalogue size is agreed in your quote.')
from public.services s
where s.id = p.service_id and s.slug = 'product-showcase-website';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Size and colour variants', 'SKU logic', 'Inventory', 'Filters', 'Custom product configurator', 'E-commerce']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Custom product presentation', 'Product catalogue', 'Footwear or product-specific pages as agreed']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'custom-product-website';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Product and variant count', 'Shipping', 'Taxes', 'Discounts', 'Customer accounts', 'Returns', 'Integrations', 'Marketplace requirements']::text[] else p.price_factors end
from public.services s
where s.id = p.service_id and s.slug = 'ecommerce-website';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Roles', 'Workflows', 'Integrations', 'Reporting', 'Data model', 'Security', 'Performance', 'Migration']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Requirements workshop to define the scope']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'custom-web-application';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Number of pages', 'Legacy framework', 'Content migration', 'Design changes', 'SEO preservation']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Refresh of agreed existing pages and layouts']::text[] else p.included_features end,
  price_note = coalesce(p.price_note, 'Migration and content scope are defined in your quote.')
from public.services s
where s.id = p.service_id and s.slug = 'website-redesign';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Screens', 'Responsive states', 'Prototypes', 'Design system', 'Research and revision rounds']::text[] else p.price_factors end
from public.services s
where s.id = p.service_id and s.slug = 'ui-ux-design';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Doctor profiles', 'Departments', 'Languages', 'Content', 'Appointment integrations']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Clinic or hospital pages', 'Services and departments', 'Contact and enquiry path']::text[] else p.included_features end,
  price_note = coalesce(p.price_note, 'Final pages are agreed in your quote.')
from public.services s
where s.id = p.service_id and s.slug = 'hospital-clinic-website';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Number of doctors or locations', 'Schedule rules', 'Rescheduling', 'Reminders', 'Payments', 'Integrations']::text[] else p.price_factors end
from public.services s
where s.id = p.service_id and s.slug = 'doctor-appointment-booking';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Departments', 'Roles', 'Patient workflows', 'Reports', 'Migration', 'Security and audit requirements']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Registration', 'OPD', 'Billing', 'Core reports']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'hospital-management-system';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Doctors', 'Counters', 'Live updates', 'Display screens', 'WhatsApp/SMS', 'Multi-location support']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Token and queue workflow', 'Status views as agreed in scope']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'opd-token-management';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Invoice rules', 'Payment modes', 'Discounts', 'Taxes', 'Roles', 'Printer or hardware integration']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Billing workflow', 'Agreed invoice and report features']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'hospital-billing';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Room categories', 'Galleries', 'Content', 'Languages', 'Booking integrations']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Hotel pages', 'Room and amenity presentation', 'Enquiry and contact path']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'hotel-website';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Room types', 'Seasonal rates', 'Payment flow', 'Cancellation rules', 'Channel manager integrations']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Booking interface', 'Availability and reservation workflow as agreed']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'hotel-booking-website';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Room count and workflows', 'Restaurant integration', 'Staff roles', 'Reporting', 'Migration']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Rooms', 'Reservations', 'Check-in and check-out', 'Billing', 'Reports']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'hotel-management-system';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Room and restaurant charges', 'GST invoice needs', 'Split billing', 'Payment modes', 'Hardware']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Hotel billing', 'Agreed invoice and settlement workflow']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'hotel-billing-gst-invoices';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Menu size', 'Categories', 'QR menu', 'Ordering', 'Location pages', 'Content']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Restaurant website or mobile-friendly digital menu']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'restaurant-website-digital-menu';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Tables', 'Modifiers', 'Kitchen printer or display', 'Inventory', 'Offline needs', 'Hardware']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Point-of-sale workflow', 'Agreed billing functions']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'restaurant-pos-billing';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Multi-branch', 'Recipe costing', 'Delivery', 'Staff roles', 'Supplier management', 'Reports']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['POS', 'Kitchen display', 'Menu', 'Basic stock']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'restaurant-management-system';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Barcode', 'Returns', 'Discounts', 'Inventory', 'Multiple counters or stores', 'Hardware']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Retail billing', 'Agreed sales and stock functions']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'retail-pos-billing';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Variant matrix', 'Barcode', 'Purchase orders', 'Stock transfers', 'Multiple stores']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Inventory and POS built around size, colour and SKU variants']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'footwear-inventory';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Weight and purity', 'Making charges', 'Barcode', 'Traceability', 'Purchase and sales', 'Audit reports']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Jewellery inventory and billing', 'Item attributes agreed in scope']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'jewellery-inventory';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Packages', 'Itineraries', 'Enquiry forms', 'Destinations', 'Content', 'Languages']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Travel agency website', 'Tour and package presentation']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'travel-agency-website';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Availability', 'Payments', 'Cancellations', 'Supplier APIs', 'Notifications', 'Dashboards']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Booking workflow', 'Reservation management as agreed']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'travel-booking-system';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Stages', 'Users', 'Reminders', 'Quotation generation', 'Integrations', 'Reporting']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Enquiry and customer pipeline', 'Follow-up workflow']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'travel-enquiry-crm';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Page count', 'Galleries', 'Calendars', 'Notices', 'Languages', 'Content']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['School pages', 'Announcements', 'Enquiry and admission contact path']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'school-website';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Form complexity', 'Document uploads', 'Review stages', 'Notifications', 'Reporting']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Admission enquiry and application workflow', 'Agreed status tracking']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'admission-crm';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Classes', 'Staff roles', 'Parent access', 'Examinations', 'Messaging', 'Migration']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Students', 'Attendance', 'Fees', 'Receipts']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'school-management-system';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Number of steps', 'Apps', 'Branching', 'Retries', 'Testing', 'Monitoring']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['One simple automation', 'Agreed trigger and actions', 'Failure path']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'workflow-automation';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Lead sources', 'Qualification rules', 'Integrations', 'Deduplication', 'Reporting']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Lead capture and routing', 'Agreed notifications or CRM updates']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'crm-updates-lead-routing';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Nodes', 'Branches', 'External APIs', 'Error handling', 'Self-hosting', 'Documentation']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Workflow built and tested in n8n for an agreed process']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'n8n-workflow-development';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Knowledge size', 'Retrieval', 'Admin updates', 'Analytics', 'AI provider and model']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['FAQ assistant for an agreed knowledge source', 'Agreed handoff path']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'website-faq-chatbot';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Scoring rules', 'CRM integration', 'Evaluation', 'Human review', 'Usage limits']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['AI-assisted lead classification or qualification', 'Agreed routing']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'lead-qualification-assistant';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Approved provider', 'Templates', 'Integrations', 'Opt-in', 'Conversation logic']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['WhatsApp workflow or bot for agreed messages and conversation paths']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'whatsapp-business-bot';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Call flows', 'Language', 'Telephony', 'Integrations', 'Handoff', 'Testing and compliance']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Voice agent for a defined inbound or outbound use case']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'inbound-voice-agent';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Checkout complexity', 'Refunds', 'Webhooks', 'Subscriptions', 'Reconciliation']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Integration with one agreed payment gateway', 'Payment confirmation workflow']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'payment-gateway-integration';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['API quality', 'Authentication', 'Rate limits', 'Data mapping', 'Retries', 'Documentation']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Connection to one agreed external API']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'api-webhook-development';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Response time', 'Update frequency', 'Backup retention', 'Included support hours']::text[] else p.price_factors end,
  price_note = coalesce(p.price_note, 'Exact coverage is defined by your plan.')
from public.services s
where s.id = p.service_id and s.slug = 'website-maintenance';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Application complexity', 'Support hours', 'SLA', 'Monitoring', 'Dependency updates']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Ongoing application maintenance', 'Agreed support scope']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'application-maintenance';

update public.service_pricing p set
  price_factors = case when p.price_factors = '{}' then array['Environment count', 'DNS', 'CI/CD', 'Server setup', 'Monitoring', 'Rollback requirements']::text[] else p.price_factors end,
  included_features = case when p.included_features = '{}' then array['Deployment setup for an agreed hosting environment', 'Handover']::text[] else p.included_features end
from public.services s
where s.id = p.service_id and s.slug = 'hosting-deployment';
