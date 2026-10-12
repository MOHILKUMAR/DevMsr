/**
 * Exact money handling.
 *
 * Amounts travel as decimal strings ("25000", "1500.50") straight from
 * PostgreSQL `numeric` columns. We never convert them to JavaScript numbers;
 * formatting and comparison use string/BigInt arithmetic on paise.
 */

const DECIMAL_PATTERN = /^(\d{1,12})(?:\.(\d{1,2}))?$/;

/** True for a non-negative amount with at most 12 integer and 2 decimal digits. */
export function isValidAmount(value: string): boolean {
  return DECIMAL_PATTERN.test(value.trim());
}

/** Parses "1234.5" into 123450n paise. Throws on invalid input. */
export function toPaise(value: string): bigint {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) throw new RangeError(`Invalid amount: ${value}`);
  const rupees = match[1] ?? '0';
  const fraction = (match[2] ?? '').padEnd(2, '0');
  return BigInt(rupees) * 100n + BigInt(fraction);
}

/** Normalises an amount to the canonical "1234.50" form used in the database. */
export function normaliseAmount(value: string): string {
  const paise = toPaise(value);
  const rupees = paise / 100n;
  const fraction = (paise % 100n).toString().padStart(2, '0');
  return `${rupees.toString()}.${fraction}`;
}

export function compareAmounts(a: string, b: string): -1 | 0 | 1 {
  const pa = toPaise(a);
  const pb = toPaise(b);
  return pa === pb ? 0 : pa < pb ? -1 : 1;
}

/** Groups an integer string in the Indian system: 1234567 → 12,34,567. */
function groupIndian(integer: string): string {
  if (integer.length <= 3) return integer;
  const lastThree = integer.slice(-3);
  const rest = integer.slice(0, -3);
  const restGrouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${restGrouped},${lastThree}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * Formats an amount for display, e.g. formatAmount("100000") → "₹1,00,000".
 * Paise are shown only when non-zero.
 */
export function formatAmount(value: string, currency = 'INR'): string {
  const paise = toPaise(value);
  const rupees = (paise / 100n).toString();
  const fraction = paise % 100n;
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const grouped = currency === 'INR' ? groupIndian(rupees) : rupees.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decimals = fraction === 0n ? '' : `.${fraction.toString().padStart(2, '0')}`;
  return `${symbol}${grouped}${decimals}`;
}
