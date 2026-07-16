CREATE INDEX IF NOT EXISTS idx_trips_deleted_cleanup
  ON public.trips (deleted_at)
  WHERE status = 'deleted' AND deleted_at IS NOT NULL;
