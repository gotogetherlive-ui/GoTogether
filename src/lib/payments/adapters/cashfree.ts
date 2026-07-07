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

// ─── Cashfree PG v2 REST API Integration ─────────────────────────────
const CF_PROD_BASE = "https://api.cashfree.com/pg";
const CF_SANDBOX_BASE = "https://sandbox.cashfree.com/pg";
const CHECKOUT_BRAND_NAME = "GoTogether";

interface CashfreeCredentials {
  appId: string;
  secretKey: string;
  apiVersion: string;
  baseUrl: string;
}

function getCashfreeCredentials(providerAccount?: ProviderAccount | null): CashfreeCredentials {
  let appId = process.env.CASHFREE_APP_ID;
  let secretKey = process.env.CASHFREE_SECRET_KEY;

  if (providerAccount && providerAccount.ownership_model === PAYMENT_MODE.ORGANIZER_OWNED) {
    if (!providerAccount.api_key_enc || !providerAccount.api_secret_enc) {
      throw new Error("Organizer-Owned mode requires organizer Cashfree credentials");
    }
    try {
      appId = SecretManager.decrypt(providerAccount.api_key_enc);
      secretKey = SecretManager.decrypt(providerAccount.api_secret_enc);
    } catch (err) {
      console.error("Failed to decrypt organizer Cashfree credentials:", err);
      throw new Error("Cashfree credentials decryption failed");
    }
  } else if (providerAccount && providerAccount.api_key_enc && providerAccount.api_secret_enc) {
    try {
      appId = SecretManager.decrypt(providerAccount.api_key_enc);
      secretKey = SecretManager.decrypt(providerAccount.api_secret_enc);
    } catch (err) {
      console.error("Failed to decrypt Cashfree credentials:", err);
      throw new Error("Cashfree credentials decryption failed");
    }
  }

  if (!appId || !secretKey) throw new Error("Cashfree credentials are not configured");

  const isSandbox = process.env.CASHFREE_ENV === "sandbox" || appId.startsWith("TEST");
  return {
    appId,
    secretKey,
    apiVersion: process.env.CASHFREE_API_VERSION || "2023-08-01",
    baseUrl: isSandbox ? CF_SANDBOX_BASE : CF_PROD_BASE,
  };
}

function isConfigured(providerAccount?: ProviderAccount | null): boolean {
  if (providerAccount?.api_key_enc && providerAccount.api_secret_enc) return true;
  return !!process.env.CASHFREE_APP_ID
    && process.env.CASHFREE_APP_ID !== "your_app_id"
    && !!process.env.CASHFREE_SECRET_KEY
    && process.env.CASHFREE_SECRET_KEY !== "your_key";
}

async function cashfreeRequest(
  creds: CashfreeCredentials,
  method: string,
  path: string,
  body?: unknown
): Promise<any> {
  const url = `${creds.baseUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-client-id": creds.appId,
    "x-client-secret": creds.secretKey,
    "x-api-version": creds.apiVersion,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.message || data?.error || JSON.stringify(data);
    throw new Error(`Cashfree API ${method} ${path} failed (${res.status}): ${msg}`);
  }
  return data;
}

function normalizeCashfreePhone(value: string | undefined): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return "9999999999";
}

function pickCashfreeCustomerName(input: CreateProviderOrderInput): string {
  return input.notes?.customer_name || input.notes?.booking_ref || "GoTogether Customer";
}
export class CashfreeAdapter implements PaymentProviderAdapter {
  provider = PAYMENT_PROVIDER.CASHFREE;

  async createOrder(input: CreateProviderOrderInput): Promise<ProviderOrderResult> {
    if (!isConfigured(input.providerAccount) && allowPaymentSimulation()) {
      return {
        id: `cf_order_mock_${Math.random().toString(36).substring(2, 15)}`,
        raw: { simulated: true, provider: "CASHFREE" },
      };
    }

    const creds = getCashfreeCredentials(input.providerAccount);
    const orderPayload: Record<string, unknown> = {
      order_id: input.receipt,
      order_amount: input.amount / 100, // Cashfree uses rupees, not paise
      order_currency: input.currency,
      order_note: `${CHECKOUT_BRAND_NAME} booking ${input.notes?.booking_ref || input.receipt}`,
      customer_details: {
        customer_id: input.notes?.user_id || "guest",
        customer_name: pickCashfreeCustomerName(input),
        customer_email: input.notes?.customer_email || undefined,
        customer_phone: normalizeCashfreePhone(input.notes?.customer_phone),
      },
      order_tags: {
        brand: CHECKOUT_BRAND_NAME,
        business_name: CHECKOUT_BRAND_NAME,
        booking_ref: input.notes?.booking_ref || input.receipt,
        trip_title: input.notes?.trip_title || "GoTogether Trip",
      },
      order_meta: {
        notify_url: `${input.notes?.base_url || process.env.NEXT_PUBLIC_BASE_URL || ""}/api/webhooks/payments/CASHFREE`,
        return_url: `${input.notes?.base_url || process.env.NEXT_PUBLIC_BASE_URL || ""}/api/bookings/cashfree-return?booking_id=${encodeURIComponent(input.notes?.booking_id || "")}&order_id=${encodeURIComponent(input.receipt)}`,
      },
    };

    const order = await cashfreeRequest(creds, "POST", "/orders", orderPayload);

    return {
      id: order.order_id || order.cf_order_id,
      raw: order,
    };
  }

  verifyCheckoutPayment(input: VerifyCheckoutPaymentInput): boolean {
    // Simulated mode fallback
    if (!isConfigured(input.providerAccount) && allowPaymentSimulation()) {
      if (input.signature === "mock_signature" || input.signature?.startsWith("mock_sig_")) return true;
    }

    // Cashfree uses order status API for verification instead of signature
    // The checkout JS callback returns orderId, so we verify via API in the verify-payment endpoint
    // For compatibility, accept the signature check here
    let secretKey = process.env.CASHFREE_SECRET_KEY;
    if (input.providerAccount?.api_secret_enc) {
      try {
        secretKey = SecretManager.decrypt(input.providerAccount.api_secret_enc);
      } catch (err) {
        console.error("Failed to decrypt Cashfree secret for checkout verification:", err);
      }
    }
    if (!secretKey) return false;

    const message = `${input.providerOrderId}${input.providerPaymentId}`;
    const expected = crypto.createHmac("sha256", secretKey).update(message).digest("hex");
    return timingSafeHexEqual(expected, input.signature);
  }

  verifyWebhook(input: WebhookVerificationInput): boolean {
    if (!isConfigured(input.providerAccount) && allowPaymentSimulation()) {
      if (input.signature === "mock_signature" || input.headers.get("x-simulated-webhook") === "true") return true;
    }

    let secretKey = process.env.CASHFREE_SECRET_KEY;
    if (input.providerAccount?.api_secret_enc) {
      try {
        secretKey = SecretManager.decrypt(input.providerAccount.api_secret_enc);
      } catch (err) {
        console.error("Failed to decrypt Cashfree API secret for webhook verification:", err);
      }
    }
    if (!secretKey) return false;

    // Cashfree webhook signature verification
    const timestamp = input.headers.get("x-cashfree-timestamp") || "";
    const signPayload = timestamp + input.rawBody;
    const expected = crypto.createHmac("sha256", secretKey).update(signPayload).digest("base64");

    // Compare base64 signatures
    if (!input.signature) return false;
    try {
      const a = Buffer.from(expected, "base64");
      const b = Buffer.from(input.signature, "base64");
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return expected === input.signature;
    }
  }

  parseWebhook(rawBody: string, headers: Headers): ParsedWebhookPayment {
    const event = JSON.parse(rawBody);
    const eventType = String(event.type || event.event || "PAYMENT_SUCCESS");
    const paymentData = event.data?.payment || event.data?.order?.payments?.[0] || event.payload?.payment?.entity;
    const orderData = event.data?.order;
    const refundData = event.data?.refund;

    return {
      eventType,
      providerEventId: headers.get("x-cashfree-event-id") || String(event.event_id || event.id || `${eventType}:${hashPayload(rawBody)}`),
      rawEvent: event,
      payment: (orderData?.order_id || paymentData?.cf_payment_id) ? {
        providerOrderId: orderData?.order_id || paymentData?.order_id || orderData?.cf_order_id || "",
        providerPaymentId: String(paymentData?.cf_payment_id || paymentData?.payment_id || paymentData?.id || ""),
        amount: Math.round((paymentData?.payment_amount || orderData?.order_amount || 0) * 100), // Convert rupees to paise
        currency: paymentData?.payment_currency || orderData?.order_currency || "INR",
        method: paymentData?.payment_group || paymentData?.payment_method || null,
        raw: paymentData || orderData,
      } : undefined,
      refund: refundData ? {
        providerRefundId: String(refundData.cf_refund_id || refundData.refund_id),
        providerPaymentId: String(refundData.cf_payment_id || refundData.payment_id || ""),
        amount: Math.round((refundData.refund_amount || 0) * 100),
        currency: refundData.refund_currency || "INR",
        status: refundData.refund_status === "SUCCESS" ? "processed" : refundData.refund_status?.toLowerCase() || "processed",
        raw: refundData,
      } : undefined,
    };
  }

  async refundPayment(input: RefundPaymentInput) {
    if (!isConfigured(input.providerAccount) && allowPaymentSimulation()) {
      return { status: "SUCCESS", refundId: `cf_ref_mock_${Math.random().toString(36).substring(2, 10)}` };
    }

    const creds = getCashfreeCredentials(input.providerAccount);

    // Cashfree needs the order_id for refund, which we derive from the payment
    const refundPayload = {
      refund_amount: input.amount / 100, // Convert paise to rupees
      refund_id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      refund_note: input.notes?.reason || "Refund processed by GoTogether",
    };

    // The providerPaymentId for Cashfree is actually the cf_order_id in our flow
    const result = await cashfreeRequest(creds, "POST", `/orders/${input.providerPaymentId}/refunds`, refundPayload);
    return {
      status: result.refund_status === "SUCCESS" ? "SUCCESS" : "PENDING",
      refundId: String(result.cf_refund_id || result.refund_id),
    };
  }

  async fetchOrderStatus(providerOrderId: string, providerAccount?: ProviderAccount | null): Promise<{ status: PaymentStatus; raw: unknown } | null> {
    if (!isConfigured(providerAccount) && allowPaymentSimulation()) {
      return {
        status: "SUCCESS" as any,
        raw: { order_id: providerOrderId, order_status: "PAID", simulated: true },
      };
    }
    try {
      const creds = getCashfreeCredentials(providerAccount);
      const order = await cashfreeRequest(creds, "GET", `/orders/${providerOrderId}`);
      let status: any = "PENDING";
      if (order.order_status === "PAID") status = "SUCCESS";
      else if (order.order_status === "ACTIVE") status = "PROCESSING";
      else if (order.order_status === "EXPIRED") status = "FAILED";
      return { status, raw: order };
    } catch (error) {
      console.error(`[CASHFREE] Failed to fetch order status for ${providerOrderId}:`, error);
      return null;
    }
  }
}




