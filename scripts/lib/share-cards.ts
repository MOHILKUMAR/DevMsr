/**
 * The share-image cards: which pages get one and the text on each. Shared by
 * scripts/generate-share-images.ts (renders them) and the unit tests (which
 * fail if card text changed without regenerating the images).
 */
import { createHash } from 'node:crypto';
import { INDUSTRY_CONTENT } from '../../src/data/industries.ts';
import { SERVICE_CATEGORY_CONTENT } from '../../src/data/service-categories.ts';
import { BLOG_SEED } from '../../src/data/seed/content.ts';
import { MILESTONES } from '../../src/data/payment-terms.ts';

export interface Card {
  path: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export const PLACE = 'Gurugram · Delhi NCR · India';

export const SHARE_CARDS: Card[] = [
  { path: '/', eyebrow: 'Websites · Business software · Automation', title: 'Digital solutions that help your business grow.', subtitle: 'Indicative prices in INR, written scopes, no surprises.' },
  { path: '/industries', eyebrow: 'Industries', title: 'Websites and software for six industries.', subtitle: 'Healthcare, hotels, restaurants, retail, travel and schools.' },
  { path: '/services', eyebrow: 'Services', title: 'Websites, business software, automation and support.', subtitle: 'Every service in one list, with indicative prices.' },
  { path: '/pricing', eyebrow: 'Pricing', title: 'Indicative pricing, in rupees.', subtitle: 'Starting estimates for every service. GST extra.' },
  {
    path: '/payments',
    eyebrow: 'Payments',
    title: 'How payments work.',
    subtitle: MILESTONES.map((milestone) => `${milestone.percent}% ${milestone.example}`).join(' · '),
  },
  { path: '/products', eyebrow: 'Products', title: 'Products and systems, with honest labels.', subtitle: 'Each one marked Available, Demo, In development or Concept.' },
  { path: '/portfolio', eyebrow: 'Portfolio', title: 'Websites and software we have built.', subtitle: 'Each project labelled client work, internal project or prototype.' },
  { path: '/about', eyebrow: 'About', title: 'We build the software small and growing businesses run on.', subtitle: 'Based in Gurugram, working across Delhi NCR and India.' },
  { path: '/contact', eyebrow: 'Contact', title: 'Talk to DevMsr.in about your project.', subtitle: 'Call, WhatsApp, email or send the form.' },
  { path: '/request-quote', eyebrow: 'Request a quote', title: 'Get a written scope and one clear figure.', subtitle: 'Nothing is billed until you approve the scope.' },
  { path: '/book-a-demo', eyebrow: 'Book a demo', title: 'See what exists, and what would be built for you.', subtitle: 'Clinics, hotels, restaurants, stores, travel agencies and schools.' },
  { path: '/blog', eyebrow: 'Blog', title: 'Notes on business software, pricing and automation.' },
  { path: '/privacy', eyebrow: 'Privacy policy', title: 'What we collect, why, and the choices you have.' },
  { path: '/terms', eyebrow: 'Terms of use', title: 'How to read the prices, products and information on this site.' },
  ...INDUSTRY_CONTENT.map((industry) => ({ path: `/industries/${industry.slug}`, eyebrow: industry.name, title: industry.heroTitle, subtitle: industry.seoTitle })),
  ...SERVICE_CATEGORY_CONTENT.map((category) => ({ path: `/services/${category.slug}`, eyebrow: category.name, title: category.tagline, subtitle: category.seoTitle })),
  ...BLOG_SEED.filter((post) => post.status === 'published').map((post) => ({ path: `/blog/${post.slug}`, eyebrow: 'Blog', title: post.title, subtitle: post.excerpt })),
];

/** File name without the hash, e.g. "industries-healthcare". */
export const fileStem = (path: string) => (path === '/' ? 'home' : path.slice(1).replace(/\//g, '-'));
export const hashOf = (card: Card) => createHash('sha256').update(JSON.stringify(card)).digest('hex').slice(0, 8);
