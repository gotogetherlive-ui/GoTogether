import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, run } from '@/lib/db';
import crypto from 'node:crypto';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

interface EmailOtpRecord {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  created_at: string;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const limitRes = await rateLimit(`otp_resend_${ip}`, 5, 10 * 60 * 1000);
    if (!limitRes.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please try again after ${Math.ceil(limitRes.retryAfterMs / 1000)} seconds.` },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    const existing = await queryOne<EmailOtpRecord>(
      'SELECT id, email, full_name, password_hash, created_at FROM email_otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
      [normalizedEmail]
    );

    if (!existing) {
      return NextResponse.json({ success: true });
    }

    const createdAt = new Date(existing.created_at).getTime();
    const secondsSinceLast = (Date.now() - createdAt) / 1000;

    if (secondsSinceLast < 60) {
      const wait = Math.ceil(60 - secondsSinceLast);
      return NextResponse.json(
        { error: `Please wait ${wait} seconds before requesting a new code.` },
        { status: 429 }
      );
    }

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    await run('DELETE FROM email_otps WHERE email = $1', [normalizedEmail]);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await run(
      'INSERT INTO email_otps (id, email, full_name, password_hash, otp_hash, expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        uuidv4(),
        existing.email,
        existing.full_name,
        existing.password_hash,
        otpHash,
        expiresAt,
      ]
    );

    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'GoTogether <onboarding@resend.dev>',
      to: [normalizedEmail],
      subject: 'Your new GoTogether verification code',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); padding: 40px 32px 32px; text-align: center;">
            <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 700;">GoTogether</h1>
            <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0;">New verification code</p>
          </div>
          <div style="padding: 32px;">
            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
              Hi <strong>${escapeHtml(existing.full_name)}</strong>,
            </p>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              Here's your new verification code:
            </p>
            <div style="background: linear-gradient(135deg, #fff7ed 0%, #fef2f2 100%); border: 2px dashed #f97316; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <div style="font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #ea580c; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0 0 24px;">
              This code expires in <strong style="color: #f97316;">10 minutes</strong>
            </p>
            <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 16px 32px; text-align: center;">
            <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
              &copy; ${new Date().getFullYear()} GoTogether &mdash; Travel Better, Together
            </p>
          </div>
        </div>
      `,
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Failed to resend verification email.' },
          { status: 500 }
        );
      }
      console.warn('[DEV MODE] Email delivery failed; replacement OTP was generated but not logged.');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
