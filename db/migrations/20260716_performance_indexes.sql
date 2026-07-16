CREATE INDEX IF NOT EXISTS idx_trips_organizer_dashboard
  ON public.trips (organizer_id, trip_type, status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_trip_requests_trip_created
  ON public.trip_requests (trip_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trip_requests_requester_notifications
  ON public.trip_requests (requester_id, status, notification_seen, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trip_bookings_user_notifications
  ON public.trip_bookings (user_id, user_notification_seen)
  WHERE user_notification_seen = 0;

CREATE INDEX IF NOT EXISTS idx_users_active_created
  ON public.users (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_business_applications_pending_notifications
  ON public.business_applications (notification_seen)
  WHERE status = 'pending' AND notification_seen = 0;

CREATE INDEX IF NOT EXISTS idx_feedbacks_pending_notifications
  ON public.feedbacks (notification_seen)
  WHERE status = 'pending' AND notification_seen = 0;

CREATE INDEX IF NOT EXISTS idx_support_tickets_notifications
  ON public.support_tickets (notification_seen)
  WHERE notification_seen = 0;
