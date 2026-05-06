import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

const ADMIN_EMAIL = 'gotogether.live@gmail.com';

export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = db.prepare(`
      SELECT id, full_name as name, email, role, age, is_verified, phone_number
      FROM users
      ORDER BY created_at DESC
    `).all() as { id: string; name: string; email: string; role: string; age: number | null; is_verified: number; phone_number: string | null }[];

    return NextResponse.json({ users });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
