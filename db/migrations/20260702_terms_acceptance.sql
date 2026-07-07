ALTER TABLE public.users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Existing accounts predate the acceptance gate. New signups remain NULL until they accept in-app.
UPDATE public.users
SET terms_accepted_at = created_at
WHERE terms_accepted_at IS NULL;

ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS age INTEGER;
