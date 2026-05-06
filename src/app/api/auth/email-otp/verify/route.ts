import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { createSession } from '@/lib/auth';

interface EmailOtpRecord {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  otp_hash: string;
  expires_at: string;
  attempts: number;
}

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required.' },
        { status: 400 }
      );
    }

    // Look up the latest pending OTP for this email
    const record = db
      .prepare(
        'SELECT * FROM email_otps WHERE email = ? ORDER BY created_at DESC LIMIT 1'
      )
      .get(email) as EmailOtpRecord | undefined;

    if (!record) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date() > new Date(record.expires_at)) {
      db.prepare('DELETE FROM email_otps WHERE email = ?').run(email);
      return NextResponse.json(
        { error: 'Verification code expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check max attempts
    if (record.attempts >= 5) {
      db.prepare('DELETE FROM email_otps WHERE email = ?').run(email);
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    // Increment attempt counter
    db.prepare('UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?').run(
      record.id
    );

    // Verify OTP
    const isValid = bcrypt.compareSync(otp, record.otp_hash);
    if (!isValid) {
      const remaining = 4 - record.attempts;
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
              : 'Too many attempts. Please request a new code.',
        },
        { status: 400 }
      );
    }

    // Double-check no user was created while verifying
    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email) as { id: string } | undefined;

    if (existingUser) {
      db.prepare('DELETE FROM email_otps WHERE email = ?').run(email);
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 409 }
      );
    }

    // Create the user
    const userId = uuidv4();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_verified) VALUES (?, ?, ?, ?, 'regular', 1)`
    ).run(userId, record.email, record.password_hash, record.full_name);

    // Clean up OTP records
    db.prepare('DELETE FROM email_otps WHERE email = ?').run(email);

    // Create session
    await createSession(userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
