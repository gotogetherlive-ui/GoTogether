ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organizer_slug TEXT;

CREATE TABLE IF NOT EXISTS public.organizer_slug_history (
  id BIGSERIAL PRIMARY KEY,
  organizer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  old_slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
  organizer RECORD;
  base_slug TEXT;
  candidate_slug TEXT;
  suffix INTEGER;
BEGIN
  FOR organizer IN
    SELECT id, full_name
    FROM public.users
    WHERE organizer_slug IS NULL
      AND deleted_at IS NULL
      AND role IN ('business', 'super_admin')
    ORDER BY id
  LOOP
    base_slug := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(COALESCE(organizer.full_name, '')), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'));
    IF base_slug = '' THEN
      base_slug := 'organizer';
    END IF;

    candidate_slug := base_slug;
    suffix := 2;

    WHILE EXISTS (SELECT 1 FROM public.users WHERE organizer_slug = candidate_slug AND id <> organizer.id) LOOP
      candidate_slug := base_slug || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;

    UPDATE public.users
    SET organizer_slug = candidate_slug
    WHERE id = organizer.id AND organizer_slug IS NULL;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_organizer_slug_unique ON public.users(organizer_slug) WHERE organizer_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizer_slug_history_organizer_id ON public.organizer_slug_history(organizer_id);
