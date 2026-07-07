import type { PaymentMode, PaymentProvider, ProviderAccount, PaymentStatus } from "../domain";

export interface CreateProviderOrderInput {
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
  mode: PaymentMode;
  providerAccount?: ProviderAccount | null;
  commissionAmount?: number;
}

export interface ProviderOrderResult {
  id: string;
  raw: unknown;
}

export interface VerifyCheckoutPaymentInput {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
  providerAccount?: ProviderAccount | null;
  mode: PaymentMode;
}

export interface WebhookVerificationInput {
  rawBody: string;
  signature: string | null;
  headers: Headers;
  mode: PaymentMode;
  providerAccount?: ProviderAccount | null;
}

export interface ParsedWebhookPayment {
  eventType: string;
  providerEventId: string;
  payment?: {
    providerOrderId: string;
    providerPaymentId: string;
    amount: number;
    currency: string;
    method: string | null;
    raw: unknown;
  };
  refund?: {
    providerRefundId: string;
    providerPaymentId: string;
    amount: number;
    currency: string;
    status: string;
    raw: unknown;
  };
  rawEvent: unknown;
}

export interface RefundPaymentInput {
  providerPaymentId: string;
  amount: number;
  notes: Record<string, string>;
  providerAccount?: ProviderAccount | null;
  mode: PaymentMode;
}

export interface PaymentProviderAdapter {
  provider: PaymentProvider;
  createOrder(input: CreateProviderOrderInput): Promise<ProviderOrderResult>;
  verifyCheckoutPayment(input: VerifyCheckoutPaymentInput): boolean;
  verifyWebhook(input: WebhookVerificationInput): boolean;
  parseWebhook(rawBody: string, headers: Headers): ParsedWebhookPayment;
  refundPayment(input: RefundPaymentInput): Promise<unknown>;
  fetchOrderStatus?(providerOrderId: string, providerAccount?: ProviderAccount | null): Promise<{ status: PaymentStatus; raw: unknown } | null>;
}
