/**
 * How quotes are worked out, for the pricing page. Client-facing wording of
 * the owner's Business Services & Pricing Guide (v1.2, 13 Oct 2026),
 * sections 4 and 5. The guide's internal price-review policy is not published.
 */

export interface PricingLevel {
  name: string;
  situation: string;
  position: string;
  examples: string;
}

/** Where a project sits within a published range. */
export const PRICING_LEVELS: PricingLevel[] = [
  {
    name: 'Basic',
    situation: 'One clear workflow, a few pages or screens, your content ready and minimal integrations.',
    position: 'Near the lower end of the range.',
    examples: 'A simple landing page; a basic lead form.',
  },
  {
    name: 'Standard',
    situation: 'Several workflows, admin controls, responsive layouts, routine integrations and reporting.',
    position: 'Around the middle of the range.',
    examples: 'A business website; appointment booking with a front-desk view.',
  },
  {
    name: 'Advanced',
    situation: 'Multiple roles or locations, complex business rules, data migration, third-party systems, audit trails or high support needs.',
    position: 'Near the upper end, or above it after a fresh estimate.',
    examples: 'A multi-branch POS; a multi-department management system.',
  },
  {
    name: 'Enterprise / phased',
    situation: 'Large, business-critical, high-volume or compliance-sensitive projects, or several connected systems.',
    position: 'Discovery first, then a separate estimate for each phase.',
    examples: 'A full hospital management system or ERP; a complex travel booking platform.',
  },
];

/** How a written quote is built up. */
export const QUOTE_STEPS: { title: string; body: string }[] = [
  { title: 'Base price', body: 'The closest service in this list, at the complexity level that fits your project.' },
  { title: 'Scope additions', body: 'Only the pages, screens, roles, workflows, branches, records, reports or features that go beyond the included scope.' },
  { title: 'Integrations', body: 'Each external API, payment, messaging, CRM, accounting or hardware integration is estimated separately.' },
  { title: 'Data migration', body: 'Mapping, clean-up, import, reconciliation and a test migration, when you have existing data.' },
  { title: 'Quality and delivery', body: 'Testing, accessibility, security, deployment, documentation, training and handover.' },
  { title: 'Assumptions, stated', body: 'Any allowance for unknown legacy systems or unstable third-party APIs is explained in the quote, not hidden.' },
  { title: 'Running costs, listed separately', body: 'Monthly or yearly third-party charges are listed apart from the one-time development fee.' },
];

/** What can raise a quote, or move a project up the range. */
export const QUOTE_TRIGGERS: string[] = [
  'Features, pages, workflows, user roles, branches or integrations added after the scope is approved',
  'Custom design or complex business logic beyond the standard scope',
  'Incomplete, inconsistent or large volumes of data to migrate',
  'An external API, provider or legacy system that is poorly documented or needs extra compatibility work',
  'Tighter deadlines, weekend work, priority delivery or an agreed support SLA',
  'Higher security, audit trail, access control, uptime, performance or recovery requirements',
  'More revisions or content changes than the agreed allowance',
  'A provider raising its hosting, messaging, AI, licence or transaction charges — passed on only where your agreement allows, after telling you',
];
