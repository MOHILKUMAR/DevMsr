import { Marked, type Tokens } from 'marked';

/**
 * Markdown → HTML for admin-authored content (blog posts, portfolio and
 * product descriptions).
 *
 * Safety model: raw HTML in the source is never passed through — it is
 * escaped and shown as text. Links and images are restricted to safe URL
 * schemes, so `javascript:` or `data:` URLs cannot be injected. Text content
 * is escaped by marked itself. The output therefore needs no separate DOM
 * sanitiser, which keeps the Worker bundle small.
 */

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

/** Allows http(s), mailto, tel, same-page anchors and site-relative paths. */
export function safeUrl(href: string, { allowMailto = true } = {}): string | null {
  const trimmed = href.trim();
  if (trimmed.startsWith('#')) return trimmed;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString();
    if (allowMailto && (url.protocol === 'mailto:' || url.protocol === 'tel:')) return trimmed;
  } catch {
    return null;
  }
  return null;
}

const marked = new Marked({
  gfm: true,
  breaks: false,
  async: false,
  renderer: {
    html({ text }: Tokens.HTML | Tokens.Tag) {
      return escapeHtml(text);
    },
    link({ href, title, tokens }: Tokens.Link) {
      const label = this.parser.parseInline(tokens);
      const url = safeUrl(href);
      if (!url) return label;
      const external = /^https?:\/\//.test(url) && !url.startsWith('https://devmsr.in');
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      const rel = external ? ' rel="noopener noreferrer nofollow" target="_blank"' : '';
      return `<a href="${escapeHtml(url)}"${titleAttr}${rel}>${label}</a>`;
    },
    image({ href, title, text }: Tokens.Image) {
      const url = safeUrl(href, { allowMailto: false });
      if (!url || !(url.startsWith('https://') || url.startsWith('/'))) return escapeHtml(text);
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      return `<img src="${escapeHtml(url)}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
    },
  },
});

export function renderMarkdown(source: string): string {
  return marked.parse(source, { async: false });
}

/** Rough reading time in minutes for article metadata. */
export function readingMinutes(source: string): number {
  const words = source.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
