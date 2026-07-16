import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from '@/lib/db';
import { isAdminUser } from '@/lib/admin';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !(await isAdminUser(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const applications = await query(`
      SELECT 
        b.*,
        u.full_name as user_full_name,
        u.email as user_email,
        oa.id as agreement_id,
        oa.agreement_version,
        oa.signer_name,
        oa.signed_at,
        oa.document_hash
      FROM business_applications b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN organizer_agreements oa ON oa.application_id = b.id
      ORDER BY 
        CASE WHEN b.status = 'pending' THEN 0 ELSE 1 END,
        b.created_at DESC
    `, []);

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("GET /api/admin/business-apps error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
