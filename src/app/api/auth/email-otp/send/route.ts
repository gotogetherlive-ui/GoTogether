import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();

    // Validate input
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email) as { id: string } | undefined;

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    // Rate-limit: check if an OTP was sent in the last 60 seconds
    const recentOtp = db
      .prepare(
        "SELECT created_at FROM email_otps WHERE email = ? AND created_at > datetime('now', '-60 seconds') ORDER BY created_at DESC LIMIT 1"
      )
      .get(email) as { created_at: string } | undefined;

    if (recentOtp) {
      return NextResponse.json(
        { error: 'Please wait 60 seconds before requesting a new code.' },
        { status: 429 }
      );
    }

    // Generate and hash OTP
    const otp = generateOTP();
    const otpHash = bcrypt.hashSync(otp, 10);
    const passwordHash = bcrypt.hashSync(password, 10);

    // Clean up previous OTPs for this email
    db.prepare('DELETE FROM email_otps WHERE email = ?').run(email);

    // Store pending signup
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    db.prepare(
      'INSERT INTO email_otps (id, email, full_name, password_hash, otp_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(uuidv4(), email, fullName, passwordHash, otpHash, expiresAt);

    // Send email via Resend
    const { error: sendError } = await resend.emails.send({
      from: 'GoTogether <onboarding@resend.dev>',
      to: [email],
      subject: 'Verify your GoTogether account',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); padding: 40px 32px 32px; text-align: center;">
            <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 700;">GoTogether</h1>
            <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0;">Verify your email address</p>
          </div>
          <div style="padding: 32px;">
            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
              Hi <strong>${fullName}</strong>,
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
      // In development, still proceed — OTP is logged to console for testing
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Failed to send verification email. Please try again.' },
          { status: 500 }
        );
      }
      console.log(`\n📧 [DEV MODE] Email delivery failed. OTP for ${email}: ${otp}\n`);
    }

    // Mask email for display
    const [localPart, domain] = email.split('@');
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
