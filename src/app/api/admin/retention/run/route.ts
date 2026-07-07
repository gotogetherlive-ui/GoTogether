import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdminUser } from '@/lib/admin';
import { query, run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface InactiveUser {
  id: string;
  email: string;
  full_name: string;
  last_login_at: string | null;
}

interface RetentionRule {
  id: string;
  name: string;
  inactive_days: number;
  subject: string;
  body_html: string;
  is_active: number;
}

// POST — Execute all active retention rules
export async function POST() {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rules = await query('SELECT id, rule_name, inactive_days, subject, body_html, is_active, created_at FROM retention_email_rules WHERE is_active = 1', []) as RetentionRule[];

    if (rules.length === 0) {
      return NextResponse.json({ success: true, message: 'No active rules', totalSent: 0 });
    }

    let totalSent = 0;
    const results: { rule: string; sent: number; errors: number }[] = [];

    for (const rule of rules) {
      // Find users inactive for more than `inactive_days`
      // Uses SQLite native date computation to prevent ISO string vs SQLite date format mismatch
      const inactiveUsers = await query(`
        SELECT id, email, full_name, last_login_at
        FROM users
        WHERE role != 'super_admin'
          AND COALESCE(last_login_at, created_at) < NOW() - ($1::integer * INTERVAL '1 day')
          AND id NOT IN (
            SELECT user_id FROM retention_email_logs
            WHERE rule_id = $2
              AND sent_at > NOW() - INTERVAL '7 days'
          )
      `, [rule.inactive_days, rule.id]) as InactiveUser[];

      let sentCount = 0;
      let errorCount = 0;

      for (const target of inactiveUsers) {
        try {
          // Personalize the email body
          const personalizedBody = rule.body_html
            .replace(/\{\{name\}\}/g, target.full_name || 'Traveler')
            .replace(/\{\{email\}\}/g, target.email);

          const { error: sendError } = await resend.emails.send({
            from: 'GoTogether <onboarding@resend.dev>',
            to: [target.email],
            subject: rule.subject.replace(/\{\{name\}\}/g, target.full_name || 'Traveler'),
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                <div style="background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); padding: 40px 32px 32px; text-align: center;">
                  <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 700;">GoTogether</h1>
                  <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0;">We miss you! 🌍</p>
                </div>
                <div style="padding: 32px;">
                  ${personalizedBody}
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
            console.error(`Retention email failed for ${target.email}:`, sendError);
            if (process.env.NODE_ENV !== 'production') {
              console.log(`📧 [DEV MODE] Retention email would be sent to ${target.email}`);
            }
            errorCount++;
          } else {
            sentCount++;
          }

          // Log the attempt regardless (for deduplication)
          await run('INSERT INTO retention_email_logs (id, rule_id, user_id, email, status) VALUES ($1, $2, $3, $4, $5)', [uuidv4(), rule.id, target.id, target.email, sendError ? 'failed' : 'sent']);
        } catch (emailErr) {
          console.error(`Error sending to ${target.email}:`, emailErr);
          errorCount++;

          // Log the failed attempt
          await run('INSERT INTO retention_email_logs (id, rule_id, user_id, email, status) VALUES ($1, $2, $3, $4, $5)', [uuidv4(), rule.id, target.id, target.email, 'failed']);
        }
      }

      // Update last_run_at
      await run(
        'UPDATE retention_email_rules SET last_run_at = NOW() WHERE id = $1',
        [rule.id]
      );

      totalSent += sentCount;
      results.push({ rule: rule.name, sent: sentCount, errors: errorCount });
    }

    return NextResponse.json({
      success: true,
      totalSent,
      results,
      message: totalSent > 0
        ? `Sent ${totalSent} retention email${totalSent > 1 ? 's' : ''}`
        : 'No inactive users matched the criteria',
    });
  } catch (err) {
    console.error('Retention run error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
