/**
 * Extra sections for the social media management page (/services/social-media-management).
 *
 * From the owner's healthcare pitch deck, Terms & Conditions, Refund, Pause &
 * Cancellation Policy and Client Account Access & Credential Security
 * Agreement (all October 2026). Prices are not written here: plan cells name a
 * price label, and the page reads that price from the catalogue, so prices
 * stay editable in /admin/pricing.
 */

/** A plan table cell: plain text, or the price stored under this label for the row's service. */
export type PlanCell = { text: string } | { priceLabel: string };

export interface PlanTable {
  columns: { name: string; summary: string; recommended?: boolean }[];
  /** One value per column. */
  features: { feature: string; values: string[] }[];
  prices: { label: string; serviceSlug: string; cells: PlanCell[] }[];
  notes: string[];
}

export interface RetainerDetails {
  monthly: {
    deliverables: { count: string; item: string }[];
    platforms: string[];
    /** Which plans the deliverables above describe. */
    note: string;
    steps: { title: string; detail: string }[];
    effort: string;
  };
  coverage: { title: string; detail: string; points: string[] }[];
  plans: PlanTable;
  audit: { serviceSlug: string; priceLabel: string; intro: string; areas: { title: string; detail: string }[]; fileShows: string[]; note: string };
  firstMonths: { month: string; title: string; items: string[] }[];
  byDay90: string;
  promises: { title: string; detail: string }[];
  compliance: { intro: string; rules: string[] };
  accountAccess: { intro: string; points: string[] };
  terms: { title: string; detail: string }[];
  termsNote: string;
}

const SOCIAL = 'healthcare-social-media-management';
const THREE_MONTH = 'social-media-3-month-plan';

export const SOCIAL_MEDIA_DETAILS: RetainerDetails = {
  monthly: {
    deliverables: [
      { count: '12', item: 'designed posts' },
      { count: '4', item: 'reels, scripted and edited' },
      { count: '5', item: 'carousels' },
      { count: '15', item: 'stories' },
      { count: '1', item: 'shoot at your hospital' },
    ],
    platforms: ['Instagram', 'Facebook', 'YouTube', 'LinkedIn', 'X'],
    note: 'Shown for the Professional and Premium plans. Basic covers Instagram, Facebook and Google with 8 posts, 2 reels and 8 stories a month, and a shoot every 3 months.',
    steps: [
      { title: 'Plan', detail: 'You approve the month’s calendar in week one.' },
      { title: 'Shoot', detail: 'About 2 hours at your hospital: your facility, team and health talks on camera.' },
      { title: 'Create', detail: 'Design, scripts, voice-over and editing.' },
      { title: 'Approve', detail: 'You review everything on WhatsApp. Nothing goes live without your yes.' },
      { title: 'Publish', detail: 'Posting, daily replies to comments and messages, and a monthly report.' },
    ],
    effort:
      'Keeping five pages active takes about 64 hours a month: 22 for designed posts, 18 for reels, 16.5 for replies to comments and messages, and 7.5 for stories, planning and reports. That is about eight working days away from the OPD.',
  },
  coverage: [
    {
      title: 'Health camps and awareness',
      detail: 'On the Professional and Premium plans: content that brings people to your camps and answers seasonal questions, reviewed by your doctor and kept factual.',
      points: [
        'Camp announcement poster, reel and Google post, plus a WhatsApp-ready version',
        'Screening camps (BP, sugar, thyroid, bone, eyes): what is checked and who should come',
        'Live stories on the day and a recap with no identifiable patients',
        'Seasonal awareness: dengue and malaria, heatstroke, smog and asthma, monsoon food safety',
      ],
    },
    {
      title: 'Reviews and community',
      detail: 'Polite, professional replies that never reveal patient details, and an honest way to collect feedback.',
      points: [
        'Comments and messages answered every working day',
        'A reply to every Google review',
        'A feedback QR and WhatsApp link at reception, for every patient, not only the happy ones (Professional and Premium)',
        'A monthly reputation report: rating trend, recurring complaints and what to fix at the front desk (Professional and Premium)',
      ],
    },
    {
      title: 'Festivals and health days',
      detail: 'Greeting reels, carousels and posts planned a month ahead from a 12-month calendar.',
      points: [
        'Diwali, Navratri, Makar Sankranti, Eid, Gurpurab and local festivals as they fall',
        'Doctors’ Day, World Mental Health Day, World Diabetes Day and other health days',
        'Calendar approved with you in month one',
      ],
    },
    {
      title: 'Blogs and doctor profiles',
      detail: 'Articles that answer patients’ questions, and profiles that show each doctor’s qualifications.',
      points: [
        'Doctor-reviewed articles every month: 2 on Professional, 4 on Premium',
        'On Premium, articles are also shared on 25+ platforms such as Medium, LinkedIn, Quora and Practo',
        'Each article reused as a carousel and a reel script',
        'A profile per doctor: qualification, specialty, registration number and OPD timings',
        'Profile upkeep on 10+ platforms, including Google, Practo and Justdial, on Premium',
      ],
    },
  ],
  plans: {
    columns: [
      { name: 'Basic', summary: 'Instagram, Facebook and Google' },
      { name: 'Professional', summary: 'All 5 platforms, campaigns and blogs', recommended: true },
      { name: 'Premium', summary: 'Everything in Professional, with Local SEO' },
    ],
    features: [
      { feature: 'Platforms', values: ['Instagram, Facebook, Google', '5 platforms + Google', '5 platforms + Google'] },
      { feature: 'Posts and reels a month', values: ['8 + 2', '12 + 4, plus 5 carousels', '12 + 4, plus 5 carousels'] },
      { feature: 'Stories a month', values: ['8', '15', '15'] },
      { feature: 'Shoot at your hospital', values: ['Every 3 months', 'Monthly', 'Monthly'] },
      { feature: 'Festival and health-day posts', values: ['Yes', 'Yes', 'Yes'] },
      { feature: 'Camp and awareness campaigns', values: ['Not included', 'Yes', 'Yes'] },
      { feature: 'Reviews', values: ['Replies', 'Replies, QR, report', 'Replies, QR, report'] },
      { feature: 'Blogs a month', values: ['Not included', '2', '4, on 25+ sites'] },
      { feature: 'Website included', values: ['Static', 'Static + admin dashboard', 'Professional website'] },
      { feature: 'Local SEO, backlinks, profile upkeep', values: ['Not included', 'Not included', 'Included'] },
      { feature: 'Report', values: ['Monthly', 'Monthly + review call', 'Monthly + rankings'] },
    ],
    prices: [
      {
        label: '3-Month Plan, paid once',
        serviceSlug: THREE_MONTH,
        cells: [{ priceLabel: 'Basic 3-Month Plan' }, { priceLabel: 'Professional 3-Month Plan' }, { priceLabel: 'Premium 3-Month Plan, with Local SEO' }],
      },
      {
        label: 'Partner Plan, monthly (6-month minimum)',
        serviceSlug: SOCIAL,
        cells: [{ priceLabel: 'Basic Partner Plan' }, { priceLabel: 'Professional Partner Plan' }, { priceLabel: 'Premium Partner Plan, with Local SEO' }],
      },
    ],
    notes: [
      'The 3-Month Plan gives the same services as the matching Partner plan, paid once. After 3 months, every login, file and admin access is handed back to you, and you can move to the Partner Plan at any time.',
      'The Partner Plan runs for a minimum of 6 months, then month to month with one month’s notice. The website is free, the price is locked for 12 months, and you get a free re-audit every quarter.',
      'Domain and hosting are bought and owned by you; we build the website and connect it.',
      'Every plan includes an NMC check on each post and approval on WhatsApp. GST at 18% is extra.',
      'Prices shown are standard rates. Your final fee is agreed after an initial consultation and may vary with the scope of your practice.',
    ],
  },
  audit: {
    serviceSlug: 'digital-presence-audit',
    priceLabel: 'Digital presence audit',
    intro: 'A written audit file for your hospital or clinic before you commit to any plan.',
    areas: [
      { title: 'Social media profiles', detail: 'Instagram, Facebook, YouTube, LinkedIn and X: activity, branding and bio.' },
      { title: 'Website', detail: 'Mobile view, speed, and the path to call or book.' },
      { title: 'Google reviews', detail: 'Rating, replies and recent feedback.' },
      { title: 'Google Business Profile', detail: 'Address, timings, photos and category.' },
      { title: 'NMC compliance', detail: 'Existing posts checked against the advertising guidelines.' },
    ],
    fileShows: [
      'A score out of 10 for each area, with screenshots of what patients see today',
      'The main problems: inactive pages, few reviews, wrong timings, compliance risks',
      'What each gap costs you: missed searches, lost trust and NMC risk',
      'Free quick wins for this week',
      'Your 90-day roadmap, with exact costing',
    ],
    note: 'Join a plan within 7 days of receiving your audit and its fee is adjusted against your first invoice. Just want advice? A 30-minute consultation is free.',
  },
  firstMonths: [
    {
      month: 'Month 1',
      title: 'Foundation',
      items: ['Quick wins from your audit', '5 profiles set up with a brand kit', 'Website designed and live', 'Google profile corrected', 'Festival calendar approved', 'First shoot at your hospital'],
    },
    {
      month: 'Month 2',
      title: 'Consistency',
      items: ['Regular posts, reels and carousels', 'Camp and seasonal campaigns', 'Feedback QR and review replies live', 'Daily replies to comments and messages', 'Blogs start (Professional and Premium)', 'Second shoot at your hospital'],
    },
    {
      month: 'Month 3',
      title: 'Momentum',
      items: ['Content tuned from results', 'More doctor and department pages', 'Third shoot at your hospital', 'Re-audit: your score against day one', 'Quarterly results report', 'Handover, or plan the next quarter'],
    },
  ],
  byDay90:
    'By day 90 on the Professional plan: 36 posts, 12 reels, 15 carousels, 45 stories, 6 blogs, 3 shoots and your website live. Premium adds Local SEO, 12 blogs and a monthly ranking report.',
  promises: [
    { title: 'Real shoots at your hospital', detail: 'Your facility, team and health talks on camera, not stock photos or AI.' },
    { title: 'Scripted, edited reels', detail: 'Hooks, scripts, voice-over and editing on every reel.' },
    { title: 'You approve everything', detail: 'Nothing goes live until you say yes on WhatsApp.' },
    { title: 'Monthly report', detail: 'Reach, followers and reviews every month, plus rankings on Premium.' },
    { title: 'One point of contact', detail: 'A dedicated account manager, a WhatsApp approval group and, on Professional and Premium, a monthly 30-minute review call.' },
    { title: 'You own it all', detail: 'Domain, accounts, designs and footage stay yours, and are handed over if you leave.' },
  ],
  compliance: {
    intro:
      'The National Medical Commission’s Guidelines on Ethical Advertising and Public Communication cover websites, social media, WhatsApp, influencers and AI-generated content. We check every post against them before it reaches you for approval.',
    rules: [
      'The doctor’s name, qualification and registration number on every post',
      'No patient testimonials, and no before-and-after photos, even with consent',
      'No bought or manipulated reviews, ratings, followers or likes',
      '“Best”, “No. 1” and “leading” only when objectively verifiable',
      'AI-generated promotional content follows the same rules',
      'Using an agency does not shift responsibility: content a doctor approves is the doctor’s',
    ],
  },
  accountAccess: {
    intro: 'Every client signs a Client Account Access and Credential Security Agreement with us. In short:',
    points: [
      'Delegated access first: you add us as a partner, manager or editor, and each team member logs in as themselves',
      'A password only when a platform gives no other way, shared through an encrypted password manager, never by WhatsApp, email or screenshot',
      'Two-factor authentication stays on, and recovery email and phone stay yours',
      'Only named team members get access; you are told within two business days of any change',
      'If something goes wrong, we alert you within 6 hours and send a written report within 72 hours',
      'When the work ends, we remove our access and delete any credentials within 48 hours, and confirm it in writing',
      'We never lock, withhold or take over an account, page or domain, even in a fee dispute',
    ],
  },
  terms: [
    { title: 'Payment', detail: 'The 3-Month Plan is paid in full before work starts. The Partner Plan is billed monthly in advance, due by the 5th. GST at 18% is extra.' },
    { title: 'Refunds', detail: 'The 3-Month Plan is fully refundable until work starts, and not after. A Partner Plan month that has started is not refunded. Add-ons are refundable until work on them starts.' },
    {
      title: 'Pause or stop',
      detail:
        'The Partner Plan runs for a minimum of 6 months, then month to month. To pause (up to 2 months a year) or stop, give one month’s written notice and pay for that month. Stopping before 6 months makes the website fee payable.',
    },
    { title: 'Revisions', detail: 'One round of changes per post or reel is included. Extra rounds are ₹299 per post and ₹799 per reel.' },
    {
      title: 'Shoots',
      detail: 'As per your plan (every 3 months on Basic, monthly on Professional and Premium), about 2 hours each. Outstation travel is charged at cost; please give 24 hours’ notice to reschedule.',
    },
    { title: 'If we fall short', detail: 'If we miss agreed monthly deliverables through our own fault, we make them up the next month or credit their value against your next invoice.' },
  ],
  termsNote: 'Your signed proposal sets out your plan, price and deliverables. Our Terms & Conditions, Refund, Pause & Cancellation Policy and Credential Security Agreement come with it.',
};
