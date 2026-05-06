import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
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

    db.prepare(`
      INSERT INTO support_tickets (id, user_id, full_name, email, phone, category, subject, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, full_name.trim(), email.trim(), phone?.trim() || null, category, subject.trim(), message.trim(), now);

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('Support ticket submission error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
