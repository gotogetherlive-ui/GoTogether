import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone_number } = await request.json();
    if (!phone_number) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins expiry
    const id = uuidv4();

    // In a real app, integrate SMS Gateway (e.g., Twilio, MSG91) here
    console.log(`[SIMULATED SMS to ${phone_number}]: Your GoTogether verification code is ${otp}. Valid for 10 minutes.`);

    db.prepare(`
      INSERT INTO phone_otps (id, user_id, phone_number, otp, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, user.id, phone_number, otp, expiresAt);

    return NextResponse.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Send OTP error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
