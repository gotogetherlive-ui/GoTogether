import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, run } from '@/lib/db';
import crypto from 'node:crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

import { rateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    // Rate limit: Max 5 requests per IP address in 10 minutes
    const limitRes = await rateLimit(`otp_send_${ip}`, 5, 10 * 60 * 1000);
    if (!limitRes.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please try again after ${Math.ceil(limitRes.retryAfterMs / 1000)} seconds.` },
        { status: 429 }
      );
    }

    const { email, password, fullName } = await request.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Validate input
    if (!normalizedEmail || !password || !fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 128 || typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.length > 120) {
      return NextResponse.json(
        { error: 'Use a valid name and a password between 8 and 128 characters.' },
        { status: 400 }
      );
    }


    // Check if user already exists
    const existingUser = await queryOne('SELECT id FROM users WHERE LOWER(email) = $1 AND deleted_at IS NULL', [normalizedEmail]) as { id: string } | null;

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    // Rate-limit: check if an OTP was sent in the last 60 seconds
    const recentOtp = await queryOne(
      "SELECT created_at FROM email_otps WHERE email = $1 AND created_at > NOW() - INTERVAL '60 seconds' ORDER BY created_at DESC LIMIT 1",
      [normalizedEmail]
    ) as { created_at: string } | null;

    if (recentOtp) {
      return NextResponse.json(
        { error: 'Please wait 60 seconds before requesting a new code.' },
        { status: 429 }
      );
    }

    // Generate and hash OTP
    const otp = generateOTP();
    const [otpHash, passwordHash] = await Promise.all([bcrypt.hash(otp, 10), bcrypt.hash(password, 10)]);

    // Clean up previous OTPs for this email
    await run('DELETE FROM email_otps WHERE email = $1', [normalizedEmail]);

    // Store pending signup
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await run('INSERT INTO email_otps (id, email, full_name, password_hash, otp_hash, expires_at) VALUES ($1, $2, $3, $4, $5, $6)', [uuidv4(), normalizedEmail, fullName.trim(), passwordHash, otpHash, expiresAt]);

    // Send email via Resend
    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'GoTogether <onboarding@resend.dev>',
      to: [normalizedEmail],
      subject: 'Verify your GoTogether account',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); padding: 40px 32px 32px; text-align: center;">
            <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 700;">GoTogether</h1>
            <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0;">Verify your email address</p>
          </div>
          <div style="padding: 32px;">
            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
              Hi <strong>${escapeHtml(fullName)}</strong>,
            </p>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              Thanks for signing up! Enter this verification code in the app to complete your registration:
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
      // In development, still proceed so local signup can keep moving without exposing OTPs in logs.
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Failed to send verification email. Please try again.' },
          { status: 500 }
        );
      }
      console.warn('[DEV MODE] Email delivery failed; OTP was generated but not logged.');
    }

    // Mask email for display
    const [localPart, domain] = normalizedEmail.split('@');
    const masked =
      localPart.charAt(0) +
      '*'.repeat(Math.max(localPart.length - 2, 1)) +
      localPart.charAt(localPart.length - 1) +
      '@' +
      domain;

    return NextResponse.json({ success: true, maskedEmail: masked });
  } catch (err) {
    console.error('Send OTP error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
