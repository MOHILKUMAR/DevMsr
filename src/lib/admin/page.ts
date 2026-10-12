import type { AdminResult } from './action';

/**
 * Helpers for admin pages handling form-action results with the
 * POST → redirect → GET pattern.
 */

export const NOTICES: Record<string, string> = {
  saved: 'Changes saved.',
  created: 'Created.',
  deleted: 'Deleted.',
  status: 'Status updated.',
  note: 'Note added.',
  followup: 'Follow-up updated.',
  contact: 'Contact details updated.',
  sent: 'Email sent.',
  shown: 'Now visible on the website.',
  hidden: 'Hidden from the website.',
};

type MaybeResult = { data?: AdminResult | undefined; error?: { message: string; code?: string } | undefined } | undefined;

export interface ActionOutcome {
  /** Set when an action succeeded: redirect here. */
  redirect?: string;
  /** Set when an action failed: show this message (and field errors). */
  failure?: { message: string; fieldErrors: Record<string, string>; values: Record<string, unknown> };
}

/**
 * Looks at the results of the actions a page can receive and decides what
 * to do. `onSuccess` builds the redirect URL from the successful result.
 */
export function outcomeOf(results: MaybeResult[], onSuccess: (result: Extract<AdminResult, { ok: true }>) => string): ActionOutcome {
  for (const result of results) {
    if (!result) continue;
    if (result.error) {
      return { failure: { message: result.error.code === 'UNAUTHORIZED' ? 'Your session has expired. Please sign in again.' : result.error.message, fieldErrors: {}, values: {} } };
    }
    if (result.data?.ok) return { redirect: onSuccess(result.data) };
    if (result.data) return { failure: { message: result.data.message, fieldErrors: result.data.fieldErrors ?? {}, values: result.data.values ?? {} } };
  }
  return {};
}

/** Appends extra query parameters to an action's form URL (keeps ?edit=… across a POST). */
export function formAction(queryString: string, params: Record<string, string | null | undefined> = {}): string {
  const search = new URLSearchParams(queryString.replace(/^\?/, ''));
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  return `?${search.toString()}`;
}

export function noticeText(url: URL): string | null {
  const key = url.searchParams.get('notice');
  return key ? (NOTICES[key] ?? null) : null;
}

export function linesOf(items: string[] | null | undefined): string {
  return (items ?? []).join('\n');
}

/**
 * Field value for an edit form: the submitted value after a failed save,
 * otherwise the stored value.
 */
export function draftValue(values: Record<string, unknown> | undefined, key: string, stored: string | number | null | undefined): string {
  const submitted = values?.[key];
  if (typeof submitted === 'string') return submitted;
  return stored === null || stored === undefined ? '' : String(stored);
}

export function draftChecked(values: Record<string, unknown> | undefined, key: string, stored: boolean): boolean {
  if (values && Object.keys(values).length > 0) return values[key] === 'on' || values[key] === 'true';
  return stored;
}

export function draftList(values: Record<string, unknown> | undefined, key: string, stored: string[]): string[] {
  const submitted = values?.[key];
  return Array.isArray(submitted) ? submitted.filter((item): item is string => typeof item === 'string') : stored;
}
