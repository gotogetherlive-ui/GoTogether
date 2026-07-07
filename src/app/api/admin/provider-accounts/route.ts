import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const accounts = await query(`
      SELECT 
        pa.id, pa.provider, pa.ownership_model, pa.provider_account_id,
        pa.is_default, pa.status, pa.verification_status, pa.verified_at,
        pa.credential_status, pa.last_verified_at, pa.last_api_check_at,
        pa.last_webhook_received_at, pa.last_failure_at, pa.verification_error,
        pa.rotation_required, pa.metadata,
        u.full_name as organizer_name, u.email as organizer_email
      FROM payments.provider_accounts pa
      JOIN users u ON pa.organizer_id = u.id
      ORDER BY pa.created_at DESC
    `);

    return NextResponse.json({ accounts });
  } catch (err) {
    console.error("Admin provider accounts API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
