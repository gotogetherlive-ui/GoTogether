import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// GET — return current user's profile
export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const profile = db.prepare(
      'SELECT id, email, full_name, age, gender, bio, profession, fooding_habit, avatar_url, phone_number, latitude, longitude, location_updated_at, created_at FROM users WHERE id = ?'
    ).get(user.id) as Record<string, unknown> | undefined;

    return NextResponse.json({ profile: profile || null });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT — update user profile
export async function PUT(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { full_name, age, gender, bio, profession, fooding_habit, avatar_url, phone_number } = body;

    // Validate
    if (full_name !== undefined && typeof full_name !== 'string') {
      return NextResponse.json({ error: 'Invalid full_name' }, { status: 400 });
    }
    if (age !== undefined && age !== null && (typeof age !== 'number' || age < 13 || age > 100)) {
      return NextResponse.json({ error: 'Age must be between 13 and 100' }, { status: 400 });
    }

        db.prepare(`
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          age = ?,
          gender = ?,
          bio = ?,
          profession = ?,
          fooding_habit = ?,
          avatar_url = ?,
          phone_number = ?
      WHERE id = ?
    `).run(
      full_name ?? null,
      age ?? null,
      gender ?? null,
      bio ?? null,
      profession ?? null,
      fooding_habit ?? null,
      avatar_url ?? null,
      phone_number ?? null,
      user.id
    );

    const updated = db.prepare(
      'SELECT id, email, full_name, age, gender, bio, profession, fooding_habit, avatar_url, phone_number, latitude, longitude, location_updated_at, created_at FROM users WHERE id = ?'
    ).get(user.id);

    return NextResponse.json({ profile: updated });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
