ALTER TABLE custom_trip_requests
  ADD COLUMN IF NOT EXISTS trip_date DATE,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS custom_trip_tickets (
  id TEXT PRIMARY KEY,
  custom_trip_request_id TEXT NOT NULL UNIQUE REFERENCES custom_trip_requests(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL UNIQUE,
  qr_code_data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_in_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_custom_trip_tickets_number ON custom_trip_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_custom_trip_tickets_status ON custom_trip_tickets(status);
