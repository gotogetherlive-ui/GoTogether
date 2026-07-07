import { PAYMENT_PROVIDER, type PaymentProvider } from "./domain";

export const SUPPORTED_PAYMENT_PROVIDERS = [
  PAYMENT_PROVIDER.RAZORPAY,
  PAYMENT_PROVIDER.CASHFREE,
] as const;

export const IMPLEMENTED_PAYMENT_PROVIDERS = [
  PAYMENT_PROVIDER.RAZORPAY,
  PAYMENT_PROVIDER.CASHFREE,
] as const;

export function normalizePaymentProvider(value: unknown): PaymentProvider | null {
  const provider = String(value || "").trim().toUpperCase();
  return SUPPORTED_PAYMENT_PROVIDERS.includes(provider as PaymentProvider)
    ? provider as PaymentProvider
    : null;
}

export function isPaymentProviderImplemented(provider: PaymentProvider): boolean {
  return IMPLEMENTED_PAYMENT_PROVIDERS.includes(provider as typeof IMPLEMENTED_PAYMENT_PROVIDERS[number]);
}

export function parseEnabledPaymentProviders(value: string | undefined): PaymentProvider[] {
  const defaultProviders = "RAZORPAY,CASHFREE";
  const requested = (value || defaultProviders)
    .split(",")
    .map((provider) => normalizePaymentProvider(provider))
    .filter((provider): provider is PaymentProvider => Boolean(provider));

  const implemented = requested.filter(isPaymentProviderImplemented);
  return implemented.length ? implemented : [PAYMENT_PROVIDER.RAZORPAY];
}
