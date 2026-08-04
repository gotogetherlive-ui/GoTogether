CREATE TABLE IF NOT EXISTS public.custom_trip_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  booker_name TEXT NOT NULL,
  email TEXT,
  traveler_names JSONB NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_number TEXT,
  destination TEXT,
  alternate_destination TEXT,
  place_type TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'planning', 'confirmed', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT custom_trip_requests_travelers_array
    CHECK (jsonb_typeof(traveler_names) = 'array' AND jsonb_array_length(traveler_names) >= 2),
  CONSTRAINT custom_trip_requests_destination_or_place
    CHECK (NULLIF(BTRIM(destination), '') IS NOT NULL OR NULLIF(BTRIM(place_type), '') IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_custom_trip_requests_status_created
  ON public.custom_trip_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_trip_requests_user
  ON public.custom_trip_requests (user_id, created_at DESC);
