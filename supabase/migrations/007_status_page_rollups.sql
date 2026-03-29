-- Status page: aggregated daily check status per monitor (UTC calendar days, last 90 days).
-- Called from Next.js with the service role only (no public RPC exposure).

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
