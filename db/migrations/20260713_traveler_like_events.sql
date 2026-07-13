ALTER TABLE public.story_likes
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_story_likes_story_created
  ON public.story_likes(story_id, created_at);

-- Remove historical self-likes before ranking from received likes.
DELETE FROM public.story_likes sl
USING public.travel_stories s
WHERE sl.story_id = s.id
  AND sl.user_id = s.user_id;

UPDATE public.travel_stories s
SET likes_count = (
  SELECT COUNT(*)::int
  FROM public.story_likes sl
  WHERE sl.story_id = s.id
);

CREATE TABLE IF NOT EXISTS public.story_event_winners (
  event_id TEXT PRIMARY KEY,
  event_start TIMESTAMPTZ NOT NULL,
  scoring_end TIMESTAMPTZ NOT NULL,
  winner_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_likes INTEGER NOT NULL DEFAULT 0,
  score NUMERIC(12, 2) NOT NULL DEFAULT 0,
  story_count INTEGER NOT NULL DEFAULT 0,
  featured_from TIMESTAMPTZ NOT NULL,
  featured_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_event_winners_feature_window
  ON public.story_event_winners(featured_from, featured_until);

CREATE TABLE IF NOT EXISTS public.story_event_maintenance (
  event_id TEXT PRIMARY KEY,
  event_start TIMESTAMPTZ NOT NULL,
  cleanup_completed_at TIMESTAMPTZ NOT NULL,
  winner_finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Publishing no longer awards credit. Event scores are derived from received likes.
DELETE FROM public.traveler_credit_ledger
WHERE source_type = 'travel_story';

UPDATE public.users SET credit_points = 0
WHERE credit_points <> 0;
