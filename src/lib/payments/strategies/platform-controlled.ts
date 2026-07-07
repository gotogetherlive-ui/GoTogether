import type { PaymentProviderAdapter } from "../adapters/types";
import type { PaymentStrategy, StrategyCreatePaymentInput, StrategyRefundInput, StrategyVerifyPaymentInput, StrategyWebhookInput } from "./types";

export class PlatformControlledPaymentStrategy implements PaymentStrategy {
  createPayment(input: StrategyCreatePaymentInput, adapter: PaymentProviderAdapter) {
    return adapter.createOrder({
      amount: input.amount,
      currency: input.currency,
      receipt: input.orderId,
      notes: input.notes,
      mode: input.modeConfig.mode,
      providerAccount: null,
    });
  }

  verifyPayment(input: StrategyVerifyPaymentInput, adapter: PaymentProviderAdapter) {
    return adapter.verifyCheckoutPayment({
      providerOrderId: input.providerOrderId,
      providerPaymentId: input.providerPaymentId,
      signature: input.signature,
      providerAccount: input.providerAccount || null,
      mode: input.modeConfig.mode,
    });
  }

  verifyWebhook(input: StrategyWebhookInput, adapter: PaymentProviderAdapter) {
    return adapter.verifyWebhook({
      rawBody: input.rawBody,
      signature: input.signature,
      headers: input.headers,
      mode: input.modeConfig.mode,
      providerAccount: input.providerAccount || null,
    });
  }

  refundPayment(input: StrategyRefundInput, adapter: PaymentProviderAdapter) {
    return adapter.refundPayment({
      providerPaymentId: input.providerPaymentId,
      amount: input.amount,
      notes: input.notes,
      providerAccount: input.providerAccount || null,
      mode: input.modeConfig.mode,
    });
  }
}

