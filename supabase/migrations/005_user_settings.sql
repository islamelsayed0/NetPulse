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
