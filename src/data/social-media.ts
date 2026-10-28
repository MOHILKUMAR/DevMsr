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
      detail: 'Content that brings people to your camps and answers seasonal questions, reviewed by your doctor and kept factual.',
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
        'A feedback QR and WhatsApp link at reception, for every patient, not only the happy ones',
        'A monthly reputation report: rating trend, recurring complaints and what to fix at the front desk',
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
        '4 doctor-reviewed articles a month on the Growth plan, shared on 25+ platforms',
        'Each article reused as a carousel and a reel script',
        'A profile per doctor: qualification, specialty, registration number and OPD timings',
        'Google, Practo, Justdial and LinkedIn profiles kept accurate',
      ],
    },
  ],
  plans: {
    columns: [
      { name: 'Starter', summary: 'For a first online presence' },
      { name: 'Growth', summary: 'Website, social media and blogs', recommended: true },
      { name: 'Pro', summary: 'Everything in Starter, with Local SEO' },
    ],
    features: [
      { feature: 'Website, with hosting for year 1', values: ['Static, 5 pages', 'Premium, with admin panel', 'Premium, with admin panel'] },
      { feature: '5 social profiles and a brand kit', values: ['Yes', 'Yes', 'Yes'] },
      { feature: 'Posts, reels, carousels and stories', values: ['Yes', 'Yes', 'Yes'] },
      { feature: 'Monthly shoot at your hospital', values: ['Yes', 'Yes', 'Yes'] },
      { feature: 'Camp, festival and awareness posts', values: ['Yes', 'Yes', 'Yes'] },
      { feature: 'Review replies and feedback QR', values: ['Yes', 'Yes', 'Yes'] },
      { feature: 'Blogs a month', values: ['Add-on', '4, shared on 25+ sites', 'Part of Local SEO'] },
      { feature: 'Local SEO and backlinks', values: ['Add-on', 'Add-on', 'Included'] },
      { feature: 'Monthly report', values: ['Yes', 'Yes, with a review call', 'Yes, with rankings'] },
    ],
    prices: [
      {
        label: '3-Month Plan, paid once',
        serviceSlug: THREE_MONTH,
        cells: [{ priceLabel: 'Starter 3-Month Plan' }, { priceLabel: 'Growth 3-Month Plan' }, { text: 'Partner Plan only' }],
      },
      {
        label: '12-month Partner Plan',
        serviceSlug: SOCIAL,
        cells: [{ priceLabel: 'Starter Partner Plan' }, { priceLabel: 'Growth Partner Plan' }, { priceLabel: 'Pro Partner Plan, with Local SEO' }],
      },
    ],
    notes: [
      'The 3-Month Plan covers your website and 3 months of service in one payment, and you can move to the Partner Plan at any time.',
      'On the Partner Plan the website fee is waived, the price is locked for 12 months, and you get a free re-audit every quarter.',
      'Pro runs only on the Partner Plan, because SEO usually takes 4–12 months to show results.',
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
      'Your 3-month plan, with exact costing',
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
      items: ['Regular posts, reels and carousels', 'Camp and seasonal campaigns', 'Feedback QR and review replies live', 'Daily replies to comments and messages', 'Blogs start on the Growth plan', 'Second shoot at your hospital'],
    },
    {
      month: 'Month 3',
      title: 'Momentum',
      items: ['Content tuned from results', 'More doctor and department pages', 'Third shoot at your hospital', 'Re-audit: your score against day one', 'Quarterly results report', 'Plan for the next quarter'],
    },
  ],
  byDay90: 'By day 90: 36 posts, 12 reels, 15 carousels, 45 stories, 3 shoots and your website live. Growth adds 12 blogs; Pro adds Local SEO and a monthly ranking report.',
  promises: [
    { title: 'Real shoots at your hospital', detail: 'Your facility, team and health talks on camera, not stock photos or AI.' },
    { title: 'Scripted, edited reels', detail: 'Hooks, scripts, voice-over and editing on every reel.' },
    { title: 'You approve everything', detail: 'Nothing goes live until you say yes on WhatsApp.' },
    { title: 'Monthly report', detail: 'Reach, followers, reviews and rankings, every month, with a 30-minute review call.' },
    { title: 'One point of contact', detail: 'A dedicated account manager and a WhatsApp approval group.' },
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
        'Give one month’s written notice and pay for that month, during which services continue. Pause the Partner Plan for up to 2 months once a year. Stopping before 12 months makes the waived website fee payable.',
    },
    { title: 'Revisions', detail: 'One round of changes per post or reel is included. Extra rounds are ₹299 per post and ₹799 per reel.' },
    { title: 'Shoots', detail: 'One shoot a month at your hospital, about 2 hours. Outstation travel is charged at cost; rescheduling with less than 24 hours’ notice costs ₹1,500.' },
    { title: 'If we fall short', detail: 'If we miss agreed monthly deliverables through our own fault, we make them up the next month or credit their value against your next invoice.' },
  ],
  termsNote: 'Your signed proposal sets out your plan, price and deliverables. Our Terms & Conditions, Refund, Pause & Cancellation Policy and Credential Security Agreement come with it.',
};
