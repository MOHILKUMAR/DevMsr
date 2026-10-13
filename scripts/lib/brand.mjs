/**
 * Brand pieces shared by the image scripts: the site's fonts (inlined from
 * the build) and the four-square mark. Colours match the light theme.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const COLOURS = { bg: '#F7F7F4', ink: '#222522', muted: '#63675F', olive: '#5F6749', clay: '#B96545', line: '#D6D7CF' };

/** @font-face rules for Newsreader, Geist and Geist Mono, read from .astro/fonts (run `npm run build` first). */
export function fontFaces(root = process.cwd()) {
  const fontsDir = join(root, '.astro', 'fonts');
  const fontFile = (prefix) => {
    const name = readdirSync(fontsDir).find((file) => file.startsWith(prefix));
    if (!name) throw new Error(`Font ${prefix} not found — run npm run build first.`);
    // Inlined as a data URL: pages created with setContent cannot load file:// URLs.
    return `data:font/woff2;base64,${readFileSync(join(fontsDir, name)).toString('base64')}`;
  };
  return `
@font-face { font-family: Newsreader; src: url(${fontFile('font-newsreader-200-800-normal')}) format('woff2'); font-weight: 200 800; }
@font-face { font-family: Newsreader; font-style: italic; src: url(${fontFile('font-newsreader-200-800-italic')}) format('woff2'); font-weight: 200 800; }
@font-face { font-family: Geist; src: url(${fontFile('font-geist-100-900')}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: GeistMono; src: url(${fontFile('font-geist-mono-100-900')}) format('woff2'); font-weight: 100 900; }
`;
}

/** The four-square brand mark as inline SVG. */
export const mark = (size) => `
<svg viewBox="0 0 24 24" width="${size}" height="${size}">
  <rect x="2" y="2" width="9" height="9" rx="1.5" fill="${COLOURS.ink}"/>
  <rect x="13" y="2" width="9" height="9" rx="1.5" fill="${COLOURS.ink}" opacity="0.22"/>
  <rect x="2" y="13" width="9" height="9" rx="1.5" fill="${COLOURS.ink}" opacity="0.22"/>
  <rect x="13" y="13" width="9" height="9" rx="1.5" fill="${COLOURS.clay}"/>
</svg>`;
