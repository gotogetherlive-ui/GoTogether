import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getSession();
  return user && await isAdminUser(user) ? user : null;
}

function boundedLimit(value: string | null): number {
  const parsed = Number.parseInt(value || "50", 10);
  return Number.isFinite(parsed) ? Math.max(10, Math.min(parsed, 100)) : 50;
}

export async function GET(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const search = (url.searchParams.get("q") || "").trim().slice(0, 120);
    const searchPattern = `%${search}%`;
    const limit = boundedLimit(url.searchParams.get("limit"));

    const [stats, customers, bookings, inbox, conversations] = await Promise.all([
      queryOne<{
        customers: number;
        paid_bookings: number;
        gross_revenue: number;
        open_cases: number;
        custom_trip_leads: number;
      }>(`
        SELECT
          (SELECT COUNT(*)::int FROM users WHERE deleted_at IS NULL AND role <> 'super_admin') AS customers,
          (SELECT COUNT(*)::int FROM trip_bookings WHERE payment_status = 'paid') AS paid_bookings,
          (SELECT COALESCE(SUM(amount), 0)::bigint FROM trip_bookings WHERE payment_status = 'paid') AS gross_revenue,
          (SELECT COUNT(*)::int FROM support_tickets WHERE status IN ('open', 'in_progress')) AS open_cases,
          (SELECT COUNT(*)::int FROM custom_trip_requests WHERE status IN ('new', 'contacted', 'planning')) AS custom_trip_leads
      `),
      query(`
        WITH booking_rollup AS (
          SELECT user_id, COUNT(*)::int AS booking_count,
                 COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS paid_booking_count,
                 COALESCE(SUM(amount) FILTER (WHERE payment_status = 'paid'), 0)::bigint AS lifetime_value,
                 MAX(created_at) AS last_booking_at
          FROM trip_bookings GROUP BY user_id
        ), support_rollup AS (
          SELECT user_id, COUNT(*) FILTER (WHERE status IN ('open', 'in_progress'))::int AS open_cases,
                 MAX(created_at) AS last_support_at
          FROM support_tickets WHERE user_id IS NOT NULL GROUP BY user_id
        )
        SELECT u.id, u.full_name, u.email, u.phone_number, u.role, u.avatar_url, u.created_at,
               COALESCE(cp.stage,
                 CASE WHEN COALESCE(br.paid_booking_count, 0) >= 3 THEN 'repeat'
                      WHEN COALESCE(br.paid_booking_count, 0) >= 1 THEN 'customer'
                      ELSE 'lead' END) AS stage,
               COALESCE(cp.tags, '{}') AS tags, cp.next_follow_up_at,
               COALESCE(br.booking_count, 0) AS booking_count,
               COALESCE(br.paid_booking_count, 0) AS paid_booking_count,
               COALESCE(br.lifetime_value, 0) AS lifetime_value,
               COALESCE(sr.open_cases, 0) AS open_cases,
               GREATEST(u.created_at, br.last_booking_at, sr.last_support_at) AS last_activity_at
        FROM users u
        LEFT JOIN crm_customer_profiles cp ON cp.user_id = u.id
        LEFT JOIN booking_rollup br ON br.user_id = u.id
        LEFT JOIN support_rollup sr ON sr.user_id = u.id
        WHERE u.deleted_at IS NULL AND u.role <> 'super_admin'
          AND ($1 = '' OR u.full_name ILIKE $2 OR u.email ILIKE $2 OR COALESCE(u.phone_number, '') ILIKE $2)
        ORDER BY last_activity_at DESC NULLS LAST
        LIMIT $3
      `, [search, searchPattern, limit]),
      query(`
        SELECT tb.id, tb.booking_ref, tb.booking_status, tb.payment_status, tb.amount,
               tb.created_at, tb.trip_date, u.id AS user_id, u.full_name AS customer_name,
               u.email AS customer_email, t.title AS trip_title, t.destination
        FROM trip_bookings tb
        JOIN users u ON u.id = tb.user_id
        JOIN trips t ON t.id = tb.trip_id
        WHERE $1 = '' OR u.full_name ILIKE $2 OR u.email ILIKE $2
          OR COALESCE(tb.booking_ref, '') ILIKE $2 OR t.title ILIKE $2
        ORDER BY tb.created_at DESC
        LIMIT $3
      `, [search, searchPattern, limit]),
      query(`
        SELECT * FROM (
          SELECT st.id, 'support'::text AS source, st.subject AS title, st.message AS preview,
                 st.status, st.full_name AS contact_name, st.email, st.phone, st.created_at
          FROM support_tickets st
          UNION ALL
          SELECT f.id, 'feedback'::text, f.subject,
                 CASE WHEN f.rating IS NOT NULL THEN CONCAT(f.rating, '/5 stars · ', f.description) ELSE f.description END,
                 f.status,
                 u.full_name, u.email, u.phone_number, f.created_at
          FROM feedbacks f JOIN users u ON u.id = f.user_id
          UNION ALL
          SELECT ctr.id, 'custom_trip'::text,
                 COALESCE(ctr.destination, ctr.place_type, 'Custom trip request'),
                 COALESCE(ctr.notes, 'New custom trip enquiry'), ctr.status,
                 ctr.booker_name, ctr.email, COALESCE(ctr.whatsapp_number, ctr.phone), ctr.created_at
          FROM custom_trip_requests ctr
        ) activity
        WHERE $1 = '' OR contact_name ILIKE $2 OR COALESCE(email, '') ILIKE $2
          OR title ILIKE $2 OR preview ILIKE $2
        ORDER BY created_at DESC
        LIMIT $3
      `, [search, searchPattern, limit]),
      query(`
        SELECT id, contact_name, phone_number, status, unread_count,
               last_message_preview, last_message_at
        FROM crm_conversations
        WHERE $1 = '' OR COALESCE(contact_name, '') ILIKE $2 OR phone_number ILIKE $2
        ORDER BY last_message_at DESC NULLS LAST
        LIMIT $3
      `, [search, searchPattern, limit]),
    ]);

    return NextResponse.json(
      {
        stats: stats || { customers: 0, paid_bookings: 0, gross_revenue: 0, open_cases: 0, custom_trip_leads: 0 },
        customers,
        bookings,
        inbox,
        conversations,
        integrations: {
          whatsapp: {
            enabled: process.env.WHATSAPP_CRM_ENABLED === "true",
            configured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_APP_SECRET && process.env.WHATSAPP_VERIFY_TOKEN),
          },
        },
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Admin CRM overview error:", error);
    return NextResponse.json({ error: "Unable to load CRM data" }, { status: 500 });
  }
}
