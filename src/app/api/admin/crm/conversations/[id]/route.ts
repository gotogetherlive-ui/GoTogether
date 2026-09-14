import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { query, queryOne, run } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/whatsapp";

const CONVERSATION_STATUSES = new Set(["open", "pending", "resolved"]);

async function requireAdmin() {
  const user = await getSession();
  return user && await isAdminUser(user) ? user : null;
}

export async function GET(_request: Request, context: RouteContext<"/api/admin/crm/conversations/[id]">) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await context.params;
    const conversation = await queryOne("SELECT * FROM crm_conversations WHERE id = $1", [id]);
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const messages = await query(`
      SELECT id, direction, message_type, body, delivery_status, created_at
      FROM crm_messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 500
    `, [id]);
    await run("UPDATE crm_conversations SET unread_count = 0, updated_at = NOW() WHERE id = $1", [id]);
    return NextResponse.json({ conversation, messages }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("CRM conversation detail error:", error);
    return NextResponse.json({ error: "Unable to load conversation" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/admin/crm/conversations/[id]">) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const status = typeof body.status === "string" ? body.status : undefined;
    if (status && !CONVERSATION_STATUSES.has(status)) return NextResponse.json({ error: "Invalid conversation status" }, { status: 400 });
    if (!status && body.markRead !== true) return NextResponse.json({ error: "No changes supplied" }, { status: 400 });
    const result = await run(`
      UPDATE crm_conversations SET
        status = COALESCE($1, status),
        assigned_admin_id = COALESCE(assigned_admin_id, $2),
        unread_count = CASE WHEN $3 THEN 0 ELSE unread_count END,
        updated_at = NOW()
      WHERE id = $4
    `, [status || null, admin.id, body.markRead === true, id]);
    if (!result.rowCount) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM conversation update error:", error);
    return NextResponse.json({ error: "Unable to update conversation" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext<"/api/admin/crm/conversations/[id]">) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 4096) return NextResponse.json({ error: "Message must be between 1 and 4096 characters" }, { status: 400 });

    const conversation = await queryOne<{ phone_number: string; last_inbound_at: string | null }>(`
      SELECT c.phone_number,
             MAX(m.created_at) FILTER (WHERE m.direction = 'inbound') AS last_inbound_at
      FROM crm_conversations c
      LEFT JOIN crm_messages m ON m.conversation_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);
    if (!conversation?.phone_number) return NextResponse.json({ error: "Conversation has no WhatsApp number" }, { status: 404 });
    if (!conversation.last_inbound_at || Date.now() - new Date(conversation.last_inbound_at).getTime() > 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "The 24-hour customer service window is closed. Send an approved template from Meta instead." }, { status: 409 });
    }
    const recent = await queryOne<{ count: number }>(`
      SELECT COUNT(*)::int AS count FROM crm_messages
      WHERE sent_by_id = $1 AND direction = 'outbound' AND created_at > NOW() - INTERVAL '1 minute'
    `, [admin.id]);
    if ((recent?.count || 0) >= 20) return NextResponse.json({ error: "Message rate limit reached. Try again shortly." }, { status: 429 });

    const sent = await sendWhatsAppText(conversation.phone_number, message);
    await run(`
      INSERT INTO crm_messages (id, conversation_id, provider_message_id, direction, message_type, body, delivery_status, sent_by_id, provider_payload)
      VALUES ($1, $2, $3, 'outbound', 'text', $4, 'sent', $5, $6::jsonb)
      ON CONFLICT (provider_message_id) DO NOTHING
    `, [randomUUID(), id, sent.providerMessageId, sent.message, admin.id, JSON.stringify(sent.payload)]);
    await run(`UPDATE crm_conversations SET status = 'pending', assigned_admin_id = $1, last_message_preview = $2, last_message_at = NOW(), updated_at = NOW() WHERE id = $3`, [admin.id, sent.message.slice(0, 240), id]);
    return NextResponse.json({ success: true, messageId: sent.providerMessageId });
  } catch (error) {
    console.error("CRM WhatsApp send error:", error);
    const message = error instanceof Error && error.message === "WhatsApp CRM is not configured" ? error.message : "Unable to send WhatsApp message";
    return NextResponse.json({ error: message }, { status: message.includes("not configured") ? 503 : 502 });
  }
}
