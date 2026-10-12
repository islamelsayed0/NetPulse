# NetPulse

NetPulse is an IT operations monitoring application for uptime tracking, incident management, and team alerting. It provides a dashboard for HTTP health checks, incident timelines, and notifications through email (Resend) and Discord webhooks.

## Overview

| | |
| --- | --- |
| **Framework** | Next.js 16 (App Router) |
| **Styling** | Tailwind CSS, Radix UI primitives |
| **Authentication** | Clerk |
| **Data** | Supabase (PostgreSQL) |
| **Visual design** | Carbon & Cyan palette |

## Capabilities

- Marketing site and authenticated application surfaces
- Dashboard with aggregate statistics and uptime visualization (Recharts)
- Monitors: create, update, delete, pause, manual checks, search and filters, detail panel
- Incidents: create, edit, resolve, delete, and timeline updates
- User settings: notifications, alert thresholds, Resend email and Discord webhook configuration
- Scheduled monitoring via `POST /api/check-monitors` with shared-secret authentication and rate limiting
- Security-oriented HTTP headers and Content Security Policy (see `next.config.mjs`)

## Requirements

- Node.js 18 or newer
- Clerk project (publishable and secret keys)
- Supabase project (URL and server-side service role or secret key; the anon key is not used)
- Optional: Resend API key for transactional alert email

## Environment configuration

1. Copy `.env.local.example` to `.env.local`.
2. Populate all variables as described in the example file.

Server-only secrets must never use the `NEXT_PUBLIC_` prefix. The following belong only on the server and must not be embedded in client bundles:

- `CLERK_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
- `CRON_SECRET`
- `CRONJOB_API_KEY` (cron-job.org API key from [console.cron-job.org](https://console.cron-job.org/) → Settings; used only by `/api/cron/setup` to manage the external scheduler job—omit locally if you configure cron jobs manually)
- `RESEND_API_KEY`

**Vercel → Project → Settings → Environment Variables:** add the same server-only variables for Production (and Preview if you use preview deployments). Include `CRON_SECRET` and, if you use the setup route or automation, `CRONJOB_API_KEY`. Optional: `NETPULSE_CRON_MONITOR_URL` if your production check URL is not the default `https://netpulse-rose.vercel.app/api/check-monitors`.

For production deployments, set `NEXT_PUBLIC_SITE_URL` to the canonical origin (metadata, sitemap, Open Graph). On Vercel, `VERCEL_URL` is used when the public site URL is unset.

Optional: `NETPULSE_API_ALLOWED_ORIGINS` — comma-separated origins permitted for CORS on selected API routes when a browser `Origin` header is present.

## Installation and development

```bash
npm install
cp .env.local.example .env.local
```

Apply database migrations from `supabase/migrations/` in the Supabase SQL Editor (or your chosen migration workflow). For a fresh project you can run `supabase/NETPULSE_FULL_SETUP.sql` once instead. Existing projects must also run `009_revoke_anon_access.sql`. Then:

```bash
npm run dev
```

The application listens at `http://localhost:3000` by default. Register or sign in, then use `/dashboard` and `/settings` as configured in Clerk.

## Production build

```bash
npm run build
npm start
```

## Database security model

- All database access is server side through the Supabase service role client (`createAdminSupabaseClient` in `lib/supabase.ts`). The service role bypasses row level security, so every query filters by the Clerk `user_id` in application code.
- The public `anon` role and the `authenticated` role have no privileges on any NetPulse table or rollup function (`supabase/migrations/009_revoke_anon_access.sql`). Row level security stays enabled on every table with no permissive policies.
- The browser never talks to Supabase directly. There is no anon or browser Supabase client in the codebase and `NEXT_PUBLIC_SUPABASE_ANON_KEY` is not required.
- Monitor targets are validated against private, loopback, link local and cloud metadata address ranges before every probe and on create or update (`lib/monitoring/url-guard.ts`), so monitors cannot be used to reach internal infrastructure.

## Scheduled monitor checks

Scheduling uses [cron-job.org](https://cron-job.org) (or any HTTP client), not Vercel Cron. External schedulers should send:

```http
POST /api/check-monitors
x-cron-secret: <value of CRON_SECRET>
```

**Programmatic setup:** with `CRONJOB_API_KEY` and `CRON_SECRET` configured on the server, you can call:

- `GET /api/cron/setup` — check whether the NetPulse job exists on cron-job.org (same `x-cron-secret` or `Authorization: Bearer` as `CRON_SECRET`)
- `POST /api/cron/setup` — create a job targeting `https://netpulse-rose.vercel.app/api/check-monitors` every minute (UTC) with the `x-cron-secret` header set from `CRON_SECRET`
- `DELETE /api/cron/setup` — remove that job from cron-job.org

The hourly platform health snapshot (`GET /api/cron/platform-health-snapshot` with the same secret headers) is not created by that endpoint; add a separate cron-job.org job if you still want the public heatmap updated every hour.

Further detail is documented in [CRON_SETUP.md](CRON_SETUP.md).

## Repository structure

| Path | Purpose |
| --- | --- |
| `app/` | Routes, layouts, API routes, metadata, and static route handlers |
| `components/` | React UI, including dashboard shell and feature views |
| `lib/actions/` | Server Actions (Clerk-authenticated) |
| `lib/data/` | Supabase access and input handling for persistence |
| `supabase/migrations/` | SQL schema and policy migrations |
| `proxy.ts` | Clerk middleware (Next.js 16; use this entry point only—do not duplicate as `middleware.ts`) |

## Screenshots

Add screenshots to a `docs/` directory in this repository and reference them here if you publish visuals—for example:

```markdown
![Dashboard](docs/dashboard.png)
```

Suggested captures: dashboard overview, monitors list, incidents view, settings and integrations.

## License

Proprietary. All rights reserved unless otherwise stated in a `LICENSE` file in this repository.
