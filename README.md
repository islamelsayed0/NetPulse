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
- Supabase project (URL, anonymous key, and server-side service role or secret key)
- Optional: Resend API key for transactional alert email

## Environment configuration

1. Copy `.env.local.example` to `.env.local`.
2. Populate all variables as described in the example file.

Server-only secrets must never use the `NEXT_PUBLIC_` prefix. The following belong only on the server and must not be embedded in client bundles:

- `CLERK_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
- `CRON_SECRET`
- `RESEND_API_KEY`

For production deployments, set `NEXT_PUBLIC_SITE_URL` to the canonical origin (metadata, sitemap, Open Graph). On Vercel, `VERCEL_URL` is used when the public site URL is unset.

Optional: `NETPULSE_API_ALLOWED_ORIGINS` — comma-separated origins permitted for CORS on selected API routes when a browser `Origin` header is present.

## Installation and development

```bash
npm install
cp .env.local.example .env.local
```

Apply database migrations from `supabase/migrations/` in the Supabase SQL Editor (or your chosen migration workflow), then:

```bash
npm run dev
```

The application listens at `http://localhost:3000` by default. Register or sign in, then use `/dashboard` and `/settings` as configured in Clerk.

## Production build

```bash
npm run build
npm start
```

## Scheduled monitor checks

External schedulers should send:

```http
POST /api/check-monitors
x-cron-secret: <value of CRON_SECRET>
```

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
