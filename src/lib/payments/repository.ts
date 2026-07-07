import { query, queryOne, run } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { PAYMENT_MODE, PAYMENT_STATUS, REFUND_STATUS, type PaymentMode, type PaymentModeConfig, type PaymentProvider, type PaymentStatus, type ProviderAccount, type RefundStatus } from "./domain";
import { safeJson } from "./utils";

export interface PaymentOrderRecord {
  id: string;
  order_reference: string;
  provider_order_id: string | null;
  provider: PaymentProvider;
  booking_id: string;
  user_id: string;
  trip_id: string;
  organizer_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_mode?: PaymentMode | null;
  provider_account_id?: string | null;
  platform_commission_amount?: number | null;
  settlement_status?: string | null;
  expires_at: string;
  provider_payload?: unknown;
}

async function assertPaymentOrderProviderAccount(input: Omit<PaymentOrderRecord, "provider_order_id" | "provider_payload">) {
  if (input.payment_mode !== PAYMENT_MODE.ORGANIZER_OWNED && input.payment_mode !== PAYMENT_MODE.MARKETPLACE) return;
  if (!input.provider_account_id) {
    throw new Error(`${input.payment_mode} payment orders require a provider account`);
  }

  const providerAccount = await queryOne<ProviderAccount>(
    `SELECT id, organizer_id, provider, ownership_model, provider_account_id, linked_account_id, merchant_id, beneficiary_id, status, verification_status, api_key_enc, api_secret_enc, webhook_secret_enc
     FROM payments.provider_accounts
     WHERE id = $1
       AND organizer_id = $2
       AND provider = $3
       AND ownership_model = $4
       AND status = 'active'
       AND verification_status = 'verified'
       AND api_key_enc IS NOT NULL
       AND api_secret_enc IS NOT NULL
       AND (provider <> 'RAZORPAY' OR webhook_secret_enc IS NOT NULL)
       AND (
         ownership_model <> 'MARKETPLACE'
         OR linked_account_id IS NOT NULL
         OR provider_account_id IS NOT NULL
         OR merchant_id IS NOT NULL
         OR beneficiary_id IS NOT NULL
       )
     LIMIT 1`,
    [input.provider_account_id, input.organizer_id, input.provider, input.payment_mode]
  );

  if (!providerAccount) {
    throw new Error("Payment provider account does not belong to the trip organizer or is not active and verified");
  }
}
export async function createPaymentOrder(input: Omit<PaymentOrderRecord, "provider_order_id" | "provider_payload">) {
  await assertPaymentOrderProviderAccount(input);
  await run(
    `INSERT INTO payments.orders (
       id, order_reference, provider, booking_id, user_id, trip_id, organizer_id,
       amount, currency, status, expires_at, payment_mode, provider_account_id, platform_commission_amount
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      input.id,
      input.order_reference,
      input.provider,
      input.booking_id,
      input.user_id,
      input.trip_id,
      input.organizer_id,
      input.amount,
      input.currency,
      input.status,
      input.expires_at,
      input.payment_mode || null,
      input.provider_account_id || null,
      input.platform_commission_amount || 0,
    ]
  );
}

export async function attachProviderOrder(orderId: string, providerOrderId: string, payload: unknown) {
  await run(
    `UPDATE payments.orders
     SET provider_order_id = $1, provider_payload = $2::jsonb, status = $3, updated_at = NOW()
     WHERE id = $4`,
    [providerOrderId, safeJson(payload), PAYMENT_STATUS.PENDING, orderId]
  );
}

export async function findOrderByProviderOrderId(provider: PaymentProvider, providerOrderId: string) {
  return queryOne<PaymentOrderRecord>(
    `SELECT id, order_reference, provider_order_id, provider, booking_id, user_id, trip_id, organizer_id, amount, currency, status, payment_mode, provider_account_id, platform_commission_amount, settlement_status, expires_at FROM payments.orders WHERE provider = $1 AND provider_order_id = $2`,
    [provider, providerOrderId]
  );
}

export async function findOrderByBookingId(bookingId: string) {
  return queryOne<PaymentOrderRecord>(
    `SELECT id, order_reference, provider_order_id, provider, booking_id, user_id, trip_id, organizer_id, amount, currency, status, payment_mode, provider_account_id, platform_commission_amount, settlement_status, expires_at FROM payments.orders WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [bookingId]
  );
}

export async function lockOrder(orderId: string) {
  return queryOne<PaymentOrderRecord>(`SELECT id, order_reference, provider_order_id, provider, booking_id, user_id, trip_id, organizer_id, amount, currency, status, payment_mode, provider_account_id, platform_commission_amount, settlement_status, expires_at FROM payments.orders WHERE id = $1 FOR UPDATE`, [orderId]);
}

export async function updateOrderStatus(orderId: string, status: PaymentStatus) {
  await run(`UPDATE payments.orders SET status = $1, updated_at = NOW() WHERE id = $2`, [status, orderId]);
}

export async function updateOrderStatusIfMutable(orderId: string, status: PaymentStatus) {
  await run(
    `UPDATE payments.orders
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND status NOT IN ('SUCCESS', 'REFUNDED', 'CHARGEBACK')`,
    [status, orderId]
  );
}

export async function createOrUpdateTransaction(input: {
  orderId: string;
  provider: PaymentProvider;
  providerPaymentId: string;
  amount: number;
  currency: string;
  method?: string | null;
  status: PaymentStatus;
  paidAt?: string | null;
  providerResponse?: unknown;
}) {
  return queryOne<{ transaction_id: string }>(
    `INSERT INTO payments.transactions (
       transaction_id, order_id, provider, provider_payment_id, amount, currency,
       method, status, paid_at, provider_response
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
     ON CONFLICT (provider, provider_payment_id)
     DO UPDATE SET status = CASE
                     WHEN payments.transactions.status = 'SUCCESS' AND EXCLUDED.status <> 'REFUNDED' THEN payments.transactions.status
                     ELSE EXCLUDED.status
                   END,
                   paid_at = COALESCE(payments.transactions.paid_at, EXCLUDED.paid_at),
                   method = COALESCE(EXCLUDED.method, payments.transactions.method),
                   provider_response = EXCLUDED.provider_response
     RETURNING transaction_id`,
    [
      uuidv4(),
      input.orderId,
      input.provider,
      input.providerPaymentId,
      input.amount,
      input.currency,
      input.method || null,
      input.status,
      input.paidAt || null,
      safeJson(input.providerResponse || null),
    ]
  );
}

export async function findRefundByBookingId(bookingId: string) {
  return queryOne<{
    refund_id: string;
    provider_refund_id: string | null;
    status: RefundStatus;
  }>(
    `SELECT r.refund_id, r.provider_refund_id, r.status
     FROM payments.refunds r
     JOIN payments.transactions t ON t.transaction_id = r.transaction_id
     JOIN payments.orders o ON o.id = t.order_id
     WHERE o.booking_id = $1
     ORDER BY r.created_at DESC
     LIMIT 1`,
    [bookingId]
  );
}

export async function updateRefundProviderResult(refundId: string, providerRefundId: string, status: RefundStatus, providerResponse: unknown) {
  await run(
    `UPDATE payments.refunds
     SET provider_refund_id = $1, status = $2, provider_response = $3::jsonb, updated_at = NOW()
     WHERE refund_id = $4`,
    [providerRefundId, status, safeJson(providerResponse || null), refundId]
  );
}

export async function findSuccessfulTransactionByBookingId(bookingId: string) {
  return queryOne<{
    transaction_id: string;
    provider: PaymentProvider;
    provider_account_id: string | null;
    payment_mode: PaymentMode | null;
    provider_payment_id: string;
    amount: number;
    status: PaymentStatus;
  }>(
    `SELECT t.transaction_id, t.provider, o.provider_account_id, o.payment_mode, t.provider_payment_id, t.amount, t.status
     FROM payments.transactions t
     JOIN payments.orders o ON o.id = t.order_id
     WHERE o.booking_id = $1 AND t.status = 'SUCCESS'
     ORDER BY t.created_at DESC
     LIMIT 1`,
    [bookingId]
  );
}

export async function createRefund(input: {
  transactionId: string;
  amount: number;
  reason?: string | null;
  providerRefundId?: string | null;
  status?: RefundStatus;
  providerResponse?: unknown;
}) {
  const refundId = uuidv4();
  await run(
    `INSERT INTO payments.refunds (
       refund_id, transaction_id, amount, reason, provider_refund_id, status, provider_response
     ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
     ON CONFLICT (provider_refund_id) DO NOTHING`,
    [
      refundId,
      input.transactionId,
      input.amount,
      input.reason || null,
      input.providerRefundId || null,
      input.status || REFUND_STATUS.PENDING,
      safeJson(input.providerResponse || null),
    ]
  );
  return refundId;
}


export async function listPendingRefunds(limit = 20) {
  return query<{
    refund_id: string;
    booking_id: string;
    provider: PaymentProvider;
    provider_account_id: string | null;
    payment_mode: PaymentMode | null;
    provider_payment_id: string;
    amount: number;
    reason: string | null;
  }>(
    `SELECT r.refund_id, o.booking_id, t.provider, o.provider_account_id, o.payment_mode, t.provider_payment_id, r.amount, r.reason
     FROM payments.refunds r
     JOIN payments.transactions t ON t.transaction_id = r.transaction_id
     JOIN payments.orders o ON o.id = t.order_id
     WHERE r.status IN ('PENDING', 'FAILED')
       AND r.provider_refund_id IS NULL
     ORDER BY r.created_at ASC
     LIMIT $1`,
    [Math.max(1, Math.min(limit, 100))]
  );
}

export async function recordRefundAttemptFailure(refundId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await run(
    `UPDATE payments.refunds
     SET status = 'FAILED', provider_response = jsonb_build_object('last_error', $1::text, 'failed_at', NOW()), updated_at = NOW()
     WHERE refund_id = $2`,
    [message.slice(0, 1000), refundId]
  );
}
export async function logWebhook(input: {
  provider: PaymentProvider;
  eventType: string;
  providerEventId?: string | null;
  payload: unknown;
  signature?: string | null;
  responseStatus?: number | null;
  processed?: boolean;
  error?: string | null;
}) {
  const id = uuidv4();
  await run(
    `INSERT INTO payments.webhook_logs (
       id, provider, event_type, provider_event_id, payload, signature,
       response_status, processed, processing_error, processed_at
     ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,CASE WHEN $8 THEN NOW() ELSE NULL END)`,
    [
      id,
      input.provider,
      input.eventType,
      input.providerEventId || null,
      safeJson(input.payload),
      input.signature || null,
      input.responseStatus || null,
      Boolean(input.processed),
      input.error || null,
    ]
  );
  return id;
}

export async function claimPaymentEvent(input: {
  provider: PaymentProvider;
  providerEventId: string;
  payloadHash: string;
}) {
  const rows = await query<{ id: string; processed_at: string | null }>(
    `INSERT INTO payments.payment_events (id, provider, provider_event_id, payload_hash)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (provider, provider_event_id)
     DO UPDATE SET payload_hash = EXCLUDED.payload_hash
     WHERE payments.payment_events.processed_at IS NULL
     RETURNING id, processed_at`,
    [uuidv4(), input.provider, input.providerEventId, input.payloadHash]
  );
  return rows[0] || null;
}

export async function markPaymentEventProcessed(eventId: string) {
  await run(`UPDATE payments.payment_events SET processed_at = NOW() WHERE id = $1`, [eventId]);
}

export async function enqueuePaymentOutboxEvent(input: {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
}) {
  await run(
    `INSERT INTO payments.payment_events_outbox (id, aggregate_type, aggregate_id, event_type, payload)
     VALUES ($1,$2,$3,$4,$5::jsonb)`,
    [uuidv4(), input.aggregateType, input.aggregateId, input.eventType, safeJson(input.payload)]
  );
}

function normalizePaymentMode(value: unknown): PaymentMode | null {
  const configured = String(value || "").trim().toUpperCase();
  if (configured === "PLATFORM") return PAYMENT_MODE.PLATFORM_CONTROLLED;
  if (configured === PAYMENT_MODE.PLATFORM_CONTROLLED || configured === PAYMENT_MODE.ORGANIZER_OWNED || configured === PAYMENT_MODE.MARKETPLACE) {
    return configured;
  }
  return null;
}

export async function getActivePaymentMode(): Promise<PaymentModeConfig> {
  const configuredMode = normalizePaymentMode(process.env.PAYMENT_MODE);
  if (configuredMode) {
    return {
      mode: configuredMode,
      is_active: true,
      supports_commission: configuredMode === PAYMENT_MODE.MARKETPLACE || configuredMode === PAYMENT_MODE.PLATFORM_CONTROLLED,
      supports_split_settlement: configuredMode === PAYMENT_MODE.MARKETPLACE,
      supports_linked_accounts: configuredMode === PAYMENT_MODE.MARKETPLACE,
      supports_refunds: true,
      supports_transfers: configuredMode === PAYMENT_MODE.MARKETPLACE,
      metadata: { source: "env" },
    };
  }

  // Safe checks using information_schema to prevent transaction aborts
  const checkRuntimeTable = await queryOne(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'payments' AND table_name = 'payment_runtime_config'
    LIMIT 1
  `);
  if (checkRuntimeTable) {
    try {
      const row = await queryOne<{
        payment_mode: PaymentMode;
        is_active: boolean;
        supports_marketplace: boolean;
        supports_refunds: boolean;
        supports_transfers: boolean;
        supports_commission: boolean;
        metadata?: Record<string, unknown> | null;
      }>(
        `SELECT payment_mode, is_active, supports_marketplace, supports_refunds,
                supports_transfers, supports_commission, metadata
         FROM payments.payment_runtime_config
         WHERE is_active = TRUE
         LIMIT 1`,
        []
      );
      if (row) {
        return {
          mode: row.payment_mode,
          is_active: row.is_active,
          supports_commission: row.supports_commission,
          supports_split_settlement: row.supports_marketplace,
          supports_linked_accounts: row.supports_marketplace,
          supports_refunds: row.supports_refunds,
          supports_transfers: row.supports_transfers,
          metadata: row.metadata,
        };
      }
    } catch (error: any) {
      if (error?.code !== "42P01") throw error;
    }
  }

  const checkModesTable = await queryOne(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'payments' AND table_name = 'payment_modes'
    LIMIT 1
  `);
  if (checkModesTable) {
    try {
      const row = await queryOne<PaymentModeConfig>(
        `SELECT mode, is_active, supports_commission, supports_split_settlement,
                supports_linked_accounts, supports_refunds, supports_transfers, metadata
         FROM payments.payment_modes
         WHERE is_active = TRUE
         LIMIT 1`,
        []
      );
      if (row) return row;
    } catch (error: any) {
      if (error?.code !== "42P01") throw error;
    }
  }

  return {
    mode: PAYMENT_MODE.ORGANIZER_OWNED,
    is_active: true,
    supports_commission: false,
    supports_split_settlement: false,
    supports_linked_accounts: false,
    supports_refunds: true,
    supports_transfers: false,
    metadata: { source: "default" },
  };
}

export async function findDefaultProviderAccount(organizerId: string, ownershipModel: PaymentMode): Promise<ProviderAccount | null> {
  try {
    const row = await queryOne<ProviderAccount>(
      `SELECT id, organizer_id, provider, ownership_model, provider_account_id, linked_account_id, merchant_id, beneficiary_id, is_default, status, verification_status, supports_refunds, supports_settlement, supports_webhooks, metadata, api_key_enc, api_secret_enc, webhook_secret_enc, credential_status, verified_at, last_verified_at, last_api_check_at, last_webhook_received_at, last_failure_at, verification_error, secret_version, credential_source, rotation_required FROM payments.provider_accounts
       WHERE organizer_id = $1
         AND ownership_model = $2
         AND is_default = TRUE
         AND status = 'active'
         AND verification_status = 'verified'
       ORDER BY created_at DESC
       LIMIT 1`,
      [organizerId, ownershipModel]
    );
    if (row) return row;
  } catch (error: any) {
    if (error?.code !== "42P01") throw error;
  }
  return null;
}

export async function findProviderAccountById(id: string | null | undefined): Promise<ProviderAccount | null> {
  if (!id) return null;
  try {
    return await queryOne<ProviderAccount>(`SELECT id, organizer_id, provider, ownership_model, provider_account_id, linked_account_id, merchant_id, beneficiary_id, is_default, status, verification_status, supports_refunds, supports_settlement, supports_webhooks, metadata, api_key_enc, api_secret_enc, webhook_secret_enc, credential_status, verified_at, last_verified_at, last_api_check_at, last_webhook_received_at, last_failure_at, verification_error, secret_version, credential_source, rotation_required FROM payments.provider_accounts WHERE id = $1`, [id]);
  } catch (error: any) {
    if (error?.code !== "42P01") throw error;
    return null;
  }
}

export async function findProviderAccountByRefundProviderId(provider: PaymentProvider, providerRefundId: string): Promise<ProviderAccount | null> {
  try {
    return await queryOne<ProviderAccount>(
      `SELECT pa.id, pa.organizer_id, pa.provider, pa.ownership_model, pa.provider_account_id, pa.linked_account_id, pa.merchant_id, pa.beneficiary_id, pa.is_default, pa.status, pa.verification_status, pa.supports_refunds, pa.supports_settlement, pa.supports_webhooks, pa.metadata, pa.api_key_enc, pa.api_secret_enc, pa.webhook_secret_enc, pa.credential_status, pa.verified_at, pa.last_verified_at, pa.last_api_check_at, pa.last_webhook_received_at, pa.last_failure_at, pa.verification_error, pa.secret_version, pa.credential_source, pa.rotation_required
       FROM payments.refunds r
       JOIN payments.transactions t ON t.transaction_id = r.transaction_id
       JOIN payments.orders o ON o.id = t.order_id
       JOIN payments.provider_accounts pa ON pa.id = o.provider_account_id
       WHERE t.provider = $1 AND r.provider_refund_id = $2
       LIMIT 1`,
      [provider, providerRefundId]
    );
  } catch (error: any) {
    if (error?.code !== "42P01") throw error;
    return null;
  }
}
export async function findProviderAccountByProviderAccountId(provider: PaymentProvider, providerAccountId: string): Promise<ProviderAccount | null> {
  try {
    return await queryOne<ProviderAccount>(
      `SELECT id, organizer_id, provider, ownership_model, provider_account_id, linked_account_id, merchant_id, beneficiary_id, is_default, status, verification_status, supports_refunds, supports_settlement, supports_webhooks, metadata, api_key_enc, api_secret_enc, webhook_secret_enc, credential_status, verified_at, last_verified_at, last_api_check_at, last_webhook_received_at, last_failure_at, verification_error, secret_version, credential_source, rotation_required FROM payments.provider_accounts
       WHERE provider = $1 AND (provider_account_id = $2 OR merchant_id = $2)
       LIMIT 1`,
      [provider, providerAccountId]
    );
  } catch (error: any) {
    if (error?.code !== "42P01") throw error;
    return null;
  }
}








