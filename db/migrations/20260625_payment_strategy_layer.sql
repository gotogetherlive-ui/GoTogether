-- Payment strategy abstraction.
-- Supports organizer-owned MVP and future marketplace settlement without
-- changing booking APIs or payment-domain table ownership.

CREATE SCHEMA IF NOT EXISTS payments;


CREATE TABLE IF NOT EXISTS payments.payment_runtime_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('PLATFORM_CONTROLLED', 'ORGANIZER_OWNED', 'MARKETPLACE')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  provider TEXT NOT NULL CHECK (provider IN ('RAZORPAY', 'CASHFREE')),
  supports_marketplace BOOLEAN NOT NULL DEFAULT FALSE,
  supports_refunds BOOLEAN NOT NULL DEFAULT TRUE,
  supports_transfers BOOLEAN NOT NULL DEFAULT FALSE,
  supports_commission BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_runtime_config_single_active
  ON payments.payment_runtime_config (is_active)
  WHERE is_active;

INSERT INTO payments.payment_runtime_config (
  id,
  payment_mode,
  is_active,
  provider,
  supports_marketplace,
  supports_refunds,
  supports_transfers,
  supports_commission,
  metadata
) VALUES (
  'default',
  'ORGANIZER_OWNED',
  TRUE,
  'RAZORPAY',
  FALSE,
  TRUE,
  FALSE,
  FALSE,
  jsonb_build_object('source', 'migration_default')
)
ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS payments.payment_modes (
  mode TEXT PRIMARY KEY CHECK (mode IN ('PLATFORM_CONTROLLED', 'ORGANIZER_OWNED', 'MARKETPLACE')),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  supports_commission BOOLEAN NOT NULL DEFAULT FALSE,
  supports_split_settlement BOOLEAN NOT NULL DEFAULT FALSE,
  supports_linked_accounts BOOLEAN NOT NULL DEFAULT FALSE,
  supports_refunds BOOLEAN NOT NULL DEFAULT TRUE,
  supports_transfers BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_modes_single_active
  ON payments.payment_modes (is_active)
  WHERE is_active;

INSERT INTO payments.payment_modes (
  mode,
  is_active,
  supports_commission,
  supports_split_settlement,
  supports_linked_accounts,
  supports_refunds,
  supports_transfers
) VALUES (
  'ORGANIZER_OWNED',
  TRUE,
  FALSE,
  FALSE,
  FALSE,
  TRUE,
  FALSE
)
ON CONFLICT (mode) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  updated_at = NOW()
WHERE NOT EXISTS (SELECT 1 FROM payments.payment_modes WHERE is_active = TRUE);

INSERT INTO payments.payment_modes (
  mode,
  is_active,
  supports_commission,
  supports_split_settlement,
  supports_linked_accounts,
  supports_refunds,
  supports_transfers
) VALUES (
  'PLATFORM_CONTROLLED',
  FALSE,
  TRUE,
  FALSE,
  FALSE,
  TRUE,
  FALSE
)
ON CONFLICT (mode) DO NOTHING;
INSERT INTO payments.payment_modes (
  mode,
  is_active,
  supports_commission,
  supports_split_settlement,
  supports_linked_accounts,
  supports_refunds,
  supports_transfers
) VALUES (
  'MARKETPLACE',
  FALSE,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE
)
ON CONFLICT (mode) DO NOTHING;

CREATE TABLE IF NOT EXISTS payments.provider_accounts (
  id TEXT PRIMARY KEY,
  organizer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('RAZORPAY', 'CASHFREE')),
  ownership_model TEXT NOT NULL CHECK (ownership_model IN ('ORGANIZER_OWNED', 'MARKETPLACE')),
  provider_account_id TEXT,
  linked_account_id TEXT,
  merchant_id TEXT,
  beneficiary_id TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'pending', 'active', 'disabled')),
  verification_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (verification_status IN ('pending_review', 'verified', 'rejected', 'disabled')),
  supports_refunds BOOLEAN NOT NULL DEFAULT TRUE,
  supports_settlement BOOLEAN NOT NULL DEFAULT FALSE,
  supports_webhooks BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_accounts_organizer
  ON payments.provider_accounts(organizer_id);

CREATE INDEX IF NOT EXISTS idx_provider_accounts_provider
  ON payments.provider_accounts(provider, ownership_model, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_accounts_default_per_model
  ON payments.provider_accounts(organizer_id, ownership_model)
  WHERE is_default;

ALTER TABLE payments.orders
  ADD COLUMN IF NOT EXISTS payment_mode TEXT,
  ADD COLUMN IF NOT EXISTS provider_account_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_commission_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settlement_status TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_orders_provider_account
  ON payments.orders(provider_account_id);

INSERT INTO payments.provider_accounts (
  id,
  organizer_id,
  provider,
  ownership_model,
  provider_account_id,
  is_default,
  status,
  verification_status,
  supports_refunds,
  supports_settlement,
  supports_webhooks,
  metadata,
  verified_at
)
SELECT
  'razorpay-organizer-' || u.id,
  u.id,
  'RAZORPAY',
  'ORGANIZER_OWNED',
  u.razorpay_account_id,
  TRUE,
  CASE WHEN COALESCE(u.payment_enabled, 0) = 1 THEN 'active' ELSE 'pending' END,
  CASE WHEN COALESCE(u.payment_enabled, 0) = 1 THEN 'verified' ELSE 'pending_review' END,
  TRUE,
  FALSE,
  FALSE,
  jsonb_build_object('source', 'users.razorpay_account_id'),
  u.razorpay_account_verified_at
FROM public.users u
WHERE u.razorpay_account_id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  provider_account_id = EXCLUDED.provider_account_id,
  status = EXCLUDED.status,
  verification_status = EXCLUDED.verification_status,
  verified_at = EXCLUDED.verified_at,
  updated_at = NOW();






