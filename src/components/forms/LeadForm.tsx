import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useForm, useWatch, type Control, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { actions } from 'astro:actions';
import { CircleCheck, CircleAlert, LoaderCircle, ChevronDown } from 'lucide-react';
import {
  BUDGET_RANGES,
  CONTACT_METHODS,
  TIMELINES,
  leadFieldsSchema,
  type LeadFields,
  type LeadFieldsInput,
  type LeadFormType,
} from '../../schemas/lead';
import type { SubmitOutcome } from '../../lib/leads/types';

interface Option {
  value: string;
  label: string;
}

export interface LeadFormProps {
  formType: LeadFormType;
  industries: Option[];
  interests: { label: string; options: Option[] }[];
  defaults: { industry?: string; interest?: string };
  submissionId: string;
  formToken: string;
  turnstileSiteKey: string | null;
  /** Fallback POST target for browsers without JavaScript. */
  actionUrl: string;
  sourcePath: string;
  /** Result of a no-JavaScript POST, rendered by the server. */
  initialOutcome?: SubmitOutcome | null;
  fallbackEmail?: string | null;
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

const COPY: Record<LeadFormType, { description: string; descriptionHint: string; submit: string }> = {
  contact: {
    description: 'How can we help?',
    descriptionHint: 'A few sentences is enough.',
    submit: 'Send message',
  },
  quote: {
    description: 'Describe your project',
    descriptionHint: 'What should it do, who will use it, and anything it must connect to. Rough is fine.',
    submit: 'Request a quote',
  },
  demo: {
    description: 'What would you like to see?',
    descriptionHint: 'Tell us about your business and what you want the demo to cover.',
    submit: 'Request a demo',
  },
};

const FIELD_ORDER: FieldPath<LeadFieldsInput>[] = [
  'name',
  'email',
  'businessName',
  'phone',
  'industry',
  'interest',
  'budgetRange',
  'timeline',
  'websiteUrl',
  'consultationTime',
  'preferredContact',
  'projectDescription',
  'privacyAcknowledged',
];

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  businessName: 'Business name',
  phone: 'Phone / WhatsApp',
  industry: 'Industry',
  interest: 'Interested in',
  budgetRange: 'Approximate budget',
  timeline: 'Timeline',
  websiteUrl: 'Existing website',
  consultationTime: 'Preferred consultation time',
  preferredContact: 'Preferred contact method',
  projectDescription: 'Description',
  privacyAcknowledged: 'Privacy acknowledgement',
};

function readAttribution(): Record<string, string> {
  const fields: Record<string, string> = {};
  try {
    const stored = JSON.parse(sessionStorage.getItem('devmsr-attribution') ?? '{}') as Record<string, unknown>;
    for (const key of ['utmSource', 'utmMedium', 'utmCampaign', 'referrer']) {
      const value = stored[key];
      if (typeof value === 'string') fields[key] = value;
    }
  } catch {
    /* storage unavailable */
  }
  return fields;
}

function Field(props: { id: string; label: string; required?: boolean; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={props.className}>
      <label htmlFor={props.id} className="mb-1.5 block text-[0.9375rem] font-medium text-ink">
        {props.label}
        {props.required ? <span className="font-normal text-ink-muted"> (required)</span> : <span className="font-normal text-ink-muted"> (optional)</span>}
      </label>
      {props.children}
      {props.hint && !props.error && (
        <p id={`${props.id}-hint`} className="mt-1.5 text-sm text-ink-muted">
          {props.hint}
        </p>
      )}
      {props.error && (
        <p id={`${props.id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
          <CircleAlert aria-hidden="true" size={15} className="mt-0.5 shrink-0" />
          {props.error}
        </p>
      )}
    </div>
  );
}

/** Character count for the description. Watches the field on its own, so typing does not re-render the whole form. */
function CharacterCount(props: { id: string; control: Control<LeadFieldsInput, unknown, LeadFields> }) {
  const value = useWatch({ control: props.control, name: 'projectDescription' }) ?? '';
  return (
    <p id={props.id} className="mt-1 text-right font-mono text-[0.75rem] text-ink-muted" aria-live="off">
      {value.length} / 5000
    </p>
  );
}

export default function LeadForm(props: LeadFormProps) {
  const ids = useId();
  const id = (name: string) => `${ids}-${name}`;
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const focusSummaryAfterSubmit = useRef(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [attribution, setAttribution] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(props.initialOutcome ?? null);
  const copy = COPY[props.formType];

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<LeadFieldsInput, unknown, LeadFields>({
    resolver: zodResolver(leadFieldsSchema),
    mode: 'onTouched',
    // Focus moves to the error summary instead (it links to each field).
    shouldFocusError: false,
    defaultValues: {
      formType: props.formType,
      industry: props.defaults.industry ?? '',
      interest: props.defaults.interest ?? '',
      preferredContact: 'email',
    },
  });

  // Until hydration, native HTML validation protects the no-JavaScript fallback.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    setAttribution(readAttribution());
  }, []);

  // Cloudflare Turnstile (only when configured).
  useEffect(() => {
    const siteKey = props.turnstileSiteKey;
    const container = turnstileRef.current;
    if (!siteKey || !container) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(container, {
        sitekey: siteKey,
        theme: 'auto',
        action: props.formType,
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      });
    };
    if (window.turnstile) render();
    else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
      const script = existing ?? document.createElement('script');
      if (!existing) {
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = '';
        document.head.appendChild(script);
      }
      script.addEventListener('load', render);
    }
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [props.turnstileSiteKey, props.formType]);

  // Move focus to the error summary or success message so screen-reader and keyboard users notice.
  useEffect(() => {
    if (outcome?.status === 'success') successRef.current?.focus();
    else if (outcome) summaryRef.current?.focus();
  }, [outcome]);
  // Once per submit attempt that fails validation. Not on every change: after a submit, fields
  // re-validate as you type, and refocusing then would pull focus out of the field being edited.
  useEffect(() => {
    if (!focusSummaryAfterSubmit.current) return;
    focusSummaryAfterSubmit.current = false;
    summaryRef.current?.focus();
  }, [submitCount]);

  const onInvalid = () => {
    // The summary renders with the new errors after this call, so the effect above focuses it.
    focusSummaryAfterSubmit.current = true;
  };

  const onValid = async () => {
    const form = formRef.current;
    if (!form) return;
    setOutcome(null);
    const data = new FormData(form);
    const { data: result, error } = await actions.leads.submit(data);
    if (error || !result) {
      setOutcome({ status: 'unavailable', message: 'Something went wrong while sending. Please try again.' });
      return;
    }
    if (result.status === 'invalid') {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        if (FIELD_ORDER.includes(field as FieldPath<LeadFieldsInput>)) setError(field as FieldPath<LeadFieldsInput>, { type: 'server', message });
      }
    }
    if (result.status !== 'success' && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      setTurnstileToken('');
    }
    setOutcome(result);
  };

  if (outcome?.status === 'success') {
    return (
      <div className="rounded-[var(--radius-card)] border border-success/30 bg-success-soft p-6 sm:p-8" role="status" aria-live="polite">
        <CircleCheck aria-hidden="true" size={28} className="text-success" />
        <h2 ref={successRef} tabIndex={-1} className="text-h3 mt-4 focus:outline-none">
          {outcome.duplicate ? 'We already have this request.' : 'Thank you — your request has been received.'}
        </h2>
        <p className="mt-3 text-ink">
          Your reference number is <strong className="font-mono">{outcome.reference}</strong>. Please keep it for any follow-up.
        </p>
        <p className="mt-2 text-ink-muted">We will review your request and contact you using your preferred method. If anything is unclear, we will ask before preparing a quote.</p>
        <p className="mt-6">
          <a className="link-olive" href="/">
            Back to the home page
          </a>
        </p>
      </div>
    );
  }

  const fieldErrorEntries = FIELD_ORDER.filter((name) => errors[name]?.message).map((name) => [name, errors[name]!.message as string] as const);
  const describedBy = (name: string, hint: boolean) => (errors[name as keyof typeof errors] ? `${id(name)}-error` : hint ? `${id(name)}-hint` : undefined);
  const invalid = (name: string) => (errors[name as keyof typeof errors] ? true : undefined);

  const showBudget = props.formType === 'quote';
  const showTimeline = props.formType === 'quote';
  const showWebsite = props.formType !== 'demo';
  const showConsultation = props.formType === 'demo';

  return (
    <form
      ref={formRef}
      method="POST"
      action={props.actionUrl}
      noValidate={hydrated}
      onSubmit={handleSubmit(onValid, onInvalid)}
      aria-describedby={`${id('required-note')}`}
      className="space-y-6"
    >
      {(fieldErrorEntries.length > 0 || outcome) && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-[var(--radius-card)] border border-danger/30 bg-danger-soft p-4 focus:outline-none">
          <p className="flex items-center gap-2 font-medium text-danger">
            <CircleAlert aria-hidden="true" size={18} />
            {outcome && outcome.status !== 'invalid' ? outcome.message : 'Please check the highlighted fields.'}
          </p>
          {fieldErrorEntries.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-ink">
              {fieldErrorEntries.map(([name, message]) => (
                <li key={name}>
                  <a className="underline" href={`#${id(name)}`}>
                    {FIELD_LABELS[name]}: {message}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p id={id('required-note')} className="text-sm text-ink-muted">
        Fields marked “required” must be filled in. Everything else is optional.
      </p>

      {/* Hidden fields: form type, anti-abuse and attribution. */}
      <input type="hidden" name="formType" value={props.formType} />
      <input type="hidden" name="submissionId" value={props.submissionId} />
      <input type="hidden" name="formToken" value={props.formToken} />
      <input type="hidden" name="turnstileToken" value={turnstileToken} />
      <input type="hidden" name="sourcePath" value={props.sourcePath} />
      {Object.entries(attribution).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id('company-website')}>Leave this field empty</label>
        <input id={id('company-website')} type="text" name="companyWebsite" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Your details</legend>
        <Field id={id('name')} label="Name" required error={errors.name?.message}>
          <input id={id('name')} type="text" autoComplete="name" required minLength={2} maxLength={120} className="field" aria-invalid={invalid('name')} aria-describedby={describedBy('name', false)} {...register('name')} />
        </Field>
        <Field id={id('email')} label="Email" required error={errors.email?.message}>
          <input id={id('email')} type="email" autoComplete="email" inputMode="email" required maxLength={254} className="field" aria-invalid={invalid('email')} aria-describedby={describedBy('email', false)} {...register('email')} />
        </Field>
        <Field id={id('businessName')} label="Business name" error={errors.businessName?.message}>
          <input id={id('businessName')} type="text" autoComplete="organization" className="field" aria-invalid={invalid('businessName')} aria-describedby={describedBy('businessName', false)} {...register('businessName')} />
        </Field>
        <Field id={id('phone')} label="Phone / WhatsApp" hint="Include the country code, e.g. +91." error={errors.phone?.message}>
          <input id={id('phone')} type="tel" autoComplete="tel" inputMode="tel" className="field" aria-invalid={invalid('phone')} aria-describedby={describedBy('phone', true)} {...register('phone')} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Your project</legend>
        <Field id={id('industry')} label="Industry" required error={errors.industry?.message}>
          <div className="relative">
            <select id={id('industry')} required defaultValue={props.defaults.industry ?? ''} className="field appearance-none pr-9" aria-invalid={invalid('industry')} aria-describedby={describedBy('industry', false)} {...register('industry')}>
              <option value="">Choose your industry</option>
              {props.industries.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              <option value="other">Other / not listed</option>
            </select>
            <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          </div>
        </Field>
        <Field id={id('interest')} label="Interested in" required error={errors.interest?.message}>
          <div className="relative">
            <select id={id('interest')} required defaultValue={props.defaults.interest ?? ''} className="field appearance-none pr-9" aria-invalid={invalid('interest')} aria-describedby={describedBy('interest', false)} {...register('interest')}>
              <option value="">Choose a service</option>
              {props.interests.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="not_sure">Not sure yet</option>
            </select>
            <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          </div>
        </Field>
        {showBudget && (
          <Field id={id('budgetRange')} label="Approximate budget" error={errors.budgetRange?.message}>
            <div className="relative">
              <select id={id('budgetRange')} className="field appearance-none pr-9" aria-invalid={invalid('budgetRange')} {...register('budgetRange')}>
                <option value="">Prefer not to say</option>
                {BUDGET_RANGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            </div>
          </Field>
        )}
        {showTimeline && (
          <Field id={id('timeline')} label="Timeline" error={errors.timeline?.message}>
            <div className="relative">
              <select id={id('timeline')} className="field appearance-none pr-9" aria-invalid={invalid('timeline')} {...register('timeline')}>
                <option value="">Not decided</option>
                {TIMELINES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            </div>
          </Field>
        )}
        {showWebsite && (
          <Field id={id('websiteUrl')} label="Existing website" hint="If you have one." error={errors.websiteUrl?.message}>
            <input id={id('websiteUrl')} type="url" inputMode="url" autoComplete="url" placeholder="example.com" className="field" aria-invalid={invalid('websiteUrl')} aria-describedby={describedBy('websiteUrl', true)} {...register('websiteUrl')} />
          </Field>
        )}
        {showConsultation && (
          <Field id={id('consultationTime')} label="Preferred consultation time" hint="e.g. Weekdays after 4 pm IST" error={errors.consultationTime?.message}>
            <input id={id('consultationTime')} type="text" className="field" aria-invalid={invalid('consultationTime')} aria-describedby={describedBy('consultationTime', true)} {...register('consultationTime')} />
          </Field>
        )}
        <Field id={id('preferredContact')} label="Preferred contact method" error={errors.preferredContact?.message}>
          <div className="relative">
            <select id={id('preferredContact')} defaultValue="email" className="field appearance-none pr-9" aria-invalid={invalid('preferredContact')} {...register('preferredContact')}>
              {CONTACT_METHODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          </div>
        </Field>
      </fieldset>

      <Field id={id('projectDescription')} label={copy.description} required hint={copy.descriptionHint} error={errors.projectDescription?.message}>
        <textarea
          id={id('projectDescription')}
          rows={6}
          className="field resize-y"
          aria-invalid={invalid('projectDescription')}
          aria-describedby={[describedBy('projectDescription', true), id('count')].filter(Boolean).join(' ')}
          required
          minLength={20}
          maxLength={5000}
          {...register('projectDescription')}
        />
        <CharacterCount id={id('count')} control={control} />
      </Field>

      <div>
        <div className="flex items-start gap-3">
          <input
            id={id('privacyAcknowledged')}
            type="checkbox"
            value="on"
            className="mt-1 size-4 shrink-0 accent-[var(--olive)]"
            aria-invalid={invalid('privacyAcknowledged')}
            aria-describedby={errors.privacyAcknowledged ? `${id('privacyAcknowledged')}-error` : undefined}
            aria-required="true"
            required
            {...register('privacyAcknowledged')}
          />
          <label htmlFor={id('privacyAcknowledged')} className="text-[0.9375rem] text-ink">
            I have read the{' '}
            <a href="/privacy" className="link-olive" target="_blank" rel="noopener">
              privacy policy
            </a>{' '}
            and agree to DevMsr.in storing these details to respond to my request. <span className="text-ink-muted">(required)</span>
          </label>
        </div>
        {errors.privacyAcknowledged?.message && (
          <p id={`${id('privacyAcknowledged')}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
            <CircleAlert aria-hidden="true" size={15} className="mt-0.5 shrink-0" />
            {errors.privacyAcknowledged.message}
          </p>
        )}
      </div>

      {props.turnstileSiteKey && (
        <div>
          <div ref={turnstileRef} />
          <noscript>
            <p className="text-sm text-ink-muted">
              This form needs JavaScript for spam protection.
              {props.fallbackEmail ? ` You can also email ${props.fallbackEmail}.` : ''}
            </p>
          </noscript>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-w-44 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-invert px-5 py-3 font-medium text-invert-ink transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
        >
          {isSubmitting && <LoaderCircle aria-hidden="true" size={17} className="animate-spin" />}
          {isSubmitting ? 'Sending…' : copy.submit}
        </button>
        <p className="text-sm text-ink-muted" aria-live="polite">
          {isSubmitting ? 'Sending your request securely…' : 'You will get a reference number straight away.'}
        </p>
      </div>
    </form>
  );
}
