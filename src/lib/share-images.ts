import { SHARE_IMAGES } from '../data/share-images';

/**
 * The share image (Open Graph / Twitter card) for a page: its own card when
 * one was generated (scripts/generate-share-images.ts), otherwise its
 * section's card for products, portfolio projects and blog posts (whose
 * details the admin can change), otherwise the general site image.
 */
export interface ShareImage {
  url: string;
  alt: string;
  /** Set for our generated 1200×630 images; unknown for uploaded covers. */
  width?: number;
  height?: number;
}

const SECTIONS = ['/products', '/portfolio', '/blog'];
export const DEFAULT_SHARE_IMAGE: ShareImage = {
  url: '/og-default.png',
  alt: 'DevMsr.in: websites, business software and automation',
  width: 1200,
  height: 630,
};

export function shareImageFor(path: string): ShareImage {
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const own = SHARE_IMAGES[clean];
  if (own) return { ...own, width: 1200, height: 630 };
  const section = SECTIONS.find((prefix) => clean.startsWith(`${prefix}/`));
  const fallback = section ? SHARE_IMAGES[section] : undefined;
  return fallback ? { ...fallback, width: 1200, height: 630 } : DEFAULT_SHARE_IMAGE;
}
