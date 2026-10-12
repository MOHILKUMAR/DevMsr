import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * WCAG 2.2 contrast checks computed from the real tokens in global.css,
 * for both themes. Text pairs need 4.5:1; UI boundaries need 3:1.
 */

const css = readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8');

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`selector not found: ${selector}`);
  const block = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1]!, m[2]!]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_PAIRS: [string, string][] = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink-muted', 'bg'],
  ['ink-muted', 'surface'],
  ['ink-muted', 'bg-sunken'],
  ['olive', 'bg'],
  ['olive', 'surface'],
  ['olive', 'olive-wash'],
  ['clay-ink', 'surface'],
  ['clay-ink', 'clay-soft'],
  ['invert-ink', 'invert-bg'],
  ['success', 'success-soft'],
  ['warning', 'warning-soft'],
  ['danger', 'danger-soft'],
  ['info', 'info-soft'],
];
const UI_PAIRS: [string, string][] = [
  ['field-line', 'surface'],
  ['focus', 'bg'],
];

describe.each([
  ['light', ':root {'],
  ['dark', ':root[data-theme="dark"] {'],
])('%s theme contrast', (_name, selector) => {
  const t = tokens(selector);
  it.each(TEXT_PAIRS)('%s on %s ≥ 4.5:1', (fg, bg) => {
    expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(UI_PAIRS)('%s on %s ≥ 3:1', (fg, bg) => {
    expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(3);
  });
});
