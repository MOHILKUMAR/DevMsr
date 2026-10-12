export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_META: Record<LeadStatus, { label: string; tone: 'info' | 'warning' | 'olive' | 'clay' | 'success' | 'neutral' }> = {
  new: { label: 'New', tone: 'info' },
  contacted: { label: 'Contacted', tone: 'warning' },
  qualified: { label: 'Qualified', tone: 'olive' },
  proposal_sent: { label: 'Proposal Sent', tone: 'clay' },
  won: { label: 'Won', tone: 'success' },
  lost: { label: 'Lost', tone: 'neutral' },
};

export const FORM_TYPE_LABELS = { contact: 'Contact', quote: 'Quote', demo: 'Demo' } as const;
