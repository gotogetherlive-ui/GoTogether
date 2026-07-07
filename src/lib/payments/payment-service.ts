import type { PaymentModeConfig, PaymentProvider, ProviderAccount } from "./domain";
import { getPaymentProviderAdapter } from "./adapters/registry";
import type { ParsedWebhookPayment, ProviderOrderResult } from "./adapters/types";
import { getActivePaymentMode } from "./repository";
import { getPaymentStrategy } from "./strategies/registry";
import { ProviderHealthService } from "./health";

export interface CreatePaymentInput {
  orderId: string;
  bookingId: string;
  bookingRef: string;
  tripId: string;
  userId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerAccount?: ProviderAccount | null;
  notes: Record<string, string>;
}

export interface VerifyPaymentInput {
  provider: PaymentProvider;
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
  providerAccount?: ProviderAccount | null;
}

export interface VerifyWebhookInput {
  provider: PaymentProvider;
  rawBody: string;
  signature: string | null;
  headers: Headers;
  providerAccount?: ProviderAccount | null;
}

export interface RefundPaymentInput {
  provider: PaymentProvider;
  providerPaymentId: string;
  amount: number;
  notes: Record<string, string>;
  providerAccount?: ProviderAccount | null;
}

async function activeMode(): Promise<PaymentModeConfig> {
  return getActivePaymentMode();
}

export class PaymentService {
  static async getActiveMode() {
    return activeMode();
  }

  static async createPayment(input: CreatePaymentInput): Promise<ProviderOrderResult> {
    const modeConfig = await activeMode();
    const strategy = getPaymentStrategy(modeConfig.mode);
    const adapter = getPaymentProviderAdapter(input.provider);
    const start = Date.now();
    try {
      const res = await strategy.createPayment({ ...input, modeConfig }, adapter);
      await ProviderHealthService.recordSuccess(input.provider, Date.now() - start);
      return res;
    } catch (err) {
      await ProviderHealthService.recordFailure(input.provider, err);
      throw err;
    }
  }

  static async verifyPayment(input: VerifyPaymentInput): Promise<boolean> {
    const modeConfig = await activeMode();
    const strategy = getPaymentStrategy(modeConfig.mode);
    const adapter = getPaymentProviderAdapter(input.provider);
    return strategy.verifyPayment({ ...input, modeConfig }, adapter);
  }

  static async verifyWebhook(input: VerifyWebhookInput): Promise<boolean> {
    const modeConfig = await activeMode();
    const strategy = getPaymentStrategy(modeConfig.mode);
    const adapter = getPaymentProviderAdapter(input.provider);
    return strategy.verifyWebhook({
      rawBody: input.rawBody,
      signature: input.signature,
      headers: input.headers,
      modeConfig,
      providerAccount: input.providerAccount,
    }, adapter);
  }

  static parseWebhook(provider: PaymentProvider, rawBody: string, headers: Headers): ParsedWebhookPayment {
    return getPaymentProviderAdapter(provider).parseWebhook(rawBody, headers);
  }

  static async refundPayment(input: RefundPaymentInput): Promise<unknown> {
    const modeConfig = await activeMode();
    const strategy = getPaymentStrategy(modeConfig.mode);
    const adapter = getPaymentProviderAdapter(input.provider);
    const start = Date.now();
    try {
      const res = await strategy.refundPayment({ ...input, modeConfig }, adapter);
      await ProviderHealthService.recordSuccess(input.provider, Date.now() - start);
      return res;
    } catch (err) {
      await ProviderHealthService.recordFailure(input.provider, err);
      throw err;
    }
  }
}
