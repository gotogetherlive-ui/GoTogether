-- Supersedes the value-normalizing 20260912_buddy_duration_nights migration.
-- Preserve historical trip details; validate only new or changed durations.
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_buddy_duration_check;
CREATE OR REPLACE FUNCTION public.validate_buddy_duration()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.trip_type IS NOT DISTINCT FROM OLD.trip_type
      AND NEW.duration_days IS NOT DISTINCT FROM OLD.duration_days
      AND NEW.duration_nights IS NOT DISTINCT FROM OLD.duration_nights THEN
      RETURN NEW;
    END IF;
  END IF;
  IF NEW.trip_type = 'buddy' AND (
    NEW.duration_days IS NULL OR NEW.duration_days < 1
    OR NEW.duration_nights IS NULL OR NEW.duration_nights < 1
    OR ABS(NEW.duration_nights - NEW.duration_days) <> 1
  ) THEN
    RAISE EXCEPTION 'Buddy trip nights must be positive and differ from days by one'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_buddy_duration ON public.trips;
CREATE TRIGGER trg_validate_buddy_duration
BEFORE INSERT OR UPDATE OF trip_type, duration_days, duration_nights ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.validate_buddy_duration();
