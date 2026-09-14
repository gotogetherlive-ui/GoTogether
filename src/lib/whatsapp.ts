import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH_VERSION_PATTERN = /^v\d+\.\d+$/;

export type WhatsAppConfig = {
  enabled: boolean;
  accessToken: string;
  phoneNumberId: string;
  appSecret: string;
  verifyToken: string;
  graphVersion: string;
};

export function getWhatsAppConfig(): WhatsAppConfig {
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v25.0";
  if (!GRAPH_VERSION_PATTERN.test(graphVersion)) throw new Error("WHATSAPP_GRAPH_API_VERSION must look like v25.0");
  return {
    enabled: process.env.WHATSAPP_CRM_ENABLED === "true",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "",
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim() || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() || "",
    graphVersion,
  };
}

export function isWhatsAppConfigured(config = getWhatsAppConfig()): boolean {
  return Boolean(config.enabled && config.accessToken && config.phoneNumberId && config.appSecret && config.verifyToken);
}

export function verifyWhatsAppSignature(rawBody: string, signature: string | null, appSecret: string): boolean {
  if (!signature?.startsWith("sha256=") || !appSecret) return false;
  const supplied = signature.slice(7);
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"));
}

export function normalizeWhatsAppNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 20);
}

export async function sendWhatsAppText(to: string, body: string) {
  const config = getWhatsAppConfig();
  if (!isWhatsAppConfigured(config)) throw new Error("WhatsApp CRM is not configured");
  const recipient = normalizeWhatsAppNumber(to);
  const message = body.trim().slice(0, 4096);
  if (recipient.length < 8 || !message) throw new Error("A valid recipient and message are required");

  const response = await fetch(`https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: { preview_url: false, body: message },
    }),
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`WhatsApp send failed (${response.status})`);
  const providerMessageId = payload?.messages?.[0]?.id;
  if (typeof providerMessageId !== "string") throw new Error("WhatsApp did not return a message ID");
  return { providerMessageId, payload, recipient, message };
}
