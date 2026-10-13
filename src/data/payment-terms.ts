import type { Faq } from '../types/catalogue.ts';

/**
 * Standard payment and project terms, for /payments. Client-facing wording
 * of the owner's Business Services & Pricing Guide (v1.2, 13 Oct 2026),
 * section 7, and the Payment Structure sheet; the owner approved publishing
 * them on 13 Oct 2026. A signed quotation or statement of work always takes
 * precedence over these defaults.
 */

export interface Milestone {
  name: string;
  /** Whole-number percentage of the agreed project fee. */
  percent: number;
  due: string;
  covers: string;
  /** Wording for the worked example, e.g. "₹20,000 to book". */
  example: string;
}

export const MILESTONES: Milestone[] = [
  {
    name: 'Booking and kickoff',
    percent: 50,
    due: 'After you approve the quotation or statement of work, before work is scheduled.',
    covers: 'Confirms the booking, reserves delivery time and starts the project.',
    example: 'to book',
  },
  {
    name: 'Working demo',
    percent: 30,
    due: 'When the agreed core scope is demonstrated, typically at about 75% completion.',
    covers: 'The next stage: final testing, fixes within scope and deployment preparation.',
    example: 'at the working demo',
  },
  {
    name: 'Final handover',
    percent: 20,
    due: 'Before production launch, transfer of source code or admin access, or final handover — whichever your quotation states.',
    covers: 'Final release and handover once the agreed scope is ready.',
    example: 'before handover',
  },
];

/** Fee used for the worked example under the milestone table, in rupees. */
export const EXAMPLE_PROJECT_FEE = 40000;

export const MILESTONE_NOTES: string[] = [
  'Small fixed-scope projects can be split 50% advance and 50% before final delivery, when the quotation says so.',
  'Large or multi-phase projects get a separate milestone schedule for each approved phase, listed in the proposal.',
  'Percentages apply to the agreed project fee. GST, where applicable, and any separately approved third-party or travel costs are itemised on the invoice.',
  'Work starts once the advance is received. The advance counts towards the total project fee. If a project is cancelled, it is settled against work completed and costs already committed, under the signed agreement and applicable law.',
];

export interface VisitFee {
  name: string;
  fee: string;
  detail: string;
}

export const VISIT_FEES: VisitFee[] = [
  {
    name: 'Remote discovery call',
    fee: 'Free',
    detail: 'Up to 30 minutes, to understand what you need and whether we can help.',
  },
  {
    name: 'On-site visit within Delhi NCR',
    fee: '₹1,000 per visit',
    detail: 'Up to 60 minutes. We confirm the coverage area and any parking or toll charges before booking.',
  },
  {
    name: 'On-site visit outside Delhi NCR',
    fee: '₹1,500 per day + actual costs',
    detail: 'Pre-approved travel, parking and tolls, accommodation and other out-of-pocket costs are billed at actuals.',
  },
];

export const VISIT_NOTES: string[] = [
  'A visit fee covers consultation or assessment time. It is separate from the development fee and does not include development work, a full technical audit, detailed architecture or a written specification unless your quotation includes them.',
  'We confirm the visit fee and expected expenses in writing before the visit. Visit pricing for a larger project or repeat visits can be agreed differently, in writing.',
];

export const CHANGE_RULES: string[] = [
  'Your quotation fixes the agreed features, deliverables and included revision rounds before development starts.',
  'Requests raised along the way — including at the 50% or 75% stage — are handled as change requests when they add to or change the approved scope.',
  'For each change we send the extra fee, the effect on the delivery date and any third-party cost in writing. The price can be discussed before you approve; extra work starts only after your written approval.',
  'A change that materially expands the project becomes a separate phase or add-on quotation, and may move the original delivery date.',
];

export const CHANGE_PAYMENTS: { size: string; before: string; after: string }[] = [
  { size: 'Changes up to ₹5,000', before: '100%', after: '—' },
  { size: 'Changes above ₹5,000', before: '50%', after: '50% when the change is demonstrated, before release' },
  { size: 'Large feature or new module', before: 'As agreed in a separate quotation or phase', after: 'As agreed in that quotation' },
];

export const DEFECT_RULE =
  'If something does not meet the written, approved scope, we fix it within the bug-fix period stated in your quotation at no extra charge. New features, changed preferences, new integrations and revised workflows are not defects.';

export const INVOICE_RULES: string[] = [
  'Quotations are valid for 15 calendar days unless the quotation says otherwise.',
  'Invoices are due within 3 calendar days unless the quotation says otherwise. The next milestone starts once its payment is received.',
  'If a payment is overdue for 5 business days after written notice, work may be paused until it is received, and the delivery date may move to reflect the pause.',
  'GST treatment is shown on each quotation and invoice. Prices on this website exclude GST unless a written quote says otherwise.',
  'Hosting, domains, email, WhatsApp/SMS, AI and voice usage, licences, payment-provider fees and hardware are billed separately unless your proposal includes them.',
];

export const HANDOVER_ITEMS: string[] = [
  'Production deployment',
  'Source-code repository',
  'Admin credentials',
  'Documentation',
  'Training',
  'Data export',
  'Transfer of accounts and access',
];

const PAYMENT_FAQS: Pick<Faq, 'question' | 'answer'>[] = [
  {
    question: 'Do I pay before work starts?',
    answer: 'Yes. Most projects start with a 50% advance after you approve the written quotation. The advance books the project and counts towards the total fee.',
  },
  {
    question: 'How are the remaining payments split?',
    answer:
      '30% when the agreed core scope is shown to you as a working demo, typically at about 75% completion, and the remaining 20% before launch or final handover. Small fixed-scope projects can be split 50/50 when the quotation says so.',
  },
  {
    question: 'What if I want changes during the project?',
    answer:
      'Changes that add to or alter the approved scope are handled as change requests. We send the extra cost and any timeline impact in writing and start only after you approve. Changes up to ₹5,000 are paid in full before work starts; larger ones are paid 50% before and 50% when the change is demonstrated.',
  },
  {
    question: 'Is the first consultation free?',
    answer:
      'Yes, a remote discovery call of up to 30 minutes is free. On-site visits are ₹1,000 per visit within Delhi NCR (up to 60 minutes), and ₹1,500 per day plus pre-approved travel and expenses outside Delhi NCR.',
  },
  {
    question: 'Is GST included in your prices?',
    answer: 'No. Prices on this website exclude GST unless a written quote says otherwise. GST treatment is shown on each quotation and invoice.',
  },
  {
    question: 'How long is a quotation valid?',
    answer: '15 calendar days, unless the quotation says otherwise.',
  },
  {
    question: 'Can I pay online on this website?',
    answer: 'Not yet. Every project starts with a written quotation, and payments are made against our invoices.',
  },
];

export const PAYMENT_FAQ_LIST: Faq[] = PAYMENT_FAQS.map((faq, index) => ({
  id: `payments-${index + 1}`,
  scope: 'pricing',
  scopeKey: null,
  question: faq.question,
  answer: faq.answer,
  sortOrder: (index + 1) * 10,
}));
