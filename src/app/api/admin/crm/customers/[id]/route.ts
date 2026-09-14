import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { query, queryOne, transaction } from "@/lib/db";

const STAGES = new Set(["lead", "customer", "repeat", "vip", "churn_risk"]);

async function requireAdmin() {
  const user = await getSession();
  return user && await isAdminUser(user) ? user : null;
}

export async function GET(_request: Request, context: RouteContext<"/api/admin/crm/customers/[id]">) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await context.params;
    const customer = await queryOne(`
      SELECT u.id, u.full_name, u.email, u.phone_number, u.role, u.avatar_url, u.created_at,
             cp.stage, cp.tags, cp.next_follow_up_at,
             (SELECT COUNT(*)::int FROM trip_bookings WHERE user_id = u.id) AS booking_count,
             (SELECT COALESCE(SUM(amount), 0)::bigint FROM trip_bookings WHERE user_id = u.id AND payment_status = 'paid') AS lifetime_value
      FROM users u LEFT JOIN crm_customer_profiles cp ON cp.user_id = u.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `, [id]);
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    const notes = await query(`
      SELECT n.id, n.body, n.created_at, a.full_name AS author_name
      FROM crm_notes n JOIN users a ON a.id = n.author_admin_id
      WHERE n.user_id = $1 ORDER BY n.created_at DESC LIMIT 100
    `, [id]);
    return NextResponse.json({ customer, notes }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("CRM customer detail error:", error);
    return NextResponse.json({ error: "Unable to load customer" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/admin/crm/customers/[id]">) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const stage = typeof body.stage === "string" ? body.stage : undefined;
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((tag: unknown): tag is string => typeof tag === "string").map((tag: string) => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 12)
      : undefined;
    const followUp = body.nextFollowUpAt === null ? null : typeof body.nextFollowUpAt === "string" ? body.nextFollowUpAt : undefined;

    if (stage !== undefined && !STAGES.has(stage)) return NextResponse.json({ error: "Invalid customer stage" }, { status: 400 });
    if (note.length > 4000) return NextResponse.json({ error: "Note is too long" }, { status: 400 });
    if (followUp && Number.isNaN(new Date(followUp).getTime())) return NextResponse.json({ error: "Invalid follow-up date" }, { status: 400 });
    if (stage === undefined && tags === undefined && followUp === undefined && !note) return NextResponse.json({ error: "No changes supplied" }, { status: 400 });

    const updated = await transaction(async (client) => {
      const user = await client.query("SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE", [id]);
      if (!user.rows[0]) return false;
      if (stage !== undefined || tags !== undefined || followUp !== undefined) {
        await client.query(`
          INSERT INTO crm_customer_profiles (user_id, stage, tags, owner_admin_id, next_follow_up_at)
          VALUES ($1, COALESCE($2, 'lead'), COALESCE($3::text[], '{}'::text[]), $4, $5)
          ON CONFLICT (user_id) DO UPDATE SET
            stage = COALESCE($2, crm_customer_profiles.stage),
            tags = COALESCE($3::text[], crm_customer_profiles.tags),
            owner_admin_id = COALESCE(crm_customer_profiles.owner_admin_id, $4),
            next_follow_up_at = CASE WHEN $6 THEN $5 ELSE crm_customer_profiles.next_follow_up_at END,
            updated_at = NOW()
        `, [id, stage || null, tags || null, admin.id, followUp ?? null, followUp !== undefined]);
      }
      if (note) {
        await client.query("INSERT INTO crm_notes (id, user_id, author_admin_id, body) VALUES ($1, $2, $3, $4)", [randomUUID(), id, admin.id, note]);
      }
      return true;
    });
    if (!updated) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM customer update error:", error);
    return NextResponse.json({ error: "Unable to update customer" }, { status: 500 });
  }
}
