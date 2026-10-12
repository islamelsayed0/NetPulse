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
