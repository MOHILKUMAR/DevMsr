import { useEffect, useId, useMemo, useState, type ChangeEvent } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { PRICE_BANDS, priceMatchesBand, type PriceBandId } from '../../lib/catalogue/pricing';
import type { BillingInterval, PricingModel, ServiceStatus } from '../../types/catalogue';
import { FILL_LAST_2_3 } from '../../lib/utils/grid';

/**
 * Filterable list of services or prices.
 *
 * Progressive enhancement: the controls live in a GET form, so without
 * JavaScript the server renders the filtered list from the query string.
 * With JavaScript, filtering is instant and the URL is kept in sync so a
 * filtered view can be shared.
 */

export interface ExplorerService {
  slug: string;
  name: string;
  shortDescription: string;
  category: string;
  industrySlugs: string[];
  status: ServiceStatus;
  fromPrice: string | null;
}

export interface ExplorerPrice {
  id: string;
  label: string;
  serviceSlug: string;
  group: string;
  formatted: string;
  pricingModel: PricingModel;
  minimumAmount: string | null;
  maximumAmount: string | null;
  maxOpenEnded: boolean;
  billingInterval: BillingInterval;
  currency: string;
  note: string | null;
  included: string[];
  excluded: string[];
  taxInclusive: boolean;
  estimatedDelivery: string | null;
  category: string;
  industrySlugs: string[];
}

export interface ExplorerFilters {
  q: string;
  industry: string;
  category: string;
  budget: string;
  billing: string;
}

interface Option {
  value: string;
  label: string;
}

interface CommonProps {
  industries: Option[];
  categories: Option[];
  initialFilters: ExplorerFilters;
  action: string;
}

type Props =
  | (CommonProps & { mode: 'services'; services: ExplorerService[] })
  | (CommonProps & { mode: 'pricing'; prices: ExplorerPrice[]; groups: Option[] });

const EMPTY: ExplorerFilters = { q: '', industry: '', category: '', budget: '', billing: '' };

function normalise(text: string): string {
  return text.toLowerCase().normalize('NFKD');
}

function matchesText(query: string, ...fields: string[]): boolean {
  if (!query) return true;
  const haystack = normalise(fields.join(' '));
  return normalise(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function Select(props: { id: string; name: keyof ExplorerFilters; label: string; value: string; options: Option[]; allLabel: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void }) {
  return (
    <div className="min-w-0">
      <label htmlFor={props.id} className="mb-1.5 block text-sm font-medium text-ink">
        {props.label}
      </label>
      <div className="relative">
        <select id={props.id} name={props.name} value={props.value} onChange={props.onChange} className="field appearance-none pr-9">
          <option value="">{props.allLabel}</option>
          {props.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" />
      </div>
    </div>
  );
}

export default function CatalogueExplorer(props: Props) {
  const [filters, setFilters] = useState<ExplorerFilters>(props.initialFilters);
  const ids = useId();
  const isPricing = props.mode === 'pricing';

  // Keep the URL in sync so filtered views are shareable.
  useEffect(() => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(filters)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, '', url);
  }, [filters]);

  const update = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const active = Object.values(filters).some(Boolean);

  const serviceResults = useMemo(() => {
    if (props.mode !== 'services') return [];
    return props.services.filter(
      (service) =>
        (!filters.industry || service.industrySlugs.includes(filters.industry)) &&
        (!filters.category || service.category === filters.category) &&
        matchesText(filters.q, service.name, service.shortDescription),
    );
  }, [props, filters]);

  const priceResults = useMemo(() => {
    if (props.mode !== 'pricing') return [];
    return props.prices.filter(
      (price) =>
        (!filters.industry || price.industrySlugs.includes(filters.industry)) &&
        (!filters.category || price.category === filters.category) &&
        (!filters.budget || priceMatchesBand(price, filters.budget as PriceBandId)) &&
        (!filters.billing || (filters.billing === 'recurring' ? price.billingInterval !== 'one_time' : price.billingInterval === 'one_time')) &&
        matchesText(filters.q, price.label, price.note ?? '', ...price.included),
    );
  }, [props, filters]);

  const count = isPricing ? priceResults.length : serviceResults.length;
  const categoryNames = useMemo(() => new Map(props.categories.map((c) => [c.value, c.label])), [props.categories]);

  return (
    <div>
      <form
        method="get"
        action={props.action}
        role="search"
        aria-label={isPricing ? 'Filter prices' : 'Filter services'}
        className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(auto-fit,minmax(10rem,1fr))] sm:p-5"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="min-w-0 sm:col-span-2 lg:col-span-1">
          <label htmlFor={`${ids}-q`} className="mb-1.5 block text-sm font-medium text-ink">
            Search
          </label>
          <div className="relative">
            <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              id={`${ids}-q`}
              name="q"
              type="search"
              value={filters.q}
              onChange={update}
              placeholder={isPricing ? 'e.g. POS, chatbot' : 'e.g. billing, booking'}
              className="field pl-9"
              autoComplete="off"
            />
          </div>
        </div>
        <Select id={`${ids}-industry`} name="industry" label="Industry" value={filters.industry} options={props.industries} allLabel="All industries" onChange={update} />
        <Select id={`${ids}-category`} name="category" label="Service type" value={filters.category} options={props.categories} allLabel="All types" onChange={update} />
        {isPricing && (
          <>
            <Select
              id={`${ids}-budget`}
              name="budget"
              label="Budget"
              value={filters.budget}
              options={PRICE_BANDS.map((band) => ({ value: band.id, label: band.label }))}
              allLabel="Any budget"
              onChange={update}
            />
            <Select
              id={`${ids}-billing`}
              name="billing"
              label="Billing"
              value={filters.billing}
              options={[
                { value: 'one_time', label: 'One-time' },
                { value: 'recurring', label: 'Monthly / recurring' },
              ]}
              allLabel="Any"
              onChange={update}
            />
          </>
        )}
        <noscript>
          <button type="submit" className="rounded-[var(--radius-control)] bg-invert px-4 py-2.5 font-medium text-invert-ink">
            Apply filters
          </button>
        </noscript>
      </form>

      <div className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted" aria-live="polite" aria-atomic="true">
          {count} {isPricing ? (count === 1 ? 'price' : 'prices') : count === 1 ? 'service' : 'services'}
          {active ? ' match your filters' : ''}
        </p>
        {active && (
          <button
            type="button"
            onClick={() => setFilters(EMPTY)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-ink hover:bg-bg-sunken"
          >
            <X aria-hidden="true" size={14} /> Clear filters
          </button>
        )}
      </div>

      {count === 0 && (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-12 text-center">
          <p className="font-medium text-ink">Nothing matches those filters.</p>
          <p className="mt-1 text-sm text-ink-muted">
            Try fewer filters, or{' '}
            <a className="link-olive" href="/request-quote">
              describe what you need
            </a>{' '}
            and we will tell you what it would cost.
          </p>
        </div>
      )}

      {props.mode === 'services' && count > 0 && (
        <ul className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {serviceResults.map((service) => (
            <li key={service.slug} className={`flex flex-col bg-surface p-5 ${FILL_LAST_2_3}`}>
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-muted">
                <a href={`/services/${service.category}`} className="hover:text-ink hover:underline">
                  {categoryNames.get(service.category) ?? service.category}
                </a>
              </p>
              <h3 className="mt-2 font-medium text-ink">{service.name}</h3>
              <p className="mt-1.5 flex-1 text-[0.9375rem] leading-relaxed text-ink-muted">{service.shortDescription}</p>
              <p className="mt-4 font-mono text-[0.8125rem] text-ink">
                {service.fromPrice ?? (service.status === 'on_request' ? 'Scoped on request' : 'Quoted per scope')}
              </p>
            </li>
          ))}
        </ul>
      )}

      {props.mode === 'pricing' && count > 0 && (
        <div className="space-y-12">
          {props.groups.map((group) => {
            const rows = priceResults.filter((price) => price.group === group.value);
            if (rows.length === 0) return null;
            return (
              <section key={group.value} aria-labelledby={`${ids}-${group.value}`}>
                <h2 id={`${ids}-${group.value}`} className="text-h3 mb-3">
                  {group.label}
                </h2>
                <ul className="border-t border-line">
                  {rows.map((price) => (
                    <li key={price.id} className="border-b border-line">
                      <details className="group">
                        <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-4 gap-y-1 py-4 [&::-webkit-details-marker]:hidden">
                          <span className="font-medium text-ink">{price.label}</span>
                          <span aria-hidden="true" className="hidden flex-1 border-b border-dotted border-line-strong sm:block" />
                          <span className="tabular ml-auto font-mono text-[0.875rem] text-ink">{price.formatted}</span>
                          <span className="w-full text-[0.8125rem] text-olive underline decoration-olive/40">
                            <span className="group-open:hidden">Details</span>
                            <span className="hidden group-open:inline">Hide details</span>
                          </span>
                        </summary>
                        <div className="grid gap-6 pb-6 text-[0.9375rem] sm:grid-cols-2">
                          {price.included.length > 0 && (
                            <div>
                              <p className="text-eyebrow mb-2">Included</p>
                              <ul className="space-y-1.5 text-ink">
                                {price.included.map((item) => (
                                  <li key={item} className="flex gap-2">
                                    <span aria-hidden="true" className="text-olive">
                                      +
                                    </span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {price.excluded.length > 0 && (
                            <div>
                              <p className="text-eyebrow mb-2">Not included</p>
                              <ul className="space-y-1.5 text-ink-muted">
                                {price.excluded.map((item) => (
                                  <li key={item} className="flex gap-2">
                                    <span aria-hidden="true">–</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="space-y-1 text-ink-muted sm:col-span-2">
                            {price.note && <p>{price.note}</p>}
                            <p>
                              {price.billingInterval === 'one_time' ? 'One-time fee' : price.billingInterval === 'monthly' ? 'Monthly fee' : 'Recurring fee'} ·{' '}
                              {price.taxInclusive ? 'Includes GST' : 'GST extra where applicable'} ·{' '}
                              {price.estimatedDelivery ? `Typical delivery: ${price.estimatedDelivery}` : 'Timeline confirmed in your quote'}
                            </p>
                            <p>
                              <a className="link-olive" href={`/request-quote?service=${price.serviceSlug}`}>
                                Request a quote for this
                              </a>
                            </p>
                          </div>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
