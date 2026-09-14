import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const limit = await rateLimit(`feedback:${user.id}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many feedback submissions' }, { status: 429 });

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { category, subject, description } = body;
    const rating = Number(body.rating);

    // Validate
    if (typeof category !== 'string' || !['technical', 'trip', 'gotogether', 'love'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (subject.length > 200 || description.length > 5000) {
      return NextResponse.json({ error: 'Feedback is too long' }, { status: 400 });
    }
    if (category === 'love' && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Select a rating from 1 to 5 stars' }, { status: 400 });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    await run(`
      INSERT INTO feedbacks (id, user_id, category, subject, description, rating, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, user.id, category, subject.trim(), description.trim(), category === 'love' ? rating : null, now]);

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('Feedback submission error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
