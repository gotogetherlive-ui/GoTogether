import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone_number, otp } = await request.json();
    if (!phone_number || !otp) {
      return NextResponse.json({ error: 'Phone number and OTP are required' }, { status: 400 });
    }

    // Check latest OTP for this phone and user
    const record = db.prepare(`
      SELECT id, otp, expires_at, verified 
      FROM phone_otps 
      WHERE user_id = ? AND phone_number = ? 
      ORDER BY created_at DESC LIMIT 1
    `).get(user.id, phone_number) as any;

    if (!record) {
      return NextResponse.json({ error: 'No OTP found for this number' }, { status: 400 });
    }

    if (record.verified) {
      return NextResponse.json({ error: 'OTP already verified' }, { status: 400 });
    }

    if (new Date() > new Date(record.expires_at)) {
      return NextResponse.json({ error: 'OTP expired' }, { status: 400 });
    }

    if (record.otp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // Mark OTP as verified
    db.prepare('UPDATE phone_otps SET verified = 1 WHERE id = ?').run(record.id);

    // Update user profile to mark phone as verified
    db.prepare('UPDATE users SET phone_number = ?, phone_verified = 1 WHERE id = ?').run(phone_number, user.id);

    return NextResponse.json({ success: true, message: 'Phone verified successfully' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
