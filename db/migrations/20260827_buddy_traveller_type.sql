ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS traveller_type TEXT;

UPDATE public.trips
SET traveller_type = 'solo'
WHERE trip_type = 'buddy'
  AND traveller_type IS NULL;

ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_traveller_type_check;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_traveller_type_check
  CHECK (traveller_type IS NULL OR traveller_type IN ('solo', 'couple'));
