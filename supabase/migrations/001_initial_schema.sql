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
