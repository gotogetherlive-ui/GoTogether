import type { PaymentModeConfig, PaymentProvider, ProviderAccount } from "../domain";
import type { PaymentProviderAdapter, ProviderOrderResult } from "../adapters/types";

export interface StrategyCreatePaymentInput {
  orderId: string;
  bookingId: string;
  bookingRef: string;
  tripId: string;
  userId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerAccount?: ProviderAccount | null;
  modeConfig: PaymentModeConfig;
  notes: Record<string, string>;
}

export interface StrategyVerifyPaymentInput {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
  providerAccount?: ProviderAccount | null;
  modeConfig: PaymentModeConfig;
}

export interface StrategyWebhookInput {
  rawBody: string;
  signature: string | null;
  headers: Headers;
  modeConfig: PaymentModeConfig;
  providerAccount?: ProviderAccount | null;
}

export interface StrategyRefundInput {
  providerPaymentId: string;
  amount: number;
  notes: Record<string, string>;
  providerAccount?: ProviderAccount | null;
  modeConfig: PaymentModeConfig;
}

export interface PaymentStrategy {
  createPayment(input: StrategyCreatePaymentInput, adapter: PaymentProviderAdapter): Promise<ProviderOrderResult>;
  verifyPayment(input: StrategyVerifyPaymentInput, adapter: PaymentProviderAdapter): boolean;
  verifyWebhook(input: StrategyWebhookInput, adapter: PaymentProviderAdapter): boolean;
  refundPayment(input: StrategyRefundInput, adapter: PaymentProviderAdapter): Promise<unknown>;
}
