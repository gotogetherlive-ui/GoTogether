-- Apply before deploying the payment reliability fixes.
ALTER TABLE payments.payment_events ADD COLUMN IF NOT EXISTS verified_payload JSONB;
ALTER TABLE payments.refunds ADD COLUMN IF NOT EXISTS processing_token TEXT;
ALTER TABLE payments.refunds ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE payments.refunds ADD COLUMN IF NOT EXISTS attempt_key TEXT;
ALTER TABLE payments.payment_events_outbox ADD COLUMN IF NOT EXISTS processing_token TEXT;
ALTER TABLE payments.payment_events_outbox ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
