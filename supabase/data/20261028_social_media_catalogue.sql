-- =====================================================================
-- Social media management: services, prices and FAQs for the LIVE database.
--
-- Run order: 1) migration 20261028000005_social_media_category.sql,
-- 2) deploy the code, 3) this file. Running it before the deploy makes the
-- live site fall back to its bundled catalogue until the deploy.
--
-- Extracted from supabase/seed.sql (same statements), so it only inserts
-- rows that are missing and never overwrites admin edits. Safe to run twice.
-- =====================================================================

begin;
insert into public.services (slug, name, short_description, category, features, status, sort_order) values ('healthcare-social-media-management', 'Social media management', 'Posts, reels, carousels and stories on Instagram, Facebook, YouTube, LinkedIn and X, shot at your hospital and approved by you on WhatsApp.', 'social-media-management', array['12 posts, 4 reels, 5 carousels and 15 stories a month', 'One shoot a month at your hospital', 'Daily replies to comments and messages', 'Google review replies and a feedback QR', 'Camp, festival and health-awareness posts', 'Monthly report']::text[], 'offered', 1260) on conflict (slug) do nothing;

insert into public.services (slug, name, short_description, category, features, status, sort_order) values ('social-media-3-month-plan', '3-month social media and website plan', 'Your website plus three months of social media management, paid once before work starts.', 'social-media-management', array['Static or premium website', 'Three months of posts, reels, carousels and stories', 'Three shoots at your hospital', 'Upgrade to the Partner Plan at any time']::text[], 'offered', 1270) on conflict (slug) do nothing;

insert into public.services (slug, name, short_description, category, features, status, sort_order) values ('digital-presence-audit', 'Digital presence audit', 'A written audit of your social profiles, website, Google reviews, Google Business Profile and NMC compliance, with a costed 3-month plan.', 'social-media-management', array['A score out of 10 for each area', 'Screenshots of what patients see today', 'Main problems and why to fix them', 'Free quick wins for this week', 'A 3-month plan with exact costing']::text[], 'offered', 1280) on conflict (slug) do nothing;

insert into public.services (slug, name, short_description, category, features, status, sort_order) values ('local-seo', 'Local SEO', 'Google Business Profile, local keywords, doctor and department pages, listings and real backlinks, so patients find you when they search nearby.', 'social-media-management', array['Google Business Profile management', 'On-page and technical SEO', 'Practo, Justdial and map listings', 'Backlinks from 25+ real sites', 'Monthly ranking report']::text[], 'offered', 1290) on conflict (slug) do nothing;

insert into public.services (slug, name, short_description, category, features, status, sort_order) values ('health-blog-writing', 'Health blogs and articles', 'Doctor-reviewed health articles on your website, shared on 25+ platforms and reused as carousels and reel scripts.', 'social-media-management', array['4 articles a month', 'Author box with the doctor’s registration number', 'Shared on Medium, LinkedIn, Quora, Practo and more']::text[], 'offered', 1300) on conflict (slug) do nothing;

insert into public.services (slug, name, short_description, category, features, status, sort_order) values ('social-media-add-ons', 'Plan add-ons', 'Extra posts, reels, shoots and website pages for a busy month such as a camp week or a festival, priced up front.', 'social-media-management', '{}'::text[], 'offered', 1310) on conflict (slug) do nothing;

insert into public.service_industries (service_id, industry_id) select s.id, i.id from public.services s, public.industries i where s.slug = 'healthcare-social-media-management' and i.slug = 'healthcare' on conflict do nothing;

insert into public.service_industries (service_id, industry_id) select s.id, i.id from public.services s, public.industries i where s.slug = 'social-media-3-month-plan' and i.slug = 'healthcare' on conflict do nothing;

insert into public.service_industries (service_id, industry_id) select s.id, i.id from public.services s, public.industries i where s.slug = 'local-seo' and i.slug = 'healthcare' on conflict do nothing;

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Starter Partner Plan', 'healthcare', 'fixed', 18999::numeric, 18999::numeric, false, 'monthly', '12 months, billed monthly in advance by the 5th, with the price locked for the term. Leaving before 12 months makes the waived website fee payable. Website fee of ₹11,999 waived.', array['Static 5-page website, with hosting for year 1', '5 social profiles set up with a brand kit', '12 posts, 4 reels, 5 carousels and 15 stories a month', 'One shoot a month at your hospital', 'Camp, festival and awareness posts', 'Review replies and a feedback QR', 'Monthly report']::text[], array['Ad spend, paid by you directly to the platforms', 'Influencer fees', 'Paid verification badges', 'Outstation travel for shoots, at cost', 'GST']::text[], '{}'::text[], 440
from public.services s
where s.slug = 'healthcare-social-media-management'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Starter Partner Plan');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Growth Partner Plan', 'healthcare', 'fixed', 23999::numeric, 23999::numeric, false, 'monthly', '12 months, billed monthly in advance by the 5th, with the price locked for the term. Leaving before 12 months makes the waived website fee payable. Website fee of ₹19,999 waived.', array['Everything in Starter', 'Premium website with an admin panel and blog, with hosting for year 1', '4 doctor-reviewed blogs a month, shared on 25+ sites', 'Monthly report and a 30-minute review call']::text[], array['Ad spend, paid by you directly to the platforms', 'Influencer fees', 'Paid verification badges', 'Outstation travel for shoots, at cost', 'GST']::text[], '{}'::text[], 450
from public.services s
where s.slug = 'healthcare-social-media-management'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Growth Partner Plan');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Pro Partner Plan, with Local SEO', 'healthcare', 'fixed', 43998::numeric, 43998::numeric, false, 'monthly', '12 months, billed monthly in advance by the 5th, with the price locked for the term. Leaving before 12 months makes the waived website fee payable. Website fee of ₹19,999 waived.', array['Everything in Starter', 'Premium website with an admin panel, with hosting for year 1', 'Local SEO with backlinks from 25+ real sites', 'Monthly report with rankings']::text[], array['Ad spend, paid by you directly to the platforms', 'Influencer fees', 'Paid verification badges', 'Outstation travel for shoots, at cost', 'GST']::text[], '{}'::text[], 460
from public.services s
where s.slug = 'healthcare-social-media-management'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Pro Partner Plan, with Local SEO');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Starter 3-Month Plan', 'healthcare', 'fixed', 68996::numeric, 68996::numeric, false, 'one_time', 'Static website ₹11,999 + 3 months × ₹18,999. Paid in full before work starts; fully refundable until work starts.', array['Static 5-page website, with hosting for year 1', '5 social profiles set up with a brand kit', '12 posts, 4 reels, 5 carousels and 15 stories a month', 'One shoot a month at your hospital', 'Review replies and a monthly report']::text[], array['Ad spend, paid by you directly to the platforms', 'Influencer fees', 'Paid verification badges', 'Outstation travel for shoots, at cost', 'GST']::text[], '{}'::text[], 470
from public.services s
where s.slug = 'social-media-3-month-plan'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Starter 3-Month Plan');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Growth 3-Month Plan', 'healthcare', 'fixed', 91996::numeric, 91996::numeric, false, 'one_time', 'Premium website ₹19,999 + 3 months × ₹23,999. Paid in full before work starts; fully refundable until work starts.', array['Everything in Starter', 'Premium website with an admin panel and blog', '4 doctor-reviewed blogs a month, shared on 25+ sites', 'Monthly report and a review call']::text[], array['Ad spend, paid by you directly to the platforms', 'Influencer fees', 'Paid verification badges', 'Outstation travel for shoots, at cost', 'GST']::text[], '{}'::text[], 480
from public.services s
where s.slug = 'social-media-3-month-plan'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Growth 3-Month Plan');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Digital presence audit', 'healthcare', 'fixed', 999::numeric, 999::numeric, false, 'one_time', 'Adjusted against your first invoice if you join a plan within 7 days of receiving the audit.', array['Social media profiles: activity, branding and bio', 'Website: mobile view, speed, contact and booking path', 'Google reviews: rating, replies and recent feedback', 'Google Business Profile: address, timings, photos and category', 'NMC compliance of existing posts', 'A 3-month plan with exact costing']::text[], array['GST']::text[], '{}'::text[], 490
from public.services s
where s.slug = 'digital-presence-audit'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Digital presence audit');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Local SEO', 'healthcare', 'fixed', 24999::numeric, 24999::numeric, false, 'monthly', 'Minimum 6 months, because SEO usually takes 4–12 months to show results. Available with the Partner Plan and included in Pro. No ranking is guaranteed.', array['Google Business Profile: categories, timings, photos and weekly posts', 'A reply to every Google review', 'Local keywords, titles, meta tags and schema', 'Doctor and department pages', 'Speed, sitemap, Search Console and broken-link fixes', 'Practo, Justdial and map listings', 'Backlinks from 25+ real sites, none bought', 'Monthly ranking report']::text[], array['Ad spend', 'GST']::text[], '{}'::text[], 500
from public.services s
where s.slug = 'local-seo'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Local SEO');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Blog posting', 'healthcare', 'fixed', 6499::numeric, 6499::numeric, false, 'monthly', 'Included in the Growth plan; an add-on for Starter.', array['4 doctor-reviewed articles a month', 'Published on your website', 'Shared on 25+ platforms such as Medium, LinkedIn, Quora and Practo', 'Author box with the doctor’s name, qualification and registration number', 'Each article reused as a carousel and a reel script']::text[], array['GST']::text[], '{}'::text[], 510
from public.services s
where s.slug = 'health-blog-writing'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Blog posting');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Extra post', 'healthcare', 'fixed', 999::numeric, 999::numeric, false, 'one_time', null, '{}'::text[], array['GST']::text[], '{}'::text[], 520
from public.services s
where s.slug = 'social-media-add-ons'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Extra post');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Extra reel', 'healthcare', 'fixed', 3999::numeric, 3999::numeric, false, 'one_time', null, '{}'::text[], array['GST']::text[], '{}'::text[], 530
from public.services s
where s.slug = 'social-media-add-ons'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Extra reel');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Extra half-day shoot', 'healthcare', 'fixed', 7999::numeric, 7999::numeric, false, 'one_time', null, '{}'::text[], array['Outstation travel, at cost', 'GST']::text[], '{}'::text[], 540
from public.services s
where s.slug = 'social-media-add-ons'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Extra half-day shoot');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Full-day shoot', 'healthcare', 'fixed', 13999::numeric, 13999::numeric, false, 'one_time', null, '{}'::text[], array['Outstation travel, at cost', 'GST']::text[], '{}'::text[], 550
from public.services s
where s.slug = 'social-media-add-ons'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Full-day shoot');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Profile reconstruction', 'healthcare', 'fixed', 1999::numeric, 1999::numeric, false, 'one_time', null, '{}'::text[], array['GST']::text[], '{}'::text[], 560
from public.services s
where s.slug = 'social-media-add-ons'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Profile reconstruction');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Extra website page', 'healthcare', 'fixed', 1999::numeric, 1999::numeric, false, 'one_time', null, '{}'::text[], array['GST']::text[], '{}'::text[], 570
from public.services s
where s.slug = 'social-media-add-ons'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Extra website page');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Hindi + English website', 'healthcare', 'fixed', 5999::numeric, 5999::numeric, false, 'one_time', null, '{}'::text[], array['GST']::text[], '{}'::text[], 580
from public.services s
where s.slug = 'social-media-add-ons'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Hindi + English website');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'M Kit token booking', 'healthcare', 'fixed', 4999::numeric, 4999::numeric, false, 'one_time', 'For the premium website.', '{}'::text[], array['GST']::text[], '{}'::text[], 590
from public.services s
where s.slug = 'social-media-add-ons'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'M Kit token booking');

insert into public.service_pricing (service_id, label, display_group, pricing_model, minimum_amount, maximum_amount, max_open_ended, billing_interval, price_note, included_features, excluded_features, price_factors, sort_order)
select s.id, 'Logo design', 'healthcare', 'fixed', 2999::numeric, 2999::numeric, false, 'one_time', null, '{}'::text[], array['GST']::text[], '{}'::text[], 600
from public.services s
where s.slug = 'social-media-add-ons'
  and not exists (select 1 from public.service_pricing p where p.service_id = s.id and p.label = 'Logo design');

insert into public.faqs (scope, industry_id, service_category, question, answer, sort_order)
select 'service_category', null, 'social-media-management', 'Which platforms do you manage?', 'Instagram, Facebook, YouTube, LinkedIn and X, in one consistent brand. We also keep your Google Business Profile and listings such as Practo and Justdial accurate.', 240
where not exists (select 1 from public.faqs f where f.question = 'Which platforms do you manage?');

insert into public.faqs (scope, industry_id, service_category, question, answer, sort_order)
select 'service_category', null, 'social-media-management', 'Does anything get posted without my approval?', 'No. You approve the monthly calendar in week one and every post and reel on WhatsApp before it goes live. Please reply within 2 working days; a late approval moves the publishing date, not the invoice date. One round of changes per post or reel is included; extra rounds cost ₹299 per post and ₹799 per reel.', 250
where not exists (select 1 from public.faqs f where f.question = 'Does anything get posted without my approval?');

insert into public.faqs (scope, industry_id, service_category, question, answer, sort_order)
select 'service_category', null, 'social-media-management', 'How do you keep content within the NMC guidelines?', 'We check every post against the National Medical Commission’s Guidelines on Ethical Advertising and Public Communication before it reaches you. We do not publish patient testimonials, before-and-after photos, guaranteed outcomes, unverifiable “best” or “No. 1” claims, or bought reviews, and every post shows the doctor’s name, qualification and registration number. You stay professionally responsible for the medical accuracy of what you approve.', 260
where not exists (select 1 from public.faqs f where f.question = 'How do you keep content within the NMC guidelines?');

insert into public.faqs (scope, industry_id, service_category, question, answer, sort_order)
select 'service_category', null, 'social-media-management', 'Do you need my passwords?', 'Usually not. Wherever a platform allows it, you add us as a partner, manager or editor and each team member logs in as themselves. If a password is unavoidable, it is shared through an encrypted password manager, never by WhatsApp or email; two-factor authentication stays on, and recovery details stay yours. Access is removed within 48 hours of the work ending.', 270
where not exists (select 1 from public.faqs f where f.question = 'Do you need my passwords?');

insert into public.faqs (scope, industry_id, service_category, question, answer, sort_order)
select 'service_category', null, 'social-media-management', 'Who owns the accounts and the content?', 'You do: your accounts, pages, domain, website and data stay in your name. Once paid for, the designs, reels, photos and articles we make for you are yours, and we hand them over if you leave. We never lock or withhold an account, even in a fee dispute.', 280
where not exists (select 1 from public.faqs f where f.question = 'Who owns the accounts and the content?');

insert into public.faqs (scope, industry_id, service_category, question, answer, sort_order)
select 'service_category', null, 'social-media-management', 'Can I pause or stop the Partner Plan?', 'Yes, with one month’s written notice, during which services continue and are billed as usual. You can pause for up to 2 months once a year; the 12-month term extends by the pause. If you leave before 12 months, the website fee we waived (₹11,999 Starter, ₹19,999 Growth and Pro) becomes payable. After 12 months the plan runs month to month.', 290
where not exists (select 1 from public.faqs f where f.question = 'Can I pause or stop the Partner Plan?');

insert into public.faqs (scope, industry_id, service_category, question, answer, sort_order)
select 'service_category', null, 'social-media-management', 'Is the 3-Month Plan refundable?', 'Fully, if you cancel in writing before work starts: that is, before the earliest of the kickoff call, the first audit fix, the start of website design, the first content calendar or the first shoot. Once work has started it is not refundable and it cannot be paused, because we reserve team time and shoots for the full 3 months.', 300
where not exists (select 1 from public.faqs f where f.question = 'Is the 3-Month Plan refundable?');

insert into public.faqs (scope, industry_id, service_category, question, answer, sort_order)
select 'service_category', null, 'social-media-management', 'Do you guarantee followers, reach or rankings?', 'No. Results depend on the platforms, competition and other factors outside our control, and we never buy followers, likes or reviews. You get a monthly report on reach, followers, reviews and rankings, so you can see what is changing.', 310
where not exists (select 1 from public.faqs f where f.question = 'Do you guarantee followers, reach or rankings?');

insert into public.faqs (scope, industry_id, service_category, question, answer, sort_order)
select 'service_category', null, 'social-media-management', 'Is ad spend included?', 'No. If you run ads, you pay Meta, Google or the other platform directly, and we do not hold or refund ad budgets. Influencer fees and paid verification badges are also not included.', 320
where not exists (select 1 from public.faqs f where f.question = 'Is ad spend included?');

insert into public.faqs (scope, industry_id, service_category, question, answer, sort_order)
select 'service_category', null, 'social-media-management', 'Do you manage social media for businesses outside healthcare?', 'Our published plans are built for doctors, clinics and hospitals. For other businesses, send a quote request with your platforms and goals and we will scope it with you.', 330
where not exists (select 1 from public.faqs f where f.question = 'Do you manage social media for businesses outside healthcare?');

commit;
