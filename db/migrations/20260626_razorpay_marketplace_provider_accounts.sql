-- Backfill Razorpay marketplace account profiles from verified organizer accounts.
-- This lets PAYMENT_MODE=MARKETPLACE use the same verified Razorpay linked account
-- for Route transfers without requiring organizers to resubmit onboarding details.

INSERT INTO payments.provider_accounts (
  id,
  organizer_id,
  provider,
  ownership_model,
  provider_account_id,
  linked_account_id,
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
  'razorpay-marketplace-' || organizer_id,
  organizer_id,
  'RAZORPAY',
  'MARKETPLACE',
  provider_account_id,
  COALESCE(linked_account_id, provider_account_id),
  TRUE,
  status,
  verification_status,
  supports_refunds,
  TRUE,
  supports_webhooks,
  COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('source', 'marketplace_backfill_from_organizer_owned'),
  verified_at
FROM payments.provider_accounts
WHERE provider = 'RAZORPAY'
  AND ownership_model = 'ORGANIZER_OWNED'
  AND is_default = TRUE
  AND status = 'active'
  AND verification_status = 'verified'
  AND provider_account_id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  provider_account_id = EXCLUDED.provider_account_id,
  linked_account_id = EXCLUDED.linked_account_id,
  is_default = TRUE,
  status = EXCLUDED.status,
  verification_status = EXCLUDED.verification_status,
  supports_refunds = EXCLUDED.supports_refunds,
  supports_settlement = TRUE,
  supports_webhooks = EXCLUDED.supports_webhooks,
  metadata = EXCLUDED.metadata,
  verified_at = EXCLUDED.verified_at,
  updated_at = NOW();