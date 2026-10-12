import { z } from 'zod';
import { isValidAmount, normaliseAmount } from '../utils/money';

/**
 * Helpers for parsing admin HTML forms. Values arrive as strings; these
 * schemas turn them into typed, validated values.
 */

/** FormData → plain object. Keys listed in `arrays` are read with getAll(). */
export function formToObject(formData: FormData, arrays: readonly string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith('$ACTION')) continue;
    if (arrays.includes(key)) {
      out[key] = formData.getAll(key).filter((value): value is string => typeof value === 'string');
    } else {
      const value = formData.get(key);
      if (typeof value === 'string') out[key] = value;
    }
  }
  for (const key of arrays) out[key] ??= [];
  return out;
}

export const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'Use at least 2 characters.')
  .max(100)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens, e.g. "hotel-website".');

export const requiredText = (max: number, min = 1) =>
  z
    .string()
    .trim()
    .min(min, min > 1 ? `Enter at least ${min} characters.` : 'This field is required.')
    .max(max, `Keep this under ${max} characters.`);

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((value) => (value ? value : null));

/** Checkbox: present ("on") → true, absent → false. */
export const checkbox = z
  .union([z.literal('on'), z.literal('true'), z.literal('false'), z.literal('')])
  .optional()
  .transform((value) => value === 'on' || value === 'true');

/** One item per line → trimmed, de-duplicated list. */
export const lines = (maxItems: number, maxLength: number) =>
  z
    .string()
    .optional()
    .transform((value) =>
      Array.from(
        new Set(
          (value ?? '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean),
        ),
      ),
    )
    .pipe(
      z
        .array(z.string().max(maxLength, `Each line must be under ${maxLength} characters.`))
        .max(maxItems, `Use at most ${maxItems} lines.`),
    );

export const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value ? value : null))
  .refine((value) => {
    if (value === null) return true;
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Enter a full https:// URL.');

export const httpsUrlLines = (maxItems: number) =>
  lines(maxItems, 500).refine(
    (urls) =>
      urls.every((url) => {
        try {
          return new URL(url).protocol === 'https:';
        } catch {
          return false;
        }
      }),
    'Each line must be a full https:// URL.',
  );

export const integerField = (min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : '0'))
    .pipe(z.string().regex(/^-?\d{1,6}$/, 'Enter a whole number.'))
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));

/**
 * Exact money input: "25000" or "25,000.50" → "25000.50" (string, never a float).
 * Validation runs in a pipe so the normalising transform only ever sees valid input.
 */
export const amountField = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value.replace(/,/g, '') : null))
  .pipe(
    z
      .string()
      .refine(isValidAmount, 'Enter an amount like 25000 or 25000.50 (no currency symbol).')
      .transform(normaliseAmount)
      .nullable(),
  );

export const uuidField = z.uuid('Invalid record id.');
export const optionalUuid = z
  .string()
  .optional()
  .transform((value) => (value ? value : null))
  .pipe(z.uuid('Invalid id.').nullable());
