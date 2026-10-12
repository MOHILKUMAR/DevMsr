# Setup

This guide connects the site to Supabase (database + admin login), Resend (email) and Cloudflare Turnstile (spam protection). Each step that needs your accounts or credentials is marked **You**.

## 1. Local development

```bash
npm install
cp .env.example .dev.vars
npm run dev
```

`.dev.vars` is read by the Cloudflare runtime locally and is git-ignored. Generate `APP_SECRET`:

```bash
node -e "console.log(crypto.randomUUID().replaceAll('-','') + crypto.randomUUID().replaceAll('-',''))"
```

With only `APP_SECRET` set, the site works with bundled data and forms report "temporarily unavailable" (nothing is stored).

## 2. Supabase project

1. **You:** create a free project at <https://supabase.com/dashboard>. Choose the **Mumbai (ap-south-1)** region for Indian visitors. Save the database password in your password manager.
2. **You:** in *Project Settings → API Keys*, copy:
   - Project URL → `SUPABASE_URL`
   - Publishable key (`sb_publishable_…`) → `SUPABASE_PUBLISHABLE_KEY`
   - Secret key (`sb_secret_…`) → `SUPABASE_SECRET_KEY` — **server only**, never share it or put it in client code.
3. Apply the schema. Either:
   - **SQL Editor:** run each file in `supabase/migrations/` in filename order, then run `supabase/seed.sql`; or
   - **CLI:**
     ```bash
     npx supabase login
     npx supabase link --project-ref <your-project-ref>
     npx supabase db push
     ```
     then run `supabase/seed.sql` in the SQL Editor.
4. In *Project Settings → Data API*, confirm the exposed schemas are `public` (and `graphql_public`) only. The `internal` schema (rate limits) must **not** be exposed.
5. In *Authentication → Sign In / Providers*, **turn off "Allow new users to sign up"**. Admin accounts are created by hand (next step). Even if sign-up were left on, a new account gets no access without an admin profile — but there is no reason to allow it.

### Create the first admin (owner)

1. **You:** *Authentication → Users → Add user → Create new user*. Enter your email and a strong password, tick **Auto Confirm User**. Copy the user's **UID**.
2. **You:** in the SQL Editor run:
   ```sql
   insert into public.admin_profiles (auth_user_id, display_name, role)
   values ('<paste-the-UID>', 'Your Name', 'owner');
   ```
3. Sign in at `/admin/login`.

Roles: `owner` (everything, including deleting leads), `admin` (everything except deleting leads), `editor` (products, portfolio, blog only). Admin profiles can only be created or changed with SQL — never through the website or API — so nobody can grant themselves access.

**Password reset:** *Authentication → Users → (user) → Send password recovery*, or set a new password there. A self-service reset flow is deferred (see CHECKLIST).

## 3. Email (Resend)

1. **You:** create an account at <https://resend.com>.
2. **You:** *Domains → Add domain* — use a subdomain such as `mail.devmsr.in`. Add the DNS records Resend shows (TXT for SPF/DKIM, MX for the return path) in **Cloudflare DNS** with the proxy **off** (grey cloud). Wait for verification.
3. **You:** *API Keys → Create* with **Sending access** only, limited to that domain.
4. Set:
   ```
   RESEND_API_KEY=re_…
   EMAIL_FROM="DevMsr.in <notify@mail.devmsr.in>"
   OWNER_NOTIFICATION_EMAIL=<the inbox you read>
   SEND_LEAD_ACKNOWLEDGEMENT=false   # "true" to email prospects their reference number
   ```

`devmsr.in` currently has **no MX records**, so it cannot receive mail. If you want a public `hello@devmsr.in` address, enable **Cloudflare Email Routing** (free) to forward it to an inbox you already use, then set it as the public contact email in `/admin/settings`.

If email is not configured or fails, leads are still saved; the dashboard lists failed notifications with a **Retry** button.

## 4. Turnstile (recommended)

1. **You:** Cloudflare dashboard → *Turnstile → Add widget*. Hostnames: `devmsr.in`, `www.devmsr.in` and your `*.workers.dev` preview host. Mode: **Managed**.
2. Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.

Without Turnstile, forms are still protected by the signed form-age token, the honeypot and rate limits.

## 5. Optional: scheduled jobs

- **Notification retries + keep-alive:** set a `CRON_SECRET` (24+ random characters) as a Worker secret, then in GitHub add repository variable `SITE_URL` and secret `CRON_SECRET`. `.github/workflows/scheduled.yml` then calls `/api/health` and `/api/cron/retry-notifications` daily.
- **Lead retention:** enable the `pg_cron` extension (*Database → Extensions*) and schedule the purge monthly:
  ```sql
  select cron.schedule('purge-expired-leads', '0 3 1 * *', $$select public.purge_expired_leads()$$);
  ```
  The retention period is `lead_retention_months` in `/admin/settings` (default 24); won leads are kept.

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | for DB | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | for DB | Public reads and admin sessions (RLS applies) |
| `SUPABASE_SECRET_KEY` | for forms | Lead intake, rate limits, notification logs only |
| `APP_SECRET` | yes | HMAC key for form tokens and hashed rate-limit keys (32+ chars) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_NOTIFICATION_EMAIL` | for email | Notifications |
| `SEND_LEAD_ACKNOWLEDGEMENT` | no | `true` to email prospects a receipt |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | no | Bot check on forms |
| `CRON_SECRET` | no | Protects the retry endpoint |

All variables are read at runtime on the server (`astro:env` with `access: 'secret'`); none is bundled into browser code. `npm run check:secrets` verifies this before every deploy.
