ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS trips_empty_title TEXT NOT NULL
  DEFAULT 'New trips will be available soon';

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS trips_empty_message TEXT NOT NULL
  DEFAULT 'We are updating our trip calendar with new departures and competitive prices. Please check back shortly.';

ALTER TABLE public.settings
  ALTER COLUMN trips_empty_title SET DEFAULT 'New trips will be available soon',
  ALTER COLUMN trips_empty_message SET DEFAULT 'We are updating our trip calendar with new departures and competitive prices. Please check back shortly.';

UPDATE public.settings
SET trips_empty_title = 'New trips will be available soon',
    trips_empty_message = 'We are updating our trip calendar with new departures and competitive prices. Please check back shortly.'
WHERE trips_empty_title IN ('Amazing trips are on the way', 'Great trips are just around the corner')
  AND trips_empty_message IN (
    'We are handpicking unforgettable adventures that are big on memories and gentle on your budget. Thank you for your patience - your next escape will be worth the wait.',
    'We are adding exciting, value-for-money departures from trusted trip organizers. Check back soon, or plan a custom trip and travel your way.'
  );
