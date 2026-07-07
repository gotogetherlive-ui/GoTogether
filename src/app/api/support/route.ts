import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { getClientIP, rateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const limit = await rateLimit(`support:${getClientIP(request)}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many support requests' }, { status: 429 });
    const body = await request.json();
    const { full_name, email, phone, category, subject, message } = body;

    // Validate required fields
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!category || !['general', 'safety', 'billing', 'account', 'trip', 'other'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (full_name.length > 120 || email.length > 254 || (phone && phone.length > 30) || subject.length > 200 || message.length > 5000) {
      return NextResponse.json({ error: 'One or more fields exceed the allowed length' }, { status: 400 });
    }

    // Get the logged-in user if available
    let userId: string | null = null;
    try {
      const user = await getSession();
      if (user) userId = user.id;
    } catch {
      // Not logged in — that's fine, support form works for all
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await run(`
      INSERT INTO support_tickets (id, user_id, full_name, email, phone, category, subject, message, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id, userId, full_name.trim(), email.trim(), phone?.trim() || null, category, subject.trim(), message.trim(), now]);

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('Support ticket submission error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
