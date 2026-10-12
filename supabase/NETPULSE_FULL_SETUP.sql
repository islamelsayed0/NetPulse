-- =============================================================================
-- NetPulse — full database setup for Supabase (run once in SQL Editor)
-- =============================================================================
-- Paste this entire file into: Supabase Dashboard → SQL Editor → New query → Run
--
-- Order matches supabase/migrations/001 … 009. Safe to re-run: uses IF NOT EXISTS
-- and idempotent patterns where the original migrations did.
--
-- After success: Settings (Discord/email), monitors (notification_email, pause),
-- incidents, and cron checks should align with the app.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 001_initial_schema.sql
-- -----------------------------------------------------------------------------
-- NetPulse initial schema (Clerk user_id stored as text; RLS denies anon — use service role from Next.js server)
-- Safe to re-run: uses IF NOT EXISTS where supported.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS monitors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  type text NOT NULL DEFAULT 'http',
  interval integer NOT NULL DEFAULT 1,
  status text DEFAULT 'pending',
  uptime_percentage numeric DEFAULT 100,
  last_checked timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitor_checks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  monitor_id uuid NOT NULL REFERENCES monitors (id) ON DELETE CASCADE,
  status text NOT NULL,
  response_time integer,
  status_code integer,
  error_message text,
  checked_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS monitor_checks_monitor_id_checked_at_idx
  ON monitor_checks (monitor_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  monitor_id uuid NOT NULL REFERENCES monitors (id) ON DELETE CASCADE,
  user_id text NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'warning',
  status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS incidents_user_id_started_at_idx
  ON incidents (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS incidents_monitor_active_idx
  ON incidents (monitor_id)
  WHERE status = 'active';

ALTER TABLE monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Anon cannot read/write; server uses service role (bypasses RLS). Enable Clerk + Supabase JWT later for anon policies.

-- -----------------------------------------------------------------------------
-- 002_rls_anon_policies.sql (SUPERSEDED by 009_revoke_anon_access.sql)
-- -----------------------------------------------------------------------------
-- The original migration granted full table access to the public `anon` role
-- with USING (true) policies. That is intentionally NOT reproduced here. The app
-- only talks to the database server side through the service role (which
-- bypasses RLS) and filters by Clerk user_id. See the 009 section at the end of
-- this file for the revoke statements.

-- -----------------------------------------------------------------------------
-- 003_monitor_notification_pause.sql
-- -----------------------------------------------------------------------------
-- Optional notification target + pause without deleting monitor.
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS notification_email text;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false;

-- -----------------------------------------------------------------------------
-- 004_incident_updates.sql
-- -----------------------------------------------------------------------------
-- Status updates / timeline entries for incidents (Clerk user_id as text).
CREATE TABLE IF NOT EXISTS incident_updates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id uuid NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
  user_id text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incident_updates_incident_id_created_at_idx
  ON incident_updates (incident_id, created_at ASC);

ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 005_user_settings.sql
-- -----------------------------------------------------------------------------
-- Per-user notification and alert preferences (Clerk user_id as text).
-- Safe to re-run: IF NOT EXISTS / DROP POLICY IF EXISTS where supported.

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL UNIQUE,
  notification_email text,
  email_on_down boolean NOT NULL DEFAULT true,
  email_on_recovery boolean NOT NULL DEFAULT true,
  daily_summary boolean NOT NULL DEFAULT false,
  weekly_report boolean NOT NULL DEFAULT false,
  response_time_threshold integer NOT NULL DEFAULT 5000,
  downtime_delay integer NOT NULL DEFAULT 1,
  alert_cooldown integer NOT NULL DEFAULT 30,
  slack_webhook text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON user_settings (user_id);

CREATE OR REPLACE FUNCTION netpulse_user_settings_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_settings_set_updated_at ON user_settings;
CREATE TRIGGER user_settings_set_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION netpulse_user_settings_set_updated_at();

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- No anon policies (superseded by 009_revoke_anon_access.sql). Server uses the
-- service role and filters by Clerk user_id.

-- -----------------------------------------------------------------------------
-- 006_discord_webhook.sql
-- -----------------------------------------------------------------------------
-- Discord webhooks replace Slack; run after 005_user_settings.sql.
-- Safe to re-run.

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS discord_webhook text;

ALTER TABLE user_settings DROP COLUMN IF EXISTS slack_webhook;

-- -----------------------------------------------------------------------------
-- 007_status_page_rollups.sql
-- -----------------------------------------------------------------------------
-- Public status page: daily rollup RPC + latest check stats (service_role only).

CREATE OR REPLACE FUNCTION public.get_status_page_daily_rollups()
RETURNS TABLE (
  monitor_id uuid,
  day_date date,
  day_status text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    mc.monitor_id,
    (mc.checked_at AT TIME ZONE 'UTC')::date AS day_date,
    CASE
      WHEN bool_or(mc.status = 'down') THEN 'down'
      WHEN bool_or(mc.status = 'degraded') THEN 'degraded'
      WHEN bool_or(mc.status IN ('up', 'operational')) THEN 'up'
      ELSE 'none'
    END AS day_status
  FROM public.monitor_checks mc
  WHERE (mc.checked_at AT TIME ZONE 'UTC')::date
      >= ((timezone('UTC', now()))::date - interval '89 days')
    AND (mc.checked_at AT TIME ZONE 'UTC')::date
      <= (timezone('UTC', now()))::date
  GROUP BY mc.monitor_id, (mc.checked_at AT TIME ZONE 'UTC')::date;
$$;

CREATE OR REPLACE FUNCTION public.get_monitor_latest_check_stats()
RETURNS TABLE (
  monitor_id uuid,
  response_time integer,
  checked_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT ON (monitor_id)
    monitor_id,
    response_time,
    checked_at
  FROM public.monitor_checks
  ORDER BY monitor_id, checked_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_status_page_daily_rollups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_status_page_daily_rollups() TO service_role;

REVOKE ALL ON FUNCTION public.get_monitor_latest_check_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monitor_latest_check_stats() TO service_role;

-- -----------------------------------------------------------------------------
-- 008_platform_status.sql
-- -----------------------------------------------------------------------------
-- Product status page (not tenant monitors): daily samples + platform incidents.

CREATE TABLE IF NOT EXISTS public.platform_health_daily (
  service_key text NOT NULL,
  day_utc date NOT NULL,
  status text NOT NULL CHECK (status IN ('up', 'degraded', 'down')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_key, day_utc)
);

CREATE INDEX IF NOT EXISTS platform_health_daily_day_idx
  ON public.platform_health_daily (day_utc DESC);

CREATE TABLE IF NOT EXISTS public.platform_incidents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_incidents_resolved_at_idx
  ON public.platform_incidents (resolved_at DESC NULLS LAST)
  WHERE resolved_at IS NOT NULL;

ALTER TABLE public.platform_health_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_incidents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_platform_status_heatmap_rollups()
RETURNS TABLE (
  service_key text,
  day_date date,
  day_status text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    h.service_key,
    h.day_utc AS day_date,
    h.status AS day_status
  FROM public.platform_health_daily h
  WHERE h.day_utc >= ((timezone('UTC', now()))::date - interval '89 days')
    AND h.day_utc <= (timezone('UTC', now()))::date;
$$;

REVOKE ALL ON FUNCTION public.get_platform_status_heatmap_rollups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_status_heatmap_rollups() TO service_role;

-- -----------------------------------------------------------------------------
-- 009_revoke_anon_access.sql
-- -----------------------------------------------------------------------------
-- =============================================================================
-- 009_revoke_anon_access.sql
-- NetPulse: revoke every anon and authenticated privilege on application tables.
-- =============================================================================
--
-- WHY
--   Migrations 002 and 005 granted SELECT/INSERT/UPDATE/DELETE on the NetPulse
--   tables to the `anon` role and added policies with USING (true) and
--   WITH CHECK (true). The anon key is public by design, so anyone who holds
--   it could read or modify every user's rows through the PostgREST API,
--   regardless of Clerk authentication.
--
--   The application never uses the anon key at runtime. Every database call is
--   made server side with the service role client (createAdminSupabaseClient)
--   and is filtered by the Clerk user_id in application code. The service role
--   bypasses RLS, so removing anon and authenticated access does not change
--   application behavior.
--
-- WHAT THIS DOES
--   1. Drops the permissive netpulse_anon_* policies.
--   2. Revokes ALL privileges on every NetPulse table from anon and
--      authenticated.
--   3. Revokes EXECUTE on the rollup functions from anon and authenticated.
--   4. Keeps row level security ENABLED on every table so that even if a grant
--      is accidentally reintroduced later, no policy exists to permit access.
--
-- Idempotent: safe to run multiple times and safe when some tables or
-- functions do not exist yet.
--
-- Supersedes the anon grants and policies in:
--   002_rls_anon_policies.sql
--   005_user_settings.sql
-- =============================================================================

-- 1. Drop permissive anon policies (IF EXISTS handles missing tables in DO block).
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'netpulse_anon_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.policyname, rec.tablename);
  END LOOP;
END
$$;

-- 2. Revoke all table privileges from anon and authenticated, keep RLS enabled.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'monitors',
    'monitor_checks',
    'incidents',
    'incident_updates',
    'user_settings',
    'platform_health_daily',
    'platform_incidents'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', t);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM authenticated', t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END
$$;

-- 3. Revoke EXECUTE on the rollup functions from anon and authenticated.
--    service_role keeps EXECUTE (granted in 007 and 008).
DO $$
DECLARE
  f text;
  fns text[] := ARRAY[
    'get_status_page_daily_rollups',
    'get_monitor_latest_check_stats',
    'get_platform_status_heatmap_rollups'
  ];
BEGIN
  FOREACH f IN ARRAY fns LOOP
    IF to_regprocedure('public.' || f || '()') IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I() FROM PUBLIC', f);
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I() FROM anon', f);
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I() FROM authenticated', f);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I() TO service_role', f);
    END IF;
  END LOOP;
END
$$;

-- 4. Make sure future tables in public do not pick up anon grants by default.
--    (Supabase default privileges grant to anon and authenticated; this only
--    affects objects created later by the role running this migration.)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- Verification (run manually in the SQL editor; expect zero rows):
--   SELECT grantee, table_name, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated');
--
--   SELECT policyname, tablename FROM pg_policies
--   WHERE schemaname = 'public' AND policyname LIKE 'netpulse_anon_%';

-- =============================================================================
-- End of NetPulse full setup
-- =============================================================================
