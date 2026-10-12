import { escapeHtml } from '../content/markdown';

/**
 * Email templates. Every visitor-supplied value is HTML-escaped; plain-text
 * versions are always included.
 */

export interface LeadEmailData {
  reference: string;
  formType: 'contact' | 'quote' | 'demo';
  name: string;
  email: string;
  businessName?: string | undefined;
  phone?: string | undefined;
  industry: string;
  interest: string;
  budget?: string | undefined;
  timeline?: string | undefined;
  preferredContact?: string | undefined;
  websiteUrl?: string | undefined;
  consultationTime?: string | undefined;
  projectDescription: string;
  adminUrl: string;
}

const FORM_LABEL = { contact: 'Contact message', quote: 'Quote request', demo: 'Demo request' } as const;

function row(label: string, value: string | undefined): { html: string; text: string } {
  if (!value) return { html: '', text: '' };
  return {
    html: `<tr><td style="padding:6px 16px 6px 0;color:#63675f;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 0;color:#222522">${escapeHtml(value)}</td></tr>`,
    text: `${label}: ${value}\n`,
  };
}

function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f7f7f4;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e8e2;border-radius:12px">
<tr><td style="padding:24px 28px 8px"><p style="margin:0;font-size:13px;color:#63675f;letter-spacing:.06em;text-transform:uppercase">DevMsr.in</p>
<h1 style="margin:8px 0 0;font-size:20px;font-weight:600;color:#222522">${escapeHtml(title)}</h1></td></tr>
<tr><td style="padding:12px 28px 28px">${body}</td></tr>
</table></td></tr></table></body></html>`;
}

export function ownerNotificationEmail(data: LeadEmailData): { subject: string; html: string; text: string } {
  const rows = [
    row('Reference', data.reference),
    row('Name', data.name),
    row('Email', data.email),
    row('Business', data.businessName),
    row('Phone', data.phone),
    row('Industry', data.industry),
    row('Interested in', data.interest),
    row('Budget', data.budget),
    row('Timeline', data.timeline),
    row('Prefers', data.preferredContact),
    row('Website', data.websiteUrl),
    row('Consultation time', data.consultationTime),
  ];
  const description = escapeHtml(data.projectDescription).replace(/\n/g, '<br>');
  const subject = `New ${FORM_LABEL[data.formType].toLowerCase()} ${data.reference} — ${data.name}`.slice(0, 180);
  const html = shell(
    `${FORM_LABEL[data.formType]} · ${data.reference}`,
    `<table role="presentation" cellpadding="0" cellspacing="0">${rows.map((r) => r.html).join('')}</table>
<p style="margin:20px 0 6px;color:#63675f">Project description</p>
<div style="padding:12px 14px;background:#f7f7f4;border-radius:8px;color:#222522">${description}</div>
<p style="margin:24px 0 0"><a href="${escapeHtml(data.adminUrl)}" style="display:inline-block;background:#222522;color:#f7f7f4;text-decoration:none;padding:10px 16px;border-radius:8px">Open in Lead Desk</a></p>`,
  );
  const text = `${FORM_LABEL[data.formType]} ${data.reference}\n\n${rows.map((r) => r.text).join('')}\nProject description:\n${data.projectDescription}\n\nOpen in Lead Desk: ${data.adminUrl}\n`;
  return { subject, html, text };
}

export function acknowledgementEmail(data: Pick<LeadEmailData, 'reference' | 'name' | 'formType'>): { subject: string; html: string; text: string } {
  const firstName = data.name.split(' ')[0] ?? data.name;
  const subject = `We received your ${FORM_LABEL[data.formType].toLowerCase()} (${data.reference})`;
  const html = shell(
    'Thank you — we have your request',
    `<p style="margin:0 0 12px;color:#222522">Hi ${escapeHtml(firstName)},</p>
<p style="margin:0 0 12px;color:#222522">We have received your ${escapeHtml(FORM_LABEL[data.formType].toLowerCase())}. Your reference number is <strong>${escapeHtml(data.reference)}</strong>.</p>
<p style="margin:0 0 12px;color:#222522">We will review it and get back to you using your preferred contact method. If anything needs clarifying, we will ask before preparing a quote.</p>
<p style="margin:0;color:#63675f;font-size:13px">Prices on our website are indicative and exclude GST unless stated. You received this email because you submitted a form on devmsr.in.</p>`,
  );
  const text = `Hi ${firstName},\n\nWe have received your ${FORM_LABEL[data.formType].toLowerCase()}. Your reference number is ${data.reference}.\n\nWe will review it and get back to you using your preferred contact method.\n\nYou received this email because you submitted a form on devmsr.in.\n`;
  return { subject, html, text };
}
