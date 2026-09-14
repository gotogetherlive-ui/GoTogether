ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_traveller_type_check;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_traveller_type_check
  CHECK (traveller_type IS NULL OR traveller_type IN ('solo', 'couple', 'group'));
