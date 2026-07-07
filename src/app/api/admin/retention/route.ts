import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdminUser } from '@/lib/admin';
import { query, queryOne, run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET — List all retention rules with stats
export async function GET() {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rules = await query(`
      SELECT r.*,
        (SELECT COUNT(*) FROM retention_email_logs WHERE rule_id = r.id) as total_sent
      FROM retention_email_rules r
      ORDER BY r.created_at DESC
    `, []) as {
      id: string;
      name: string;
      inactive_days: number;
      subject: string;
      body_html: string;
      is_active: number;
      last_run_at: string | null;
      created_at: string;
      total_sent: number;
    }[];

    // Recent logs (last 20)
    const recentLogs = await query(`
      SELECT l.*, u.full_name as user_name, r.name as rule_name
      FROM retention_email_logs l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN retention_email_rules r ON l.rule_id = r.id
      ORDER BY l.sent_at DESC
      LIMIT 20
    `, []) as {
      id: string;
      rule_id: string;
      user_id: string;
      email: string;
      sent_at: string;
      status: string;
      user_name: string;
      rule_name: string;
    }[];

    // Global stats
    const totalEmailsSent = (await queryOne('SELECT COUNT(*) as count FROM retention_email_logs', []) as { count: number }).count;

    return NextResponse.json({ rules, recentLogs, totalEmailsSent });
  } catch (err) {
    console.error('Retention GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — Create a new retention rule
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, inactive_days, subject, body_html } = await request.json();

    if (!name || !subject || !body_html || !inactive_days) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const id = uuidv4();
    await run('INSERT INTO retention_email_rules (id, name, inactive_days, subject, body_html) VALUES ($1, $2, $3, $4, $5)', [id, name, inactive_days, subject, body_html]);

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('Retention POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
