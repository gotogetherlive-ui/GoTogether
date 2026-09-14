-- Cover the sort and filters used by the highest-traffic public pages.
CREATE INDEX IF NOT EXISTS idx_trips_public_premium_feed
  ON public.trips (is_featured DESC, created_at DESC)
  WHERE status = 'live' AND trip_type = 'premium' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_trips_public_buddy_feed
  ON public.trips (created_at DESC)
  WHERE status = 'live' AND trip_type = 'buddy';

CREATE INDEX IF NOT EXISTS idx_trip_requests_trip_status
  ON public.trip_requests (trip_id, status);

CREATE INDEX IF NOT EXISTS idx_trip_requests_requester_trip
  ON public.trip_requests (requester_id, trip_id);

CREATE INDEX IF NOT EXISTS idx_story_likes_story_user_created
  ON public.story_likes (story_id, user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_users_recently_active
  ON public.users (last_login_at DESC, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_trip_participants_user_trip
  ON public.trip_participants (user_id, trip_id);
