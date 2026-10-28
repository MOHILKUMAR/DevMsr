-- =====================================================================
-- Social media management: a twelfth service category.
--
-- Widens the category checks on services, products, FAQs and leads. Run it
-- BEFORE deploying the code that adds the category: the old code is not
-- affected by a wider check. Add the category's services, prices and FAQs
-- only AFTER that deploy, because the deployed site rejects a catalogue
-- containing a category it does not know and falls back to bundled data.
--
-- Safe to run more than once.
-- =====================================================================

alter table public.services
  drop constraint if exists services_category_check,
  add constraint services_category_check check (category in (
    'web-development', 'ecommerce', 'custom-software', 'management-systems', 'pos-billing', 'crm-erp',
    'ai-automation', 'ai-agents-chatbots', 'voice-ai', 'integrations-payments', 'hosting-maintenance',
    'social-media-management'
  ));

alter table public.products
  drop constraint if exists products_service_category_check,
  add constraint products_service_category_check check (service_category in (
    'web-development', 'ecommerce', 'custom-software', 'management-systems', 'pos-billing', 'crm-erp',
    'ai-automation', 'ai-agents-chatbots', 'voice-ai', 'integrations-payments', 'hosting-maintenance',
    'social-media-management'
  ));

alter table public.faqs
  drop constraint if exists faqs_service_category_check,
  add constraint faqs_service_category_check check (service_category in (
    'web-development', 'ecommerce', 'custom-software', 'management-systems', 'pos-billing', 'crm-erp',
    'ai-automation', 'ai-agents-chatbots', 'voice-ai', 'integrations-payments', 'hosting-maintenance',
    'social-media-management'
  ));

alter table public.leads
  drop constraint if exists leads_service_category_check,
  add constraint leads_service_category_check check (service_category in (
    'web-development', 'ecommerce', 'custom-software', 'management-systems', 'pos-billing', 'crm-erp',
    'ai-automation', 'ai-agents-chatbots', 'voice-ai', 'integrations-payments', 'hosting-maintenance',
    'social-media-management'
  ));
