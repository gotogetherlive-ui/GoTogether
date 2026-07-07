import { PAYMENT_MODE, type PaymentMode } from "../domain";
import type { PaymentStrategy } from "./types";
import { OrganizerOwnedPaymentStrategy } from "./organizer-owned";
import { PlatformControlledPaymentStrategy } from "./platform-controlled";
import { MarketplacePaymentStrategy } from "./marketplace";

const strategies: Record<PaymentMode, PaymentStrategy> = {
  [PAYMENT_MODE.PLATFORM_CONTROLLED]: new PlatformControlledPaymentStrategy(),
  [PAYMENT_MODE.ORGANIZER_OWNED]: new OrganizerOwnedPaymentStrategy(),
  [PAYMENT_MODE.MARKETPLACE]: new MarketplacePaymentStrategy(),
};

export function getPaymentStrategy(mode: PaymentMode): PaymentStrategy {
  return strategies[mode];
}
