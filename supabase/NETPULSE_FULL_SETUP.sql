-- =============================================================================
-- NetPulse — full database setup for Supabase (run once in SQL Editor)
-- =============================================================================
-- Paste this entire file into: Supabase Dashboard → SQL Editor → New query → Run
--
-- Order matches supabase/migrations/001 … 006. Safe to re-run: uses IF NOT EXISTS
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
-- 002_rls_anon_policies.sql
-- -----------------------------------------------------------------------------
-- NetPulse RLS: permissive policies for `anon` (Clerk auth lives outside Supabase).
--
-- Service role / secret key (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY):
--   PostgREST uses the `service_role` JWT, which BYPASSES RLS in Supabase. No policies
--   are required or applied for that role; the Next.js server must still filter by
--   Clerk `user_id` in application code.
--
-- Anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY):
--   These policies allow all SELECT/INSERT/UPDATE/DELETE on app tables for role `anon`.
--
-- WARNING: The anon key is public in the browser. USING (true) / WITH CHECK (true) means
-- anyone with your project URL and anon key can read or modify ALL rows via the REST API.
-- Application-side filtering does NOT protect the database. For production multi-tenant
-- safety, prefer Clerk JWT as a third-party provider in Supabase and row policies on
-- user_id (and scoped policies for monitor_checks via monitor ownership).
--
-- Safe to re-run: DROP POLICY IF EXISTS + CREATE POLICY.

-- Privileges (RLS still applies; policies below must allow the operations).
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON monitors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON monitor_checks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON incidents TO anon;

DROP POLICY IF EXISTS "netpulse_anon_all_monitors" ON monitors;
CREATE POLICY "netpulse_anon_all_monitors"
  ON monitors
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "netpulse_anon_all_monitor_checks" ON monitor_checks;
CREATE POLICY "netpulse_anon_all_monitor_checks"
  ON monitor_checks
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "netpulse_anon_all_incidents" ON incidents;
CREATE POLICY "netpulse_anon_all_incidents"
  ON incidents
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

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

-- Anon policies (see 002_rls_anon_policies.sql WARNING). Server uses service role + user_id filter.
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON user_settings TO anon;

DROP POLICY IF EXISTS "netpulse_anon_all_user_settings" ON user_settings;
CREATE POLICY "netpulse_anon_all_user_settings"
  ON user_settings
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 006_discord_webhook.sql
-- -----------------------------------------------------------------------------
-- Discord webhooks replace Slack; run after 005_user_settings.sql.
-- Safe to re-run.

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS discord_webhook text;

ALTER TABLE user_settings DROP COLUMN IF EXISTS slack_webhook;

-- =============================================================================
-- End of NetPulse full setup
-- =============================================================================
