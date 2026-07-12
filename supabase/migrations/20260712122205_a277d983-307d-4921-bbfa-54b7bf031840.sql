
-- Track when an admin manually changed an event
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS senast_andrad timestamptz NOT NULL DEFAULT now();

-- Enable scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Automation function: run daily; only touches events not manually changed today
CREATE OR REPLACE FUNCTION public.auto_toggle_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Activate events whose date is today (skipped if admin edited today)
  UPDATE public.events
  SET aktiv = true
  WHERE datum = current_date
    AND aktiv = false
    AND senast_andrad::date < current_date;

  -- Deactivate events whose date has passed (skipped if admin edited today)
  UPDATE public.events
  SET aktiv = false
  WHERE datum < current_date
    AND aktiv = true
    AND senast_andrad::date < current_date;
END;
$$;

-- Remove any prior schedule with the same name, then schedule daily at 00:05
DO $$
BEGIN
  PERFORM cron.unschedule('auto-toggle-events-daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-toggle-events-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-toggle-events-daily',
  '5 0 * * *',
  $$ SELECT public.auto_toggle_events(); $$
);
