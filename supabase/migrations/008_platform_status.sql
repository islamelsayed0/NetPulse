-- Public product status page: daily health samples + platform incidents (not user tenants).

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

-- No anon policies: server uses service_role only for these tables.

-- Heatmap RPC: last 90 UTC days of stored daily status (service_role only).
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
