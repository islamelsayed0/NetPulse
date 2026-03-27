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
