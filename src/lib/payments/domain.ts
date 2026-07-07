export const PAYMENT_PROVIDER = {
  RAZORPAY: "RAZORPAY",
  CASHFREE: "CASHFREE",
} as const;

export const PAYMENT_MODE = {
  PLATFORM_CONTROLLED: "PLATFORM_CONTROLLED",
  ORGANIZER_OWNED: "ORGANIZER_OWNED",
  MARKETPLACE: "MARKETPLACE",
} as const;

export const PAYMENT_STATUS = {
  CREATED: "CREATED",
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  CHARGEBACK: "CHARGEBACK",
} as const;

export const BOOKING_STATUS = {
  PENDING_PAYMENT: "pending_payment",
  PAYMENT_PROCESSING: "payment_processing",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  REFUND_PENDING: "refund_pending",
  REFUNDED: "refunded",
  FAILED: "failed",
} as const;

export const REFUND_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

export type PaymentProvider = typeof PAYMENT_PROVIDER[keyof typeof PAYMENT_PROVIDER];
export type PaymentMode = typeof PAYMENT_MODE[keyof typeof PAYMENT_MODE];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];
export type RefundStatus = typeof REFUND_STATUS[keyof typeof REFUND_STATUS];
export interface PaymentModeConfig {
  mode: PaymentMode;
  is_active: boolean;
  supports_commission: boolean;
  supports_split_settlement: boolean;
  supports_linked_accounts: boolean;
  supports_refunds: boolean;
  supports_transfers: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface ProviderAccount {
  id: string;
  organizer_id: string;
  provider: PaymentProvider;
  ownership_model: PaymentMode;
  provider_account_id: string | null;
  linked_account_id: string | null;
  merchant_id: string | null;
  beneficiary_id: string | null;
  is_default: boolean;
  status: string;
  verification_status: string;
  supports_refunds: boolean;
  supports_settlement: boolean;
  supports_webhooks: boolean;
  metadata: Record<string, unknown> | null;
  verified_at: string | null;
  api_key_enc?: string | null;
  api_secret_enc?: string | null;
  webhook_secret_enc?: string | null;
}
