import { defineAction } from 'astro:actions';
import { processLeadSubmission } from '../lib/leads/service';
import { admin } from './admin';

/**
 * Astro Actions. Each action is a public POST endpoint (/_actions/<name>),
 * so every handler validates input on the server and admin actions check
 * authorisation themselves (see ./admin).
 *
 * Lead submission has no `input` schema on purpose: it receives the raw
 * FormData and runs the full pipeline in src/lib/leads/submit.ts, returning
 * a typed outcome for both JavaScript and no-JavaScript form posts.
 */
export const server = {
  leads: {
    submit: defineAction({
      accept: 'form',
      handler: async (formData: FormData, context) => processLeadSubmission(formData, context),
    }),
  },
  admin,
};
