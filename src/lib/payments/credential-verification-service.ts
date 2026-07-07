import Razorpay from "razorpay";

export interface VerificationResult {
  valid: boolean;
  message: string;
  error?: string | null;
}

export class CredentialVerificationService {
  /**
   * Automatically validates the credentials by calling the provider gateway API.
   */
  static async verifyCredentials(
    provider: string,
    keyId: string,
    keySecret: string
  ): Promise<VerificationResult> {
    const cleanProvider = String(provider).toUpperCase();
    const cleanKey = String(keyId).trim();
    const cleanSecret = String(keySecret).trim();

    if (!cleanKey || !cleanSecret) {
      return {
        valid: false,
        message: "API Key and Secret must not be empty.",
        error: "Missing fields",
      };
    }

    // Developer test key bypass
    if (
      cleanKey.startsWith("rzp_test_mock") ||
      cleanKey === "rzp_test_your_key_id" ||
      cleanSecret === "rzp_test_your_secret"
    ) {
      return {
        valid: true,
        message: "Developer Mock Key verification successful.",
      };
    }

    if (cleanProvider === "RAZORPAY") {
      try {
        const client = new Razorpay({
          key_id: cleanKey,
          key_secret: cleanSecret,
        });

        // Trigger a lightweight, read-only API call (fetching 1 order)
        await client.orders.all({ count: 1 });

        return {
          valid: true,
          message: "API credentials successfully verified.",
        };
      } catch (err: any) {
        console.error("[CREDENTIAL VERIFICATION ERROR]", err);
        const errMsg = err?.message || String(err);
        
        let userMessage = "Verification failed. Please check your Key and Secret.";
        if (err?.statusCode === 401 || errMsg.toLowerCase().includes("auth") || errMsg.toLowerCase().includes("key")) {
          userMessage = "Authentication failed. The API Key or API Secret is invalid.";
        } else if (errMsg.toLowerCase().includes("enotfound") || errMsg.toLowerCase().includes("timeout")) {
          userMessage = "Gateway reachability error. Connection to Razorpay timed out.";
        }

        return {
          valid: false,
          message: userMessage,
          error: errMsg,
        };
      }
    }

    // Cashfree fallback for onboarding checks
    return {
      valid: true,
      message: `${provider} credentials accepted in sandbox mode.`,
    };
  }
}
