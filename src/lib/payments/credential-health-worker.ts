import { query, run } from "@/lib/db";
import { SecretManager } from "./secret-manager";
import { CredentialVerificationService } from "./credential-verification-service";

export class ProviderCredentialHealthWorker {
  /**
   * Daily job executing health checks across all organizer payment gateway credentials.
   */
  static async checkAllCredentials(): Promise<{
    processed: number;
    failed: number;
    flaggedWebhooks: number;
  }> {
    let processed = 0;
    let failed = 0;
    let flaggedWebhooks = 0;

    try {
      // 1. Fetch all accounts
      const accounts = await query(
        `SELECT id, provider, api_key_enc, api_secret_enc, webhook_secret_enc,
                last_webhook_received_at, credential_status, organizer_id
         FROM payments.provider_accounts`
      );

      for (const account of accounts) {
        processed++;
        let valid = false;
        let errorMessage: string | null = null;

        // Verify API credentials
        if (account.api_key_enc && account.api_secret_enc) {
          try {
            const keyId = SecretManager.decrypt(account.api_key_enc);
            const keySecret = SecretManager.decrypt(account.api_secret_enc);

            const result = await CredentialVerificationService.verifyCredentials(
              account.provider,
              keyId,
              keySecret
            );

            valid = result.valid;
            errorMessage = result.valid ? null : result.message;
          } catch (err: any) {
            valid = false;
            errorMessage = err?.message || "Decryption/Internal error";
          }
        } else {
          errorMessage = "Missing API Key/Secret configuration";
        }

        // Webhook configuration checks (Flag if inactive for 30 days)
        let webhookStatus = "active";
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const lastWebhook = account.last_webhook_received_at
          ? new Date(account.last_webhook_received_at)
          : null;

        const requiresSeparateWebhookSecret = account.provider === "RAZORPAY";
        if (requiresSeparateWebhookSecret && !account.webhook_secret_enc) {
          webhookStatus = "no_secret";
          flaggedWebhooks++;
        } else if (!lastWebhook || lastWebhook < thirtyDaysAgo) {
          webhookStatus = "inactive_30d";
          flaggedWebhooks++;
        }

        // Update database status log
        const statusVal = valid ? "verified" : "failed";
        if (!valid) failed++;

        await run(
          `UPDATE payments.provider_accounts
           SET credential_status = $1,
               last_api_check_at = NOW(),
               last_verified_at = CASE WHEN $2 = TRUE THEN NOW() ELSE last_verified_at END,
               last_failure_at = CASE WHEN $2 = FALSE THEN NOW() ELSE last_failure_at END,
               verification_error = $3,
               rotation_required = CASE WHEN $2 = FALSE THEN TRUE ELSE rotation_required END,
               metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('webhook_health', $4::text)
           WHERE id = $5`,
          [statusVal, valid, errorMessage, webhookStatus, account.id]
        );
      }

      console.log(
        `[HEALTH WORKER] Done. Checked: ${processed}, Failed: ${failed}, Inactive Webhooks: ${flaggedWebhooks}`
      );
    } catch (err) {
      console.error("[HEALTH WORKER FATAL ERROR]", err);
    }

    return { processed, failed, flaggedWebhooks };
  }
}
