import { defineAdminAction, check, type AdminResult } from '../lib/admin/action';
import {
  blogSchema,
  deleteSchema,
  faqSchema,
  industrySchema,
  leadContactSchema,
  leadDeleteSchema,
  leadFollowUpSchema,
  leadNoteSchema,
  leadStatusSchema,
  notificationRetrySchema,
  portfolioSchema,
  pricingSchema,
  productSchema,
  serviceSchema,
  settingsSchema,
  toggleSchema,
} from '../schemas/admin';
import { getServerConfig } from '../lib/server/config';
import { leadStoreFrom, notificationSettingsFrom } from '../lib/leads/service';
import { deliverLeadNotifications } from '../lib/leads/notifications';
import { BUDGET_RANGES, CONTACT_METHODS, TIMELINES } from '../schemas/lead';
import { getServiceCategoryContent } from '../data/service-categories';

/**
 * Admin mutations. Every action goes through defineAdminAction (auth,
 * role capability, Zod validation) and runs as the signed-in admin, so the
 * database's RLS policies are enforced as a second, independent check.
 */

const NOT_FOUND: AdminResult = { ok: false, message: 'Record not found, or you do not have permission to change it.' };

/** Rows returned by an update/delete; empty means RLS blocked it or the row is gone. */
function changed(rows: { id: string }[] | null): boolean {
  return Array.isArray(rows) && rows.length > 0;
}

// ── Leads ─────────────────────────────────────────────────────────────
const leads = {
  updateStatus: defineAdminAction({
    capability: 'leads',
    schema: leadStatusSchema,
    handler: async ({ id, status }, { db }) => {
      const rows = check(await db.from('leads').update({ status }).eq('id', id).select('id'));
      return changed(rows) ? { ok: true, message: 'Status updated.', id, notice: 'status' } : NOT_FOUND;
    },
  }),

  setFollowUp: defineAdminAction({
    capability: 'leads',
    schema: leadFollowUpSchema,
    handler: async ({ id, followUpDate }, { db }) => {
      const followUpAt = followUpDate ? new Date(`${followUpDate}T10:00:00+05:30`).toISOString() : null;
      const rows = check(await db.from('leads').update({ follow_up_at: followUpAt }).eq('id', id).select('id'));
      return changed(rows) ? { ok: true, message: followUpAt ? 'Follow-up date saved.' : 'Follow-up cleared.', id, notice: 'followup' } : NOT_FOUND;
    },
  }),

  addNote: defineAdminAction({
    capability: 'leads',
    schema: leadNoteSchema,
    handler: async ({ id, note }, { db, admin }) => {
      check(await db.from('lead_activities').insert({ lead_id: id, actor_id: admin.profileId, activity_type: 'note', description: note }));
      return { ok: true, message: 'Note added.', id, notice: 'note' };
    },
  }),

  updateContact: defineAdminAction({
    capability: 'leads',
    schema: leadContactSchema,
    handler: async ({ id, name, email, phone, businessName }, { db }) => {
      const rows = check(await db.from('leads').update({ name, email, phone, business_name: businessName }).eq('id', id).select('id'));
      return changed(rows) ? { ok: true, message: 'Contact details updated.', id, notice: 'contact' } : NOT_FOUND;
    },
  }),

  delete: defineAdminAction({
    capability: 'leads',
    schema: leadDeleteSchema,
    handler: async ({ id }, { db, admin }) => {
      if (admin.role !== 'owner') return { ok: false, message: 'Only the owner can permanently delete a lead.' };
      const rows = check(await db.from('leads').delete().eq('id', id).select('id'));
      return changed(rows) ? { ok: true, message: 'Lead deleted.', notice: 'deleted' } : NOT_FOUND;
    },
  }),

  retryNotification: defineAdminAction({
    capability: 'leads',
    schema: notificationRetrySchema,
    handler: async ({ id, eventType }, { db, action }) => {
      // Read through the admin session (RLS confirms access), then send and
      // record the outcome with the server-only store.
      const lead = check(
        await db
          .from('leads')
          .select(
            'id, reference_number, form_type, name, email, business_name, phone, project_description, budget_range, timeline, preferred_contact, website_url, consultation_time, service_category, industries(name), services(name)',
          )
          .eq('id', id)
          .maybeSingle(),
      ) as null | {
        id: string;
        reference_number: string;
        form_type: 'contact' | 'quote' | 'demo';
        name: string;
        email: string;
        business_name: string | null;
        phone: string | null;
        project_description: string;
        budget_range: string | null;
        timeline: string | null;
        preferred_contact: string | null;
        website_url: string | null;
        consultation_time: string | null;
        service_category: string | null;
        industries: { name: string } | null;
        services: { name: string } | null;
      };
      if (!lead) return NOT_FOUND;

      const config = getServerConfig();
      const store = leadStoreFrom(config);
      const settings = notificationSettingsFrom(config);
      if (!store) return { ok: false, message: 'Server database access is not configured (SUPABASE_SECRET_KEY).' };
      if (!settings.provider) return { ok: false, message: 'Email is not configured (RESEND_API_KEY and EMAIL_FROM).' };
      if (eventType === 'lead_acknowledgement') settings.sendAcknowledgement = true;

      const label = (list: readonly { value: string; label: string }[], value: string | null) => list.find((item) => item.value === value)?.label;
      await deliverLeadNotifications(
        store,
        settings,
        {
          leadId: lead.id,
          data: {
            reference: lead.reference_number,
            formType: lead.form_type,
            name: lead.name,
            email: lead.email,
            businessName: lead.business_name ?? undefined,
            phone: lead.phone ?? undefined,
            industry: lead.industries?.name ?? 'Other / not listed',
            interest: lead.services?.name ?? getServiceCategoryContent(lead.service_category ?? '')?.name ?? 'Not sure yet',
            budget: label(BUDGET_RANGES, lead.budget_range),
            timeline: label(TIMELINES, lead.timeline),
            preferredContact: label(CONTACT_METHODS, lead.preferred_contact),
            websiteUrl: lead.website_url ?? undefined,
            consultationTime: lead.consultation_time ?? undefined,
            projectDescription: lead.project_description,
            adminUrl: `${action.url.origin}/admin/leads/${lead.id}`,
          },
        },
        { requestId: action.locals.requestId, only: [eventType] },
      );

      const event = check(
        await db.from('notification_events').select('status, last_error').eq('lead_id', id).eq('event_type', eventType).maybeSingle(),
      ) as { status: string; last_error: string | null } | null;
      return event?.status === 'sent'
        ? { ok: true, message: 'Email sent.', id, notice: 'sent' }
        : { ok: false, message: `Email still not sent${event?.last_error ? `: ${event.last_error.slice(0, 160)}` : '.'}` };
    },
  }),
};

// ── Catalogue ─────────────────────────────────────────────────────────
const industries = {
  save: defineAdminAction({
    capability: 'catalogue',
    schema: industrySchema,
    handler: async (input, { db }) => {
      const row = { name: input.name, slug: input.slug, description: input.description, icon: input.icon, sort_order: input.sortOrder, is_active: input.isActive };
      if (input.id) {
        const rows = check(await db.from('industries').update(row).eq('id', input.id).select('id'));
        return changed(rows) ? { ok: true, message: 'Industry saved.', id: input.id } : NOT_FOUND;
      }
      const created = check(await db.from('industries').insert(row).select('id').single()) as { id: string };
      return { ok: true, message: 'Industry created.', id: created.id, notice: 'created' };
    },
  }),
};

const services = {
  save: defineAdminAction({
    capability: 'catalogue',
    schema: serviceSchema,
    arrays: ['industryIds'],
    handler: async (input, { db }) => {
      const row = {
        name: input.name,
        slug: input.slug,
        short_description: input.shortDescription,
        description: input.description,
        category: input.category,
        status: input.status,
        features: input.features,
        sort_order: input.sortOrder,
        is_active: input.isActive,
        seo_title: input.seoTitle,
        seo_description: input.seoDescription,
      };
      let id = input.id;
      if (id) {
        const rows = check(await db.from('services').update(row).eq('id', id).select('id'));
        if (!changed(rows)) return NOT_FOUND;
      } else {
        id = (check(await db.from('services').insert(row).select('id').single()) as { id: string }).id;
      }
      check(await db.rpc('admin_set_service_industries', { p_service_id: id, p_industry_ids: input.industryIds }));
      return { ok: true, message: input.id ? 'Service saved.' : 'Service created.', id };
    },
  }),

  toggle: defineAdminAction({
    capability: 'catalogue',
    schema: toggleSchema,
    handler: async ({ id, isActive }, { db }) => {
      const rows = check(await db.from('services').update({ is_active: isActive }).eq('id', id).select('id'));
      return changed(rows) ? { ok: true, message: isActive ? 'Service shown on the website.' : 'Service hidden from the website.', id, notice: isActive ? 'shown' : 'hidden' } : NOT_FOUND;
    },
  }),
};

const pricing = {
  save: defineAdminAction({
    capability: 'catalogue',
    schema: pricingSchema,
    handler: async (input, { db }) => {
      const row = {
        service_id: input.serviceId,
        label: input.label,
        display_group: input.displayGroup,
        pricing_model: input.pricingModel,
        // Decimal strings: PostgREST passes them to numeric columns without float conversion.
        minimum_amount: input.minimumAmount,
        maximum_amount: input.maximumAmount,
        max_open_ended: input.maxOpenEnded,
        currency: input.currency,
        billing_interval: input.billingInterval,
        price_note: input.priceNote,
        included_features: input.includedFeatures,
        excluded_features: input.excludedFeatures,
        estimated_delivery: input.estimatedDelivery,
        tax_inclusive: input.taxInclusive,
        sort_order: input.sortOrder,
        is_active: input.isActive,
      };
      if (input.id) {
        const rows = check(await db.from('service_pricing').update(row).eq('id', input.id).select('id'));
        return changed(rows) ? { ok: true, message: 'Price saved. The website shows it immediately.', id: input.id } : NOT_FOUND;
      }
      const created = check(await db.from('service_pricing').insert(row).select('id').single()) as { id: string };
      return { ok: true, message: 'Price created.', id: created.id, notice: 'created' };
    },
  }),

  delete: defineAdminAction({
    capability: 'catalogue',
    schema: deleteSchema,
    handler: async ({ id }, { db }) => {
      const rows = check(await db.from('service_pricing').delete().eq('id', id).select('id'));
      return changed(rows) ? { ok: true, message: 'Price deleted.', notice: 'deleted' } : NOT_FOUND;
    },
  }),
};

const faqs = {
  save: defineAdminAction({
    capability: 'catalogue',
    schema: faqSchema,
    handler: async (input, { db }) => {
      const row = {
        scope: input.scope,
        industry_id: input.scope === 'industry' ? input.industryId : null,
        service_category: input.scope === 'service_category' ? input.serviceCategory : null,
        question: input.question,
        answer: input.answer,
        sort_order: input.sortOrder,
        is_active: input.isActive,
      };
      if (input.id) {
        const rows = check(await db.from('faqs').update(row).eq('id', input.id).select('id'));
        return changed(rows) ? { ok: true, message: 'FAQ saved.', id: input.id } : NOT_FOUND;
      }
      const created = check(await db.from('faqs').insert(row).select('id').single()) as { id: string };
      return { ok: true, message: 'FAQ created.', id: created.id, notice: 'created' };
    },
  }),
  delete: defineAdminAction({
    capability: 'catalogue',
    schema: deleteSchema,
    handler: async ({ id }, { db }) => {
      const rows = check(await db.from('faqs').delete().eq('id', id).select('id'));
      return changed(rows) ? { ok: true, message: 'FAQ deleted.', notice: 'deleted' } : NOT_FOUND;
    },
  }),
};

// ── Content ───────────────────────────────────────────────────────────
const products = {
  save: defineAdminAction({
    capability: 'content',
    schema: productSchema,
    handler: async (input, { db }) => {
      const row = {
        name: input.name,
        slug: input.slug,
        summary: input.summary,
        description: input.description,
        status: input.status,
        industry_id: input.industryId,
        service_category: input.serviceCategory,
        features: input.features,
        technology_stack: input.technologyStack,
        image_urls: input.imageUrls,
        demo_url: input.demoUrl,
        repository_url: input.repositoryUrl,
        seo_title: input.seoTitle,
        seo_description: input.seoDescription,
        sort_order: input.sortOrder,
        is_published: input.isPublished,
      };
      if (input.id) {
        const rows = check(await db.from('products').update(row).eq('id', input.id).select('id'));
        return changed(rows) ? { ok: true, message: 'Product saved.', id: input.id } : NOT_FOUND;
      }
      const created = check(await db.from('products').insert(row).select('id').single()) as { id: string };
      return { ok: true, message: 'Product created.', id: created.id, notice: 'created' };
    },
  }),
  delete: defineAdminAction({
    capability: 'content',
    schema: deleteSchema,
    handler: async ({ id }, { db }) => {
      const rows = check(await db.from('products').delete().eq('id', id).select('id'));
      return changed(rows) ? { ok: true, message: 'Product deleted.', notice: 'deleted' } : NOT_FOUND;
    },
  }),
};

const portfolio = {
  save: defineAdminAction({
    capability: 'content',
    schema: portfolioSchema,
    arrays: ['industryIds'],
    handler: async (input, { db }) => {
      const row = {
        title: input.title,
        slug: input.slug,
        summary: input.summary,
        description: input.description,
        project_type: input.projectType,
        technology_stack: input.technologyStack,
        image_urls: input.imageUrls,
        demo_url: input.demoUrl,
        repository_url: input.repositoryUrl,
        seo_title: input.seoTitle,
        seo_description: input.seoDescription,
        is_published: input.isPublished,
      };
      let id = input.id;
      if (id) {
        const rows = check(await db.from('portfolio_projects').update(row).eq('id', id).select('id'));
        if (!changed(rows)) return NOT_FOUND;
      } else {
        id = (check(await db.from('portfolio_projects').insert(row).select('id').single()) as { id: string }).id;
      }
      check(await db.rpc('admin_set_portfolio_industries', { p_portfolio_id: id, p_industry_ids: input.industryIds }));
      return { ok: true, message: input.id ? 'Project saved.' : 'Project created.', id };
    },
  }),
  delete: defineAdminAction({
    capability: 'content',
    schema: deleteSchema,
    handler: async ({ id }, { db }) => {
      const rows = check(await db.from('portfolio_projects').delete().eq('id', id).select('id'));
      return changed(rows) ? { ok: true, message: 'Project deleted.', notice: 'deleted' } : NOT_FOUND;
    },
  }),
};

const blog = {
  save: defineAdminAction({
    capability: 'content',
    schema: blogSchema,
    handler: async (input, { db }) => {
      const row = {
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        content: input.content,
        cover_image: input.coverImage,
        status: input.status,
        seo_title: input.seoTitle,
        seo_description: input.seoDescription,
      };
      if (input.id) {
        const rows = check(await db.from('blog_posts').update(row).eq('id', input.id).select('id'));
        return changed(rows) ? { ok: true, message: input.status === 'published' ? 'Post saved and published.' : 'Draft saved.', id: input.id } : NOT_FOUND;
      }
      const created = check(await db.from('blog_posts').insert(row).select('id').single()) as { id: string };
      return { ok: true, message: 'Post created.', id: created.id, notice: 'created' };
    },
  }),
  delete: defineAdminAction({
    capability: 'content',
    schema: deleteSchema,
    handler: async ({ id }, { db }) => {
      const rows = check(await db.from('blog_posts').delete().eq('id', id).select('id'));
      return changed(rows) ? { ok: true, message: 'Post deleted.', notice: 'deleted' } : NOT_FOUND;
    },
  }),
};

// ── Settings ──────────────────────────────────────────────────────────
const settings = {
  save: defineAdminAction({
    capability: 'settings',
    schema: settingsSchema,
    handler: async (input, { db }) => {
      const rows = [
        { key: 'contact_email', value: input.contactEmail },
        { key: 'contact_phone', value: input.contactPhone },
        { key: 'whatsapp_number', value: input.whatsappNumber },
        { key: 'business_hours', value: input.businessHours },
        { key: 'service_area', value: input.serviceArea },
        { key: 'announcement', value: input.announcement },
        { key: 'lead_retention_months', value: input.leadRetentionMonths },
      ];
      check(await db.from('site_settings').upsert(rows, { onConflict: 'key' }));
      return { ok: true, message: 'Settings saved.' };
    },
  }),
};

export const admin = { leads, industries, services, pricing, faqs, products, portfolio, blog, settings };
