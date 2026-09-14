import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { queryOne, transaction } from "@/lib/db";
import { getWhatsAppConfig, normalizeWhatsAppNumber, verifyWhatsAppSignature } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

type WebhookMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
};

type WebhookStatus = { id?: string; status?: string };
type WebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        messages?: WebhookMessage[];
        statuses?: WebhookStatus[];
      };
    }>;
  }>;
};

function messageBody(message: WebhookMessage): string | null {
  return message.text?.body || message.button?.text || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || null;
}

function deliveryStatus(value: string | undefined): string | null {
  return value && ["sent", "delivered", "read", "failed"].includes(value) ? value : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const config = getWhatsAppConfig();
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (config.enabled && config.verifyToken && mode === "subscribe" && token === config.verifyToken && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Webhook verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const config = getWhatsAppConfig();
  if (!config.enabled || !config.appSecret) return NextResponse.json({ error: "WhatsApp integration disabled" }, { status: 503 });
  const rawBody = await request.text();
  if (!verifyWhatsAppSignature(rawBody, request.headers.get("x-hub-signature-256"), config.appSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try { payload = JSON.parse(rawBody) as WebhookPayload; }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  try {
    await transaction(async (client) => {
      for (const entry of Array.isArray(payload?.entry) ? payload.entry : []) {
        for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
          const value = change?.value;
          const contactNames = new Map<string, string>();
          for (const contact of Array.isArray(value?.contacts) ? value.contacts : []) {
            if (contact?.wa_id) contactNames.set(String(contact.wa_id), String(contact?.profile?.name || "WhatsApp contact").slice(0, 160));
          }

          for (const message of (Array.isArray(value?.messages) ? value.messages : []) as WebhookMessage[]) {
            const externalId = normalizeWhatsAppNumber(String(message.from || ""));
            const providerId = typeof message.id === "string" ? message.id : "";
            if (!externalId || !providerId) continue;
            const body = messageBody(message);
            const sentAt = /^\d+$/.test(message.timestamp || "") ? new Date(Number(message.timestamp) * 1000) : new Date();
            const existingUser = await queryOne<{ id: string }>(`
              SELECT id FROM users
              WHERE deleted_at IS NULL AND RIGHT(regexp_replace(COALESCE(phone_number, ''), '[^0-9]', '', 'g'), 10) = RIGHT($1, 10)
              LIMIT 1
            `, [externalId]);
            const conversation = await client.query<{ id: string }>(`
              INSERT INTO crm_conversations (id, external_contact_id, contact_name, phone_number, user_id, last_message_preview, last_message_at, unread_count)
              VALUES ($1, $2, $3, $2, $4, $5, $6, 0)
              ON CONFLICT (channel, external_contact_id) DO UPDATE SET
                contact_name = COALESCE(EXCLUDED.contact_name, crm_conversations.contact_name),
                user_id = COALESCE(crm_conversations.user_id, EXCLUDED.user_id),
                last_message_preview = EXCLUDED.last_message_preview,
                last_message_at = GREATEST(crm_conversations.last_message_at, EXCLUDED.last_message_at),
                updated_at = NOW()
              RETURNING id
            `, [randomUUID(), externalId, contactNames.get(externalId) || null, existingUser?.id || null, (body || `[${message.type || "message"}]`).slice(0, 240), sentAt]);
            const conversationId = conversation.rows[0].id;
            const inserted = await client.query(`
              INSERT INTO crm_messages (id, conversation_id, provider_message_id, direction, message_type, body, delivery_status, provider_payload, created_at)
              VALUES ($1, $2, $3, 'inbound', $4, $5, 'received', $6::jsonb, $7)
              ON CONFLICT (provider_message_id) DO NOTHING
              RETURNING id
            `, [randomUUID(), conversationId, providerId, message.type || "unknown", body, JSON.stringify(message), sentAt]);
            if (inserted.rowCount) await client.query("UPDATE crm_conversations SET unread_count = unread_count + 1 WHERE id = $1", [conversationId]);
          }

          for (const status of (Array.isArray(value?.statuses) ? value.statuses : []) as WebhookStatus[]) {
            const normalized = deliveryStatus(status.status);
            if (status.id && normalized) {
              await client.query("UPDATE crm_messages SET delivery_status = $1, updated_at = NOW(), provider_payload = provider_payload || $2::jsonb WHERE provider_message_id = $3", [normalized, JSON.stringify({ status }), status.id]);
            }
          }
        }
      }
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("WhatsApp webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
