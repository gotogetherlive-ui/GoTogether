import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

const ADMIN_EMAIL = "gotogether.live@gmail.com";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const applications = db.prepare(`
      SELECT 
        b.*,
        u.full_name as user_full_name,
        u.email as user_email
      FROM business_applications b
      JOIN users u ON b.user_id = u.id
      ORDER BY 
        CASE WHEN b.status = 'pending' THEN 0 ELSE 1 END,
        b.created_at DESC
    `).all();

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("GET /api/admin/business-apps error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
