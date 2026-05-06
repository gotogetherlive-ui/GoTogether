import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { category, subject, description } = body;

    // Validate
    if (!category || !['technical', 'trip', 'gotogether'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO feedbacks (id, user_id, category, subject, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, user.id, category, subject.trim(), description.trim(), now);

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('Feedback submission error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
