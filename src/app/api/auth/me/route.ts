import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdminUser } from '@/lib/admin';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    const isAdmin = await isAdminUser(user);
    // Only expose safe fields to the client
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
        google_id: user.google_id,
        is_verified: user.is_verified,
        age: user.age,
        gender: user.gender,
        profession: user.profession,
        fooding_habit: user.fooding_habit,
        phone_number: user.phone_number,
        phone_verified: user.phone_verified,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
        terms_accepted_at: user.terms_accepted_at,
        is_admin: isAdmin,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
