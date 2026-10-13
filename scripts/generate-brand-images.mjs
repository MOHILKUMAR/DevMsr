#!/usr/bin/env node
/**
 * Renders the social preview image and app icons from HTML with Playwright,
 * using the same brand mark, colours and fonts as the site.
 *
 *   npm run build   # downloads fonts into .astro/fonts
 *   node scripts/generate-brand-images.mjs
 *
 * Writes public/og-default.png, apple-touch-icon.png, icon-512.png, favicon.ico.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { fontFaces as loadFontFaces, mark } from './lib/brand.mjs';

const root = process.cwd();
const fontFaces = loadFontFaces(root);

const og = `<!doctype html><html><head><style>${fontFaces}
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #F7F7F4; color: #222522; font-family: Geist, sans-serif; position: relative; overflow: hidden; }
.wrap { position: absolute; inset: 64px 72px; display: flex; flex-direction: column; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 16px; font-family: Newsreader, serif; font-size: 40px; font-weight: 520; letter-spacing: -0.02em; }
.brand span { color: #63675F; }
h1 { font-family: Newsreader, serif; font-weight: 400; font-size: 76px; line-height: 1.02; letter-spacing: -0.028em; max-width: 860px; }
h1 em { color: #5F6749; }
.foot { display: flex; justify-content: space-between; align-items: flex-end; font-size: 24px; color: #63675F; }
.tags { font-family: GeistMono, monospace; font-size: 18px; letter-spacing: 0.08em; text-transform: uppercase; }
.block { position: absolute; right: -60px; top: -60px; width: 300px; height: 300px; border-radius: 48px; border: 2px solid #D6D7CF; }
.block2 { position: absolute; right: 90px; top: 150px; width: 120px; height: 120px; border-radius: 22px; background: #B96545; }
</style></head><body>
<div class="block"></div><div class="block2"></div>
<div class="wrap">
  <div class="brand">${mark(40)}<div>DevMsr<span>.in</span></div></div>
  <h1>Digital solutions that help your business <em>grow.</em></h1>
  <div class="foot"><div class="tags">Websites · Business software · Automation</div><div>Indicative prices in INR</div></div>
</div></body></html>`;

const icon = (size, padding) => `<!doctype html><html><head><style>
* { margin: 0; } body { width: ${size}px; height: ${size}px; background: #F7F7F4; display: grid; place-items: center; }
</style></head><body>${mark(size - padding * 2)}</body></html>`;

/** Wraps a PNG in a single-image ICO container (PNG-in-ICO is supported by all current browsers). */
function pngToIco(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  header.writeUInt8(size >= 256 ? 0 : size, 6);
  header.writeUInt8(size >= 256 ? 0 : size, 7);
  header.writeUInt8(0, 8); // palette
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18); // offset
  return Buffer.concat([header, png]);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const shoot = async (html, width, height) => {
    await page.setViewportSize({ width, height });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } });
  };

  writeFileSync(join(root, 'public', 'og-default.png'), await shoot(og, 1200, 630));
  writeFileSync(join(root, 'public', 'apple-touch-icon.png'), await shoot(icon(180, 28), 180, 180));
  writeFileSync(join(root, 'public', 'icon-512.png'), await shoot(icon(512, 72), 512, 512));
  writeFileSync(join(root, 'public', 'favicon.ico'), pngToIco(await shoot(icon(32, 3), 32, 32), 32));
  console.log('Wrote og-default.png, apple-touch-icon.png, icon-512.png, favicon.ico');
} finally {
  await browser.close();
}
