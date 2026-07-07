import type { PaymentProviderAdapter } from "../adapters/types";
import type { PaymentStrategy, StrategyCreatePaymentInput, StrategyRefundInput, StrategyVerifyPaymentInput, StrategyWebhookInput } from "./types";

function flagEnabled(name: string): boolean {
  return ["1", "true", "yes", "on"].includes(String(process.env[name] || "").toLowerCase());
}

function assertMarketplaceEnabled(input: StrategyCreatePaymentInput | StrategyRefundInput | StrategyVerifyPaymentInput | StrategyWebhookInput) {
  if (!flagEnabled("ENABLE_MARKETPLACE")) throw new Error("Marketplace payments are disabled");
  if ("modeConfig" in input && !input.modeConfig.supports_linked_accounts) throw new Error("Active payment mode does not support linked accounts");
}

export class MarketplacePaymentStrategy implements PaymentStrategy {
  createPayment(input: StrategyCreatePaymentInput, adapter: PaymentProviderAdapter) {
    assertMarketplaceEnabled(input);
    if (!flagEnabled("ENABLE_SPLIT_SETTLEMENT") || !flagEnabled("ENABLE_ROUTE_TRANSFERS")) {
      throw new Error("Marketplace split settlement is disabled");
    }
    if (!input.providerAccount) {
      throw new Error("Marketplace linked provider account is required");
    }
    const commissionAmount = flagEnabled("ENABLE_PLATFORM_COMMISSION")
      ? Number(process.env.PLATFORM_COMMISSION_AMOUNT_PAISE || 0)
      : 0;
    return adapter.createOrder({
      amount: input.amount,
      currency: input.currency,
      receipt: input.orderId,
      notes: input.notes,
      mode: input.modeConfig.mode,
      providerAccount: input.providerAccount,
      commissionAmount,
    });
  }

  verifyPayment(input: StrategyVerifyPaymentInput, adapter: PaymentProviderAdapter) {
    assertMarketplaceEnabled(input);
    return adapter.verifyCheckoutPayment({
      providerOrderId: input.providerOrderId,
      providerPaymentId: input.providerPaymentId,
      signature: input.signature,
      providerAccount: input.providerAccount,
      mode: input.modeConfig.mode,
    });
  }

  verifyWebhook(input: StrategyWebhookInput, adapter: PaymentProviderAdapter) {
    assertMarketplaceEnabled(input);
    return adapter.verifyWebhook({
      rawBody: input.rawBody,
      signature: input.signature,
      headers: input.headers,
      mode: input.modeConfig.mode,
      providerAccount: input.providerAccount,
    });
  }

  refundPayment(input: StrategyRefundInput, adapter: PaymentProviderAdapter) {
    assertMarketplaceEnabled(input);
    return adapter.refundPayment({
      providerPaymentId: input.providerPaymentId,
      amount: input.amount,
      notes: input.notes,
      providerAccount: input.providerAccount,
      mode: input.modeConfig.mode,
    });
  }
}

