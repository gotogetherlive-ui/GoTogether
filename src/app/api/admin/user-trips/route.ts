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

    const trips = db.prepare(`
      SELECT t.id, t.title, t.status, t.is_featured, u.full_name as organizer_name, u.role as organizer_role, u.email as organizer_email
      FROM trips t
      JOIN users u ON t.organizer_id = u.id
      WHERE t.trip_type = 'buddy'
      ORDER BY t.created_at DESC
    `).all() as { id: string; title: string; status: string; is_featured: number; organizer_name: string; organizer_role: string; organizer_email: string }[];

    return NextResponse.json({ trips });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
