# NetPulse

IT operations monitoring dashboard: uptime checks, incidents, and alerts (email via Resend, Discord webhooks). Built with **Next.js 16**, **Tailwind CSS**, **shadcn-style UI**, **Clerk** authentication, and **Supabase** persistence.

**Live demo:** add your deployed URL here after you ship (e.g. Vercel).

## Features

- Landing page with Carbon & Cyan palette
- Clerk sign-in / sign-up with protected `/dashboard` and `/settings`
- Dashboard with stats, lazy-loaded uptime chart (Recharts), monitors table (responsive cards on small screens)
- Monitors: CRUD, pause, checks, search/filter, detail side panel (full-screen on mobile, Escape to close)
- Incidents: create, resolve, timeline
- Settings: profile, notifications, alerts, Discord & email integrations
- Cron-friendly `POST /api/check-monitors` (header `x-cron-secret`), rate-limited per IP
- Security headers and CSP in `next.config.mjs`

## Screenshots

Place images under `docs/` (e.g. `docs/dashboard.png`, `docs/monitors.png`) and reference them here:

- Dashboard — overview stats and uptime trend
- Monitors — list, filters, and detail panel
- Incidents — timeline and severity filters
- Settings — integrations and alert tuning

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js (App Router) |
| UI | Tailwind, Radix primitives, Sonner toasts |
| Auth | Clerk |
| Database | Supabase (Postgres + RLS migrations in `supabase/migrations/`) |
| Email | Resend |
| Charts | Recharts (code-split on the main dashboard) |

## Prerequisites

- Node.js 18+
- Clerk application (publishable + secret keys)
- Supabase project (URL, anon key, service role or new secret key for server)
- Optional: Resend API key for alert email; Discord webhook URLs stored per user in settings

## Environment variables

Copy [`.env.local.example`](.env.local.example) to `.env.local` and fill every value.

**Never expose to the client:** `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`, `CRON_SECRET`, `RESEND_API_KEY`. Only variables prefixed with `NEXT_PUBLIC_` are intended for the browser.

Important:

- `NEXT_PUBLIC_SITE_URL` — canonical URL for metadata, `sitemap.xml`, and Open Graph (Vercel sets `VERCEL_URL` as fallback).
- `NETPULSE_API_ALLOWED_ORIGINS` — optional comma-separated list for `Access-Control-Allow-Origin` on API routes when the browser sends an `Origin` header.

## Local setup

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local with Clerk + Supabase (+ optional Resend)

# Apply SQL migrations in Supabase SQL Editor (see supabase/migrations/)

npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, then open `/dashboard`.

### Cron / scheduled checks

Configure an external scheduler to `POST /api/check-monitors` with header `x-cron-secret: <CRON_SECRET>`. See [CRON_SETUP.md](CRON_SETUP.md).

### Production build

```bash
npm run build
npm start
```

## Project layout (high level)

- `app/` — routes, `loading.tsx` / `error.tsx`, `robots.ts`, `sitemap.ts`, `icon` / `opengraph-image`
- `components/dashboard/` — dashboard shell (collapsible sidebar, mobile drawer), views, skeletons
- `lib/actions/` — Server Actions (auth-gated)
- `lib/data/` — Supabase access patterns and sanitization before insert/update
- `proxy.ts` — Clerk middleware (Next.js 16 convention; do not add a duplicate `middleware.ts`)

## License

Private / your terms.
