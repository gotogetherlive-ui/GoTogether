-- GoTogether payment-domain migration
-- Single PostgreSQL database, isolated payments schema.

CREATE SCHEMA IF NOT EXISTS payments;

CREATE TABLE IF NOT EXISTS payments.orders (
  id TEXT PRIMARY KEY,
  order_reference TEXT NOT NULL UNIQUE,
  provider_order_id TEXT UNIQUE,
  provider TEXT NOT NULL,
  booking_id TEXT NOT NULL REFERENCES public.trip_bookings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  organizer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CHARGEBACK')),
  expires_at TIMESTAMPTZ NOT NULL,
  provider_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments.transactions (
  transaction_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES payments.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_payment_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  method TEXT,
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CHARGEBACK')),
  paid_at TIMESTAMPTZ,
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_payment_id)
);

CREATE TABLE IF NOT EXISTS payments.refunds (
  refund_id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES payments.transactions(transaction_id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT,
  provider_refund_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED')),
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_refund_id)
);

CREATE TABLE IF NOT EXISTS payments.webhook_logs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_event_id TEXT,
  payload JSONB NOT NULL,
  signature TEXT,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processing_error TEXT,
  response_status INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payments.payment_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS payments.payment_attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES payments.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments.payment_events_outbox (
  id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments.reconciliation_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  summary JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_orders_booking_id ON payments.orders(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_orders_user_id ON payments.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_orders_trip_id ON payments.orders(trip_id);
CREATE INDEX IF NOT EXISTS idx_payments_orders_provider_order ON payments.orders(provider, provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_orders_status_expires ON payments.orders(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_transactions_order_id ON payments.transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_transactions_provider_payment ON payments.transactions(provider, provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_refunds_transaction_id ON payments.refunds(transaction_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_refunds_transaction_active ON payments.refunds(transaction_id) WHERE status IN ('PENDING', 'PROCESSING', 'SUCCESS');
CREATE INDEX IF NOT EXISTS idx_payments_webhook_logs_provider_event ON payments.webhook_logs(provider, provider_event_id);
CREATE INDEX IF NOT EXISTS idx_payments_webhook_logs_processed ON payments.webhook_logs(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_outbox_unprocessed ON payments.payment_events_outbox(processed_at, created_at);

-- Compatibility shells let this migration run on fresh databases where legacy tables never existed.
CREATE TABLE IF NOT EXISTS public.booking_payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  amount INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.booking_event_log (
  id TEXT PRIMARY KEY,
  booking_id TEXT,
  event_type TEXT NOT NULL,
  event_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Migrate legacy payment rows before retiring public payment tables.
INSERT INTO payments.orders (
  id, order_reference, provider_order_id, provider, booking_id, user_id, trip_id, organizer_id,
  amount, currency, status, expires_at, provider_payload, created_at, updated_at
)
SELECT
  COALESCE(bp.id, b.id || '-legacy-order') as id,
  COALESCE(b.booking_ref || '-' || LEFT(REPLACE(b.id, '-', ''), 8), b.id) as order_reference,
  COALESCE(bp.razorpay_order_id, b.razorpay_order_id) as provider_order_id,
  'RAZORPAY' as provider,
  b.id as booking_id,
  b.user_id,
  b.trip_id,
  t.organizer_id,
  COALESCE(NULLIF(bp.amount, 0), b.amount, 1) as amount,
  'INR' as currency,
  CASE
    WHEN COALESCE(bp.status, b.payment_status) IN ('paid', 'success', 'SUCCESS') THEN 'SUCCESS'
    WHEN COALESCE(bp.status, b.payment_status) IN ('failed', 'FAILED') THEN 'FAILED'
    WHEN COALESCE(bp.status, b.payment_status) IN ('processing', 'PROCESSING') THEN 'PROCESSING'
    ELSE 'PENDING'
  END as status,
  COALESCE(b.expires_at, b.created_at + INTERVAL '15 minutes') as expires_at,
  jsonb_build_object('legacy_booking_payment_id', bp.id) as provider_payload,
  COALESCE(bp.created_at, b.created_at, NOW()) as created_at,
  NOW() as updated_at
FROM public.trip_bookings b
JOIN public.trips t ON t.id = b.trip_id
LEFT JOIN public.booking_payments bp ON bp.booking_id = b.id
WHERE (bp.id IS NOT NULL OR b.razorpay_order_id IS NOT NULL)
  AND COALESCE(bp.razorpay_order_id, b.razorpay_order_id) IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO payments.transactions (
  transaction_id, order_id, provider, provider_payment_id, amount, currency, method, status, paid_at, provider_response, created_at
)
SELECT
  COALESCE(bp.id || '-txn', b.id || '-legacy-txn') as transaction_id,
  COALESCE(bp.id, b.id || '-legacy-order') as order_id,
  'RAZORPAY' as provider,
  COALESCE(bp.razorpay_payment_id, b.razorpay_payment_id) as provider_payment_id,
  COALESCE(NULLIF(bp.amount, 0), b.amount, 1) as amount,
  'INR' as currency,
  NULL as method,
  CASE
    WHEN COALESCE(bp.status, b.payment_status) IN ('paid', 'success', 'SUCCESS') THEN 'SUCCESS'
    WHEN COALESCE(bp.status, b.payment_status) IN ('failed', 'FAILED') THEN 'FAILED'
    ELSE 'PROCESSING'
  END as status,
  COALESCE(bp.verified_at, b.paid_at, b.verified_at) as paid_at,
  jsonb_build_object('legacy_booking_payment_id', bp.id) as provider_response,
  COALESCE(bp.created_at, b.created_at, NOW()) as created_at
FROM public.trip_bookings b
LEFT JOIN public.booking_payments bp ON bp.booking_id = b.id
WHERE COALESCE(bp.razorpay_payment_id, b.razorpay_payment_id) IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO payments.webhook_logs (id, provider, event_type, provider_event_id, payload, processed, created_at, processed_at)
SELECT
  id,
  'RAZORPAY',
  event_type,
  NULL,
  jsonb_build_object('legacy_event_data', event_data),
  TRUE,
  created_at,
  created_at
FROM public.booking_event_log
ON CONFLICT DO NOTHING;

-- Retire legacy public payment tables after data has been copied.
DROP TABLE IF EXISTS public.booking_event_log;
DROP TABLE IF EXISTS public.booking_payments;