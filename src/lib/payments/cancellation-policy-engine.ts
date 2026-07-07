export interface CancellationRule {
  hours_before: number;
  refund_pct: number;
}

export interface BookingDetailsForPolicy {
  amount: number; // in paise
  trip_date: string; // ISO string or text representing travel date
}

export interface PolicyDefinition {
  id?: string;
  policy_name: string;
  free_cancel_before_hours: number;
  rules_json: CancellationRule[] | string;
  is_refundable: boolean;
  is_active: boolean;
}

export const DEFAULT_CANCELLATION_RULES: CancellationRule[] = [
  { hours_before: 72, refund_pct: 100 }, // 72+ hours before trip -> 100%
  { hours_before: 24, refund_pct: 50 },  // 24 to 72 hours before trip -> 50%
  { hours_before: 0, refund_pct: 0 }     // Under 24 hours -> 0%
];

export class CancellationPolicyEngine {
  /**
   * Calculates the refund eligibility, percentage, refund amount and cancellation fee
   */
  static calculateRefund(
    booking: BookingDetailsForPolicy,
    _policy: PolicyDefinition | null | undefined
  ): {
    allowed: boolean;
    refundPercentage: number;
    refundAmount: number; // paise
    cancellationFee: number; // paise
    message: string;
    rules: CancellationRule[];
  } {
    // GoTogether uses one platform-standard traveler cancellation policy.
    // Old organizer/trip policy rows may still exist in the database, but they
    // must not override the 72h/24h refund windows.
    const sortedRules = [...DEFAULT_CANCELLATION_RULES].sort((a, b) => b.hours_before - a.hours_before);

    // 1. Compute time difference
    const tripStart = new Date(booking.trip_date);
    const now = new Date();
    const msDiff = tripStart.getTime() - now.getTime();
    const hoursRemaining = msDiff / (1000 * 60 * 60);

    // If trip already started
    if (hoursRemaining <= 0) {
      return {
        allowed: false,
        refundPercentage: 0,
        refundAmount: 0,
        cancellationFee: booking.amount,
        message: "Cancellation closed. Trip has already started.",
        rules: sortedRules
      };
    }

    // 2. Find matching rule
    // We iterate from most restrictive/latest hours to least.
    // e.g. if hoursRemaining is 80:
    // rule 72 (80 >= 72) -> matches! (since rules are sorted desc, 72 is the first rule where hoursRemaining >= hours_before)
    let matchedRule: CancellationRule | null = null;
    for (const rule of sortedRules) {
      if (hoursRemaining >= rule.hours_before) {
        matchedRule = rule;
        break; // first match is the highest matching threshold
      }
    }

    // If no rule matches (e.g. less than the minimum rule, typically hours_before = 0 is 0%)
    const refundPercentage = matchedRule ? matchedRule.refund_pct : 0;
    const allowed = true;
    const refundAmount = Math.floor((booking.amount * refundPercentage) / 100);
    const cancellationFee = booking.amount - refundAmount;

    let message = `Cancellation is available. Refund: ${refundPercentage}%.`;
    if (refundPercentage === 100) {
      message = "Free cancellation available. 100% refund.";
    } else if (refundPercentage === 0) {
      message = "Cancellation under 24 hours before the trip is non-refundable.";
    }

    return {
      allowed,
      refundPercentage,
      refundAmount,
      cancellationFee,
      message,
      rules: sortedRules
    };
  }
}

