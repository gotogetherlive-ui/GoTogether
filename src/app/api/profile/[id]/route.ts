import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { queryOne } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const profile = await queryOne(`
      SELECT id, full_name, role, age, gender, bio, profession, fooding_habit, avatar_url, created_at,
             LOWER(REGEXP_REPLACE(full_name, '[^a-zA-Z0-9]+', '', 'g')) || '-' || LEFT(id, 6) AS username
      FROM users
      WHERE id = $1
    `, [id]) as any;

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Failed to fetch user profile:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
