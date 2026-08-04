ALTER TABLE public.custom_trip_requests
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

UPDATE public.custom_trip_requests
SET whatsapp_number = phone
WHERE whatsapp_number IS NULL;
