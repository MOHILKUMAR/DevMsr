// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const submit = vi.hoisted(() => vi.fn());
vi.mock('astro:actions', () => ({ actions: { leads: { submit } } }));

import LeadForm, { type LeadFormProps } from '../../src/components/forms/LeadForm';

const props: LeadFormProps = {
  formType: 'quote',
  industries: [{ value: 'restaurants', label: 'Restaurants' }],
  interests: [{ label: 'Services', options: [{ value: 'category:pos-billing', label: 'POS & billing' }] }],
  defaults: {},
  submissionId: '7b0c4a3e-8f1d-4c7e-9a2b-1d2e3f4a5b6c',
  formToken: 'test-token',
  turnstileSiteKey: null,
  actionUrl: '?_action=leads.submit',
  sourcePath: '/request-quote',
};

const DESCRIPTION = 'We need a POS with KOT printing for two counters.';

function setup() {
  const user = userEvent.setup();
  render(<LeadForm {...props} />);
  return {
    user,
    submitButton: () => screen.getByRole('button', { name: 'Request a quote' }),
    summary: () => screen.getByRole('alert'),
    description: () => screen.getByLabelText(/^Describe your project/) as HTMLTextAreaElement,
    name: () => screen.getByLabelText(/^Name/) as HTMLInputElement,
    email: () => screen.getByLabelText(/^Email/) as HTMLInputElement,
  };
}

describe('LeadForm focus after a failed submit', () => {
  beforeEach(() => submit.mockReset());
  afterEach(cleanup);

  it('focuses the error summary once per submit and keeps focus in the field being typed in', async () => {
    const { user, submitButton, summary, description, name, email } = setup();

    await user.click(submitButton());
    await waitFor(() => expect(document.activeElement).toBe(summary()));

    // Typing in the description: the error stays until 20 characters and the counter re-renders on every key.
    await user.click(description());
    await user.keyboard('x'.repeat(30));
    expect(document.activeElement).toBe(description());
    expect(description().value).toBe('x'.repeat(30));
    expect(screen.getByText('30 / 5000')).toBeTruthy();

    // Clearing an error in another field does not move focus either.
    await user.click(name());
    await user.keyboard('Asha Rao');
    expect(document.activeElement).toBe(name());
    await user.click(email());
    await user.keyboard('asha@example.com');
    expect(document.activeElement).toBe(email());
    expect(email().value).toBe('asha@example.com');

    // A new submit attempt with errors left (industry, interest, privacy) focuses the summary again.
    await user.click(submitButton());
    await waitFor(() => expect(document.activeElement).toBe(summary()));
    expect(summary().textContent).toContain('Industry');
    expect(submit).not.toHaveBeenCalled();
  });

  it('still focuses the summary for a server "invalid" response and the heading on success', async () => {
    const { user, submitButton, summary, description, name, email } = setup();
    await user.type(name(), 'Asha Rao');
    await user.type(email(), 'asha@example.com');
    await user.selectOptions(screen.getByLabelText(/^Industry/), 'restaurants');
    await user.selectOptions(screen.getByLabelText(/^Interested in/), 'category:pos-billing');
    await user.type(description(), DESCRIPTION);
    await user.click(screen.getByRole('checkbox'));

    submit.mockResolvedValueOnce({ data: { status: 'invalid', fieldErrors: { email: 'Use an email address you can receive mail at.' }, message: 'Please check the highlighted fields.' } });
    await user.click(submitButton());
    await waitFor(() => expect(document.activeElement).toBe(summary()));
    expect(summary().textContent).toContain('Use an email address you can receive mail at.');

    // Correcting the field keeps focus there.
    await user.click(email());
    await user.keyboard('{Control>}a{/Control}asha.rao@example.com');
    expect(document.activeElement).toBe(email());

    submit.mockResolvedValueOnce({ data: { status: 'success', reference: 'DM-261013-ABC123', duplicate: false } });
    await user.click(submitButton());
    const heading = await screen.findByRole('heading', { name: /Thank you/ });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(submit).toHaveBeenCalledTimes(2);
  });
});

describe('LeadForm pre-fill from a "#" link', () => {
  afterEach(() => {
    cleanup();
    window.location.hash = '';
  });

  it('applies the choices after hydration, adding the selected service', async () => {
    window.location.hash = '#industry=restaurants&service=restaurant-pos-billing';
    const services = [{ slug: 'restaurant-pos-billing', name: 'Restaurant POS and billing', industry: 'restaurants' }];
    render(<LeadForm {...props} prefillOptions={{ industries: ['restaurants'], categories: ['pos-billing'], services }} />);
    const interest = screen.getByLabelText(/^Interested in/) as HTMLSelectElement;
    await waitFor(() => expect(interest.value).toBe('service:restaurant-pos-billing'));
    expect((screen.getByLabelText(/^Industry/) as HTMLSelectElement).value).toBe('restaurants');
    expect(screen.getByRole('option', { name: 'Restaurant POS and billing' })).toBeTruthy();
  });

  it('says which product a demo request is about', async () => {
    window.location.hash = '#product=trip-desk';
    const products = [{ slug: 'trip-desk', name: 'Trip Desk', industry: null, category: 'pos-billing' }];
    render(<LeadForm {...props} formType="demo" prefillOptions={{ industries: ['restaurants'], categories: ['pos-billing'], products }} />);
    await waitFor(() => expect(screen.getByText('Trip Desk')).toBeTruthy());
    expect((screen.getByLabelText(/^Interested in/) as HTMLSelectElement).value).toBe('category:pos-billing');
  });

  it('ignores a fragment that is not a pre-fill, such as a skip link', async () => {
    window.location.hash = '#main';
    render(<LeadForm {...props} prefillOptions={{ industries: ['restaurants'], categories: ['pos-billing'] }} />);
    await waitFor(() => expect(screen.getByLabelText(/^Industry/)).toBeTruthy());
    expect((screen.getByLabelText(/^Industry/) as HTMLSelectElement).value).toBe('');
  });
});
