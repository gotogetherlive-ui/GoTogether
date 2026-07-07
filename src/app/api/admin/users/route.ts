import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { isAdminUser } from '@/lib/admin';

export async function GET() {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await query(`
      SELECT id, full_name as name, email, role, age, is_verified, phone_number
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `, []) as { id: string; name: string; email: string; role: string; age: number | null; is_verified: number; phone_number: string | null }[];

    return NextResponse.json({ users });
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
