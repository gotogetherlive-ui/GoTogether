-- Keep buddy-trip nights meaningful: one fewer or one more than the number of days, never zero.

UPDATE public.trips
SET duration_nights = CASE WHEN duration_days = 1 THEN 2 ELSE duration_days - 1 END
WHERE trip_type = 'buddy'
  AND (
    duration_nights IS NULL
    OR duration_nights < 1
    OR ABS(duration_nights - duration_days) <> 1
  );

ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_buddy_duration_check;
ALTER TABLE public.trips
  ADD CONSTRAINT trips_buddy_duration_check
  CHECK (
    trip_type IS DISTINCT FROM 'buddy'
    OR (
      duration_nights IS NOT NULL
      AND duration_nights >= 1
      AND ABS(duration_nights - duration_days) = 1
    )
  );
