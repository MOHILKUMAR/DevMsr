/**
 * Renders a 1200×630 share image (Open Graph / Twitter card) for each page,
 * in the site's brand style, with Playwright.
 *
 *   npm run build                 # fonts land in .astro/fonts
 *   npm run share-images:generate
 *
 * Writes public/og/<page>-<hash>.png and src/data/share-images.ts (the
 * manifest pages read). The hash comes from the card's text, so a changed
 * card gets a new URL and social apps fetch it instead of a cached copy.
 * Cards hold only text that lives in code (no prices, counts or product
 * statuses that the admin can change). Product, portfolio and blog pages
 * without their own card use their section's card (see src/lib/share-images.ts).
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { COLOURS, fontFaces as loadFontFaces, mark } from './lib/brand.mjs';
import { PLACE, SHARE_CARDS as cards, fileStem, hashOf, type Card } from './lib/share-cards.ts';

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const root = process.cwd();
const fonts = loadFontFaces(root);
const { bg, ink, muted, olive, clay, line } = COLOURS;

const html = (card: Card) => `<!doctype html><html><head><style>${fonts}
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: ${bg}; color: ${ink}; font-family: Geist, sans-serif; position: relative; overflow: hidden; }
.wrap { position: absolute; inset: 60px 72px 56px; display: flex; flex-direction: column; }
.brand { display: flex; align-items: center; gap: 14px; font-family: Newsreader, serif; font-size: 34px; font-weight: 520; letter-spacing: -0.02em; }
.brand span { color: ${muted}; }
.main { flex: 1; display: flex; flex-direction: column; justify-content: center; max-width: 900px; }
.eyebrow { font-family: GeistMono, monospace; font-size: 20px; letter-spacing: 0.1em; text-transform: uppercase; color: ${olive}; display: flex; align-items: center; gap: 12px; }
.eyebrow::before { content: ''; width: 10px; height: 10px; border-radius: 999px; background: ${clay}; }
h1 { margin-top: 22px; font-family: Newsreader, serif; font-weight: 400; font-size: 68px; line-height: 1.04; letter-spacing: -0.026em; max-height: 216px; overflow: hidden; }
.sub { margin-top: 22px; font-size: 26px; line-height: 1.35; color: ${muted}; max-height: 72px; overflow: hidden; }
.foot { display: flex; justify-content: space-between; align-items: flex-end; font-size: 22px; color: ${muted}; border-top: 2px solid ${line}; padding-top: 18px; }
.foot strong { color: ${ink}; font-weight: 500; }
.block { position: absolute; right: -70px; top: -70px; width: 260px; height: 260px; border-radius: 44px; border: 2px solid ${line}; }
.block2 { position: absolute; right: 70px; top: 110px; width: 84px; height: 84px; border-radius: 18px; background: ${clay}; }
</style></head><body>
<div class="block"></div><div class="block2"></div>
<div class="wrap">
  <div class="brand">${mark(34)}<div>DevMsr<span>.in</span></div></div>
  <div class="main">
    <p class="eyebrow">${escape(card.eyebrow)}</p>
    <h1 id="title">${escape(card.title)}</h1>
    ${card.subtitle ? `<p class="sub" id="sub">${escape(card.subtitle)}</p>` : ''}
  </div>
  <div class="foot"><div>${PLACE}</div><div><strong>devmsr.in</strong></div></div>
</div></body></html>`;

const outDir = join(root, 'public', 'og');
mkdirSync(outDir, { recursive: true });
const manifest: Record<string, { url: string; alt: string }> = {};
const written = new Set<string>();

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const card of cards) {
    await page.setContent(html(card), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    // Shrink long titles and subtitles until they fit their boxes.
    const fit = await page.evaluate(() => {
      const shrink = (id: string, min: number) => {
        const el = document.getElementById(id);
        if (!el) return true;
        let size = parseFloat(getComputedStyle(el).fontSize);
        while (el.scrollHeight > el.clientHeight + 1 && size > min) {
          size -= 2;
          el.style.fontSize = `${size}px`;
        }
        return el.scrollHeight <= el.clientHeight + 1;
      };
      return shrink('title', 44) && shrink('sub', 20);
    });
    if (!fit) throw new Error(`Text does not fit on the card for ${card.path}; shorten it.`);
    const name = `${fileStem(card.path)}-${hashOf(card)}.png`;
    writeFileSync(join(outDir, name), await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } }));
    written.add(name);
    manifest[card.path] = { url: `/og/${name}`, alt: `${card.eyebrow}: ${card.title}` };
  }
} finally {
  await browser.close();
}

// Remove cards from earlier runs that no longer match any page text.
for (const file of readdirSync(outDir)) if (!written.has(file)) rmSync(join(outDir, file));

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(
  join(root, 'src', 'data', 'share-images.ts'),
  `// Generated by scripts/generate-share-images.ts — do not edit by hand.\n// Run \`npm run share-images:generate\` after changing card text.\n\nexport const SHARE_IMAGES: Record<string, { url: string; alt: string }> = ${JSON.stringify(sorted, null, 2)};\n`,
);

const totalKb = [...written].reduce((sum, file) => sum + statSync(join(outDir, file)).size, 0) / 1024;
console.log(`Wrote ${written.size} share images (${Math.round(totalKb)} KB in total) and src/data/share-images.ts`);
