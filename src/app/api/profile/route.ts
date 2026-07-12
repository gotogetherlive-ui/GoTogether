import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne, run } from '@/lib/db';
import { invalidateUserSessions } from '@/lib/auth';

// GET — return current user's profile
export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const profile = await queryOne('SELECT id, email, full_name, role, age, gender, bio, profession, fooding_habit, avatar_url, phone_number, razorpay_account_id, latitude, longitude, location_updated_at, created_at FROM users WHERE id = $1', [user.id]) as Record<string, unknown> | undefined;

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
    const { full_name, age, gender, bio, profession, fooding_habit, avatar_url, phone_number, razorpay_account_id } = body;

    // Validate
    if (full_name !== undefined && typeof full_name !== 'string') {
      return NextResponse.json({ error: 'Invalid full_name' }, { status: 400 });
    }
    if (age !== undefined && age !== null && (typeof age !== 'number' || !Number.isInteger(age))) {
      return NextResponse.json({ error: 'Invalid age' }, { status: 400 });
    }
    if (age !== undefined && age !== null && age < 18) {
      return NextResponse.json({ error: 'GoTogether required age limit is 18 years old.' }, { status: 400 });
    }
    if (age !== undefined && age !== null && age > 100) {
      return NextResponse.json({ error: 'Age must be between 18 and 100' }, { status: 400 });
    }
    if (full_name !== undefined && (typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.length > 120)) {
      return NextResponse.json({ error: 'Name must be between 2 and 120 characters' }, { status: 400 });
    }
    if (bio !== undefined && bio !== null && (typeof bio !== 'string' || bio.length > 2000)) return NextResponse.json({ error: 'Invalid bio' }, { status: 400 });
    if (profession !== undefined && profession !== null && (typeof profession !== 'string' || profession.length > 120)) return NextResponse.json({ error: 'Invalid profession' }, { status: 400 });
    if (phone_number !== undefined && phone_number !== null && (typeof phone_number !== 'string' || phone_number.length > 30)) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    if (avatar_url !== undefined && avatar_url !== null && avatar_url !== '' && (typeof avatar_url !== 'string' || avatar_url.length > 2000 || (!avatar_url.startsWith('data:') && !avatar_url.startsWith('http://') && !avatar_url.startsWith('https://')))) {
      return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
    }
    if (gender !== undefined && gender !== null && (typeof gender !== 'string' || !['male', 'female', 'non-binary', 'other', 'prefer-not-to-say', 'Male', 'Female', 'Other', 'Non-binary', 'Prefer not to say'].includes(gender))) {
      return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
    }
    if (fooding_habit !== undefined && fooding_habit !== null && (typeof fooding_habit !== 'string' || fooding_habit.length > 80)) {
      return NextResponse.json({ error: 'Invalid food preference' }, { status: 400 });
    }
    const normalizedRazorpayAccountId = typeof razorpay_account_id === 'string'
      ? razorpay_account_id.trim()
      : null;
    const isConfiguringRazorpay = Boolean(normalizedRazorpayAccountId);
    const current = await queryOne<{ role: string; full_name: string; age: number | null; gender: string | null; bio: string | null; profession: string | null; fooding_habit: string | null; avatar_url: string | null; phone_number: string | null }>('SELECT role, full_name, age, gender, bio, profession, fooding_habit, avatar_url, phone_number FROM users WHERE id = $1', [user.id]);
    if (isConfiguringRazorpay && current?.role !== 'business' && current?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only approved businesses can configure payment accounts' }, { status: 403 });
    }
    if (normalizedRazorpayAccountId && !/^[a-zA-Z0-9_]{4,}$/.test(normalizedRazorpayAccountId)) {
      return NextResponse.json({ error: 'Invalid payment account/merchant ID' }, { status: 400 });
    }

        await run(`
      UPDATE users
      SET full_name = COALESCE($1, full_name),
          age = $2,
          gender = $3,
          bio = $4,
          profession = $5,
          fooding_habit = $6,
          avatar_url = $7,
          phone_number = $8,
          razorpay_account_id = CASE WHEN $9::text IS NULL THEN razorpay_account_id ELSE $9 END
      WHERE id = $10
    `, [full_name === undefined ? current?.full_name ?? null : full_name.trim(),
      age === undefined ? current?.age ?? null : age,
      gender === undefined ? current?.gender ?? null : gender,
      bio === undefined ? current?.bio ?? null : bio,
      profession === undefined ? current?.profession ?? null : profession,
      fooding_habit === undefined ? current?.fooding_habit ?? null : fooding_habit,
      avatar_url === undefined ? current?.avatar_url ?? null : avatar_url,
      phone_number === undefined ? current?.phone_number ?? null : phone_number,
      isConfiguringRazorpay ? normalizedRazorpayAccountId : null,
      user.id]);

    invalidateUserSessions(user.id);
    const updated = await queryOne('SELECT id, email, full_name, role, age, gender, bio, profession, fooding_habit, avatar_url, phone_number, razorpay_account_id, latitude, longitude, location_updated_at, created_at FROM users WHERE id = $1', [user.id]);

    return NextResponse.json({ profile: updated });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
