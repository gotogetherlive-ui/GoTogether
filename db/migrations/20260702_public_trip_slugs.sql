ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE TABLE IF NOT EXISTS public.trip_slug_history (
  id BIGSERIAL PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  old_slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

WITH base_slugs AS (
  SELECT
    id,
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(COALESCE(destination, '') || ' ' || COALESCE(title, '')), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) AS base_slug
  FROM public.trips
  WHERE slug IS NULL
),
numbered AS (
  SELECT
    id,
    COALESCE(NULLIF(base_slug, ''), 'trip') AS base_slug,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(NULLIF(base_slug, ''), 'trip') ORDER BY id) AS duplicate_position
  FROM base_slugs
),
reserved AS (
  SELECT slug FROM public.trips WHERE slug IS NOT NULL
),
final_slugs AS (
  SELECT
    numbered.id,
    CASE
      WHEN numbered.duplicate_position = 1 AND reserved.slug IS NULL THEN numbered.base_slug
      ELSE numbered.base_slug || '-' || LEFT(REPLACE(numbered.id, '-', ''), 8)
    END AS generated_slug
  FROM numbered
  LEFT JOIN reserved ON reserved.slug = numbered.base_slug
)
UPDATE public.trips t
SET slug = final_slugs.generated_slug
FROM final_slugs
WHERE t.id = final_slugs.id AND t.slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_slug_unique ON public.trips(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trip_slug_history_trip_id ON public.trip_slug_history(trip_id);
