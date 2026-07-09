CREATE OR REPLACE FUNCTION public.enforce_single_active_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.aktiv THEN
    UPDATE public.events SET aktiv = false WHERE id <> NEW.id AND aktiv = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_active_event_trigger ON public.events;
CREATE TRIGGER enforce_single_active_event_trigger
AFTER INSERT OR UPDATE OF aktiv ON public.events
FOR EACH ROW
WHEN (NEW.aktiv = true)
EXECUTE FUNCTION public.enforce_single_active_event();

-- Ensure only one currently active event
UPDATE public.events SET aktiv = false
WHERE aktiv = true AND id NOT IN (
  SELECT id FROM public.events WHERE aktiv = true ORDER BY datum DESC LIMIT 1
);