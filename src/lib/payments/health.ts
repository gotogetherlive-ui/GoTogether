import { run, queryOne } from "@/lib/db";
import { type PaymentProvider } from "./domain";

export interface ProviderHealthMetrics {
  provider: PaymentProvider;
  circuit_state: "CLOSED" | "OPEN" | "HALF_OPEN";
  success_count: number;
  failure_count: number;
  total_latency_ms: string | number;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error_message: string | null;
  updated_at: string;
}

export class ProviderHealthService {
  static async recordSuccess(provider: PaymentProvider, latencyMs: number) {
    try {
      await run(
        `UPDATE payments.provider_health
         SET success_count = success_count + 1,
             total_latency_ms = total_latency_ms + $1,
             last_success_at = NOW(),
             circuit_state = CASE WHEN circuit_state = 'OPEN' THEN 'HALF_OPEN'::text ELSE circuit_state END,
             updated_at = NOW()
         WHERE provider = $2`,
        [latencyMs, provider]
      );
    } catch (err) {
      console.error(`[HEALTH SERVICE] Failed to record success for ${provider}:`, err);
    }
  }

  static async recordFailure(provider: PaymentProvider, error: unknown) {
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await run(
        `UPDATE payments.provider_health
         SET failure_count = failure_count + 1,
             last_failure_at = NOW(),
             last_error_message = $1,
             circuit_state = CASE WHEN failure_count >= 5 THEN 'OPEN'::text ELSE circuit_state END,
             updated_at = NOW()
         WHERE provider = $2`,
        [errorMessage.slice(0, 1000), provider]
      );
    } catch (err) {
      console.error(`[HEALTH SERVICE] Failed to record failure for ${provider}:`, err);
    }
  }

  static async getHealth(provider: PaymentProvider): Promise<ProviderHealthMetrics | null> {
    try {
      return await queryOne<ProviderHealthMetrics>(
        `SELECT provider, circuit_state, success_count, failure_count, total_latency_ms, last_success_at, last_failure_at, last_error_message, updated_at FROM payments.provider_health WHERE provider = $1`,
        [provider]
      );
    } catch (err) {
      console.error(`[HEALTH SERVICE] Failed to get health for ${provider}:`, err);
      return null;
    }
  }

  static async getHealthScore(provider: PaymentProvider): Promise<number> {
    const health = await this.getHealth(provider);
    if (!health) return 0;
    const successes = Number(health.success_count || 0);
    const failures = Number(health.failure_count || 0);
    const total = successes + failures;
    if (total === 0) return 100; // Default score
    return Math.round((successes / total) * 100);
  }
}
