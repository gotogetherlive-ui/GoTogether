import { PAYMENT_PROVIDER, type PaymentProvider } from "../domain";
import { isPaymentProviderImplemented } from "../provider-config";
import type { PaymentProviderAdapter } from "./types";
import { RazorpayAdapter } from "./razorpay";
import { CashfreeAdapter } from "./cashfree";

const adapters: Record<PaymentProvider, PaymentProviderAdapter | undefined> = {
  [PAYMENT_PROVIDER.RAZORPAY]: new RazorpayAdapter(),
  [PAYMENT_PROVIDER.CASHFREE]: new CashfreeAdapter(),
};

export function getPaymentProviderAdapter(provider: PaymentProvider): PaymentProviderAdapter {
  const adapter = adapters[provider];
  if (!adapter || !isPaymentProviderImplemented(provider)) {
    throw new Error(`Payment provider ${provider} is configured but no production adapter is implemented`);
  }
  return adapter;
}
