# Costs

Prices and limits were checked on **12 October 2026** from the providers' official pages (sources below). Free tiers can change; none is guaranteed to stay free. INR figures use about **₹95–97 per USD** and exclude GST, which may add 18% on imported services.

## One-time costs

| Item | Cost |
| --- | --- |
| Development of this MVP | ₹0 (done) |
| Open-source software (Astro, React, Tailwind, Supabase client, Zod, Playwright…) | ₹0 |
| Paid services required to launch | **None** |

The MVP fits the ₹0–₹10,000 budget with ₹0 spent; the only unavoidable recurring cost is the domain renewal you already pay.

## Recurring costs at MVP scale

| Service | Plan | Monthly cost | Limits that matter |
| --- | --- | --- | --- |
| Domain `devmsr.in` | Existing registrar | Your renewal price (yearly) | — |
| Cloudflare DNS, SSL, CDN | Free | ₹0 | — |
| Cloudflare Workers | Free | ₹0 | 100,000 requests/day; **10 ms CPU per request**; static asset requests are free and unlimited |
| Supabase | Free | ₹0 | 500 MB database; 50,000 auth MAU; 5 GB egress; **pauses after 7 days of low activity**; **no automatic backups**; 2 free projects |
| Resend | Free | ₹0 | 3,000 emails/month, **100/day**; domain verification required |
| Cloudflare Turnstile | Free | ₹0 | Unlimited verifications, up to 20 widgets |
| GitHub Actions | Free | ₹0 | Unlimited minutes on public repositories; 2,000 min/month if private |
| **Total** | | **₹0/month** + domain renewal | |

A typical small agency site with a few dozen enquiries a month stays well inside these limits.

## When you would start paying

| Trigger | Upgrade | Price |
| --- | --- | --- |
| Need daily backups, no pausing, or > 500 MB data | Supabase Pro | USD 25/month (≈ ₹2,400) |
| > 100,000 Worker requests/day, or CPU-limit errors | Workers Paid | USD 5/month minimum (≈ ₹480) |
| > 100 emails/day or > 3,000/month | Resend Pro | USD 20/month for 50,000 emails (≈ ₹1,930) |

**Recommendation:** upgrade Supabase to Pro once the site receives real leads, mainly for daily backups; until then take manual dumps (docs/SECURITY.md → Backups).

## Future features (not in the MVP)

| Feature | Typical recurring cost driver |
| --- | --- |
| Razorpay payments | Per-transaction fee charged by Razorpay |
| WhatsApp Business messaging | Per-conversation/message charges from Meta or the BSP |
| AI chatbot / lead qualification | AI provider usage (tokens); set spending limits |
| Voice AI | Telephony number rental + per-minute + voice AI usage |
| n8n automation | Free if self-hosted on existing infrastructure; n8n Cloud is paid |

## Sources

- Cloudflare Workers limits and pricing: <https://developers.cloudflare.com/workers/platform/limits/>, <https://developers.cloudflare.com/workers/platform/pricing/>
- Cloudflare Workers Builds: <https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/>
- Cloudflare Turnstile plans: <https://developers.cloudflare.com/turnstile/plans/>
- Cloudflare plans: <https://www.cloudflare.com/plans/network-cdn/>
- Supabase pricing, pausing and backups: <https://supabase.com/pricing>, <https://supabase.com/docs/guides/platform/free-project-pausing>, <https://supabase.com/docs/guides/platform/backups>
- Supabase API keys: <https://supabase.com/docs/guides/api/api-keys>
- Resend pricing and quotas: <https://resend.com/pricing>, <https://resend.com/docs/knowledge-base/account-quotas-and-limits>
- GitHub Actions billing: <https://docs.github.com/en/billing/concepts/product-billing/github-actions>
- Exchange rate (ECB reference via Frankfurter): <https://api.frankfurter.dev/v1/latest?from=USD&to=INR>

Not verified: whether Cloudflare or Supabase require a card for their free plans, and whether each provider adds GST for Indian accounts.
