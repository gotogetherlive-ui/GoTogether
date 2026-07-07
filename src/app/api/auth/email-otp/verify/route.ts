import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, run, transaction } from '@/lib/db';
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

import { rateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    // Rate limit: Max 10 attempts per IP address in 10 minutes
    const limitRes = await rateLimit(`otp_verify_${ip}`, 10, 10 * 60 * 1000);
    if (!limitRes.allowed) {
      return NextResponse.json(
        { error: `Too many verification attempts. Please try again after ${Math.ceil(limitRes.retryAfterMs / 1000)} seconds.` },
        { status: 429 }
      );
    }

    const { email, otp } = await request.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Email and OTP are required.' },
        { status: 400 }
      );
    }

    return await transaction(async () => {
    // Look up the latest pending OTP for this email
    const record = await queryOne(
      'SELECT id, email, full_name, password_hash, otp_hash, expires_at, attempts, created_at FROM email_otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE',
      [normalizedEmail]
    ) as EmailOtpRecord | null;

    if (!record) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date() > new Date(record.expires_at)) {
      await run('DELETE FROM email_otps WHERE email = $1', [normalizedEmail]);
      return NextResponse.json(
        { error: 'Verification code expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check max attempts
    if (record.attempts >= 5) {
      await run('DELETE FROM email_otps WHERE email = $1', [normalizedEmail]);
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    // Increment attempt counter
    await run('UPDATE email_otps SET attempts = attempts + 1 WHERE id = $1', [record.id]);

    // Verify OTP
    const isValid = await bcrypt.compare(otp, record.otp_hash);
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
    const existingUser = await queryOne('SELECT id FROM users WHERE LOWER(email) = $1 AND deleted_at IS NULL', [normalizedEmail]) as { id: string } | null;

    if (existingUser) {
      await run('DELETE FROM email_otps WHERE email = $1', [normalizedEmail]);
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 409 }
      );
    }


    // Create the user
    const userId = uuidv4();
    await run(`INSERT INTO users (id, email, password_hash, full_name, role, is_verified) VALUES ($1, $2, $3, $4, 'regular', 1)`, [userId, record.email, record.password_hash, record.full_name]);

    // Clean up OTP records
    await run('DELETE FROM email_otps WHERE email = $1', [normalizedEmail]);

    // Create session
    await createSession(userId);

    return NextResponse.json({ success: true });
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
