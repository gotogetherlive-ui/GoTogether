import Razorpay from "razorpay";
import crypto from "node:crypto";
import { PAYMENT_MODE, PAYMENT_PROVIDER, type ProviderAccount, type PaymentStatus } from "../domain";
import { hashPayload, timingSafeHexEqual } from "../utils";
import { SecretManager } from "../secret-manager";
import type {
  CreateProviderOrderInput,
  PaymentProviderAdapter,
  ProviderOrderResult,
  RefundPaymentInput,
  VerifyCheckoutPaymentInput,
  WebhookVerificationInput,
  ParsedWebhookPayment,
} from "./types";

function allowPaymentSimulation(): boolean {
  const simulationRequested = ['1', 'true', 'yes', 'on'].includes(String(process.env.ALLOW_PAYMENT_SIMULATION || '').toLowerCase());
  if (process.env.NODE_ENV !== 'production') return true;
  return simulationRequested && ['1', 'true', 'yes', 'on'].includes(String(process.env.ALLOW_UNSAFE_PRODUCTION_PAYMENT_SIMULATION || '').toLowerCase());
}

function getRazorpayClient(providerAccount?: ProviderAccount | null): Razorpay {
  let key_id = process.env.RAZORPAY_KEY_ID;
  let key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (providerAccount && providerAccount.ownership_model === PAYMENT_MODE.ORGANIZER_OWNED) {
    if (!providerAccount.api_key_enc || !providerAccount.api_secret_enc) {
      throw new Error("Organizer-Owned mode requires organizer credentials to be configured");
    }
    try {
      key_id = SecretManager.decrypt(providerAccount.api_key_enc);
      key_secret = SecretManager.decrypt(providerAccount.api_secret_enc);
    } catch (err) {
      console.error("Failed to decrypt organizer provider credentials:", err);
      throw new Error("Organizer credentials decryption failed");
    }
  } else if (providerAccount && providerAccount.api_key_enc && providerAccount.api_secret_enc) {
    try {
      key_id = SecretManager.decrypt(providerAccount.api_key_enc);
      key_secret = SecretManager.decrypt(providerAccount.api_secret_enc);
    } catch (err) {
      console.error("Failed to decrypt organizer provider credentials:", err);
      throw new Error("Organizer credentials decryption failed");
    }
  }

  if (!key_id || !key_secret) throw new Error("Razorpay credentials are not configured");
  return new Razorpay({ key_id, key_secret });
}

function verifyHmac(message: string, secret: string | undefined, signature: string | null): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(message).digest("hex");
  return timingSafeHexEqual(expected, signature);
}

function marketplaceTransferAccount(account: ProviderAccount): string | null {
  return account.linked_account_id || account.provider_account_id || account.merchant_id || account.beneficiary_id || null;
}

export class RazorpayAdapter implements PaymentProviderAdapter {
  provider = PAYMENT_PROVIDER.RAZORPAY;

  async createOrder(input: CreateProviderOrderInput): Promise<ProviderOrderResult> {
    const isConfigured = (input.providerAccount?.api_key_enc && input.providerAccount.api_secret_enc) ||
                         (process.env.RAZORPAY_KEY_ID &&
                         process.env.RAZORPAY_KEY_ID !== 'rzp_test_your_key_id' &&
                         process.env.RAZORPAY_KEY_SECRET &&
                         process.env.RAZORPAY_KEY_SECRET !== 'your_razorpay_key_secret');
    if (!isConfigured && allowPaymentSimulation()) {
      return {
        id: `rzp_order_mock_${Math.random().toString(36).substring(2, 15)}`,
        raw: { simulated: true, provider: "RAZORPAY" }
      };
    }

    const razorpay = getRazorpayClient(input.providerAccount);
    const orderPayload: Record<string, unknown> = {
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
      partial_payment: false,
    };

    if (input.mode === PAYMENT_MODE.MARKETPLACE) {
      if (!input.providerAccount) throw new Error("Marketplace payment requires a linked provider account");
      const transferAccount = marketplaceTransferAccount(input.providerAccount);
      if (!transferAccount) throw new Error("Marketplace payment requires a linked provider account");
      const transferAmount = input.amount - Math.max(0, input.commissionAmount || 0);
      if (transferAmount <= 0) throw new Error("Transfer amount must be greater than zero");
      orderPayload.transfers = [{
        account: transferAccount,
        amount: transferAmount,
        currency: input.currency,
        notes: input.notes,
        on_hold: 0,
      }];
    }

    const order = await razorpay.orders.create(orderPayload as never);
    return { id: order.id, raw: order };
  }

  verifyCheckoutPayment(input: VerifyCheckoutPaymentInput): boolean {
    const isMockAllowed = allowPaymentSimulation() && (!input.providerAccount || !input.providerAccount.api_key_enc) &&
                          (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === "rzp_test_your_key_id");
    if (isMockAllowed && (input.signature === "mock_signature" || input.signature?.startsWith("mock_sig_"))) return true;

    let secret = process.env.RAZORPAY_KEY_SECRET;
    if (input.providerAccount && input.providerAccount.api_secret_enc) {
      try {
        secret = SecretManager.decrypt(input.providerAccount.api_secret_enc);
      } catch (err) {
        console.error("Failed to decrypt API secret for checkout verification:", err);
      }
    }
    return verifyHmac(`${input.providerOrderId}|${input.providerPaymentId}`, secret, input.signature);
  }

  verifyWebhook(input: WebhookVerificationInput): boolean {
    const isMockAllowed = allowPaymentSimulation() && (!input.providerAccount || !input.providerAccount.api_key_enc) &&
                          (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === "rzp_test_your_key_id");
    if (isMockAllowed && (input.signature === "mock_signature" || input.headers.get("x-simulated-webhook") === "true")) return true;

    let secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (input.providerAccount && input.providerAccount.webhook_secret_enc) {
      try {
        secret = SecretManager.decrypt(input.providerAccount.webhook_secret_enc);
      } catch (err) {
        console.error("Failed to decrypt webhook secret for verification:", err);
      }
    }
    return verifyHmac(input.rawBody, secret, input.signature);
  }

  parseWebhook(rawBody: string, headers: Headers): ParsedWebhookPayment {
    const event = JSON.parse(rawBody);
    const eventType = String(event.event || "unknown");
    const payment = event.payload?.payment?.entity;
    const refund = event.payload?.refund?.entity;
    return {
      eventType,
      providerEventId: headers.get("x-razorpay-event-id") || String(event.id || refund?.id || payment?.id || `${eventType}:${hashPayload(rawBody)}`),
      rawEvent: event,
      payment: payment?.order_id && payment?.id && payment?.amount ? {
        providerOrderId: payment.order_id,
        providerPaymentId: payment.id,
        amount: Number(payment.amount),
        currency: payment.currency || "INR",
        method: payment.method || null,
        raw: payment,
      } : undefined,
      refund: refund?.id && refund?.payment_id ? {
        providerRefundId: refund.id,
        providerPaymentId: refund.payment_id,
        amount: Number(refund.amount),
        currency: refund.currency || "INR",
        status: refund.status || "processed",
        raw: refund,
      } : undefined,
    };
  }

  async refundPayment(input: RefundPaymentInput) {
    const isConfigured = (input.providerAccount?.api_key_enc && input.providerAccount.api_secret_enc) ||
                         (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_your_key_id');
    if (!isConfigured && allowPaymentSimulation()) {
      return { status: "SUCCESS", refundId: `rzp_ref_mock_${Math.random().toString(36).substring(2, 10)}` };
    }
    const razorpay = getRazorpayClient(input.providerAccount);
    return razorpay.payments.refund(input.providerPaymentId, { amount: input.amount, notes: input.notes });
  }

  async fetchOrderStatus(providerOrderId: string, providerAccount?: ProviderAccount | null): Promise<{ status: PaymentStatus; raw: unknown } | null> {
    const isConfigured = (providerAccount?.api_key_enc && providerAccount.api_secret_enc) ||
                         (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_your_key_id');
    if (!isConfigured && allowPaymentSimulation()) {
      return {
        status: "SUCCESS" as any,
        raw: { id: providerOrderId, status: "paid", simulated: true }
      };
    }
    try {
      const razorpay = getRazorpayClient(providerAccount);
      const order = await razorpay.orders.fetch(providerOrderId) as any;
      let status: any = "PENDING";
      if (order.status === "paid") {
        status = "SUCCESS";
      } else if (order.status === "attempted") {
        status = "PROCESSING";
      } else if (order.status === "created") {
        status = "CREATED";
      } else {
        status = "FAILED";
      }
      return { status, raw: order };
    } catch (error) {
      console.error(`[RAZORPAY] Failed to fetch order status for ${providerOrderId}:`, error);
      return null;
    }
  }
}
