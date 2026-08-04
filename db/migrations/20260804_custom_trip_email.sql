ALTER TABLE public.custom_trip_requests
  ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.custom_trip_requests ctr
SET email = u.email
FROM public.users u
WHERE ctr.user_id = u.id
  AND ctr.email IS NULL;
