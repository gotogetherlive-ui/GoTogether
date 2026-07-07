import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne, run } from '@/lib/db';

// GET — return current budget
export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const budget = await queryOne('SELECT user_id, budget_min, budget_max, updated_at FROM trip_budgets WHERE user_id = $1', [user.id]) as any;
    return NextResponse.json({ budget: budget || null });
  } catch (err) {
    console.error('Get budget error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — create or update budget (upsert)
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const min = parseInt(body.budget_min);
    const max = parseInt(body.budget_max);

    if (isNaN(min) || isNaN(max)) {
      return NextResponse.json({ error: 'Budget values must be numbers' }, { status: 400 });
    }
    if (min <= 0 || max <= 0) {
      return NextResponse.json({ error: 'Budget values must be positive' }, { status: 400 });
    }
    if (min > max) {
      return NextResponse.json({ error: 'Min budget cannot exceed max budget' }, { status: 400 });
    }

    await run(`
      INSERT INTO trip_budgets (user_id, budget_min, budget_max, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT(user_id) DO UPDATE SET
        budget_min = excluded.budget_min,
        budget_max = excluded.budget_max,
        updated_at = NOW()
    `, [user.id, min, max]);

    const budget = await queryOne('SELECT user_id, budget_min, budget_max, updated_at FROM trip_budgets WHERE user_id = $1', [user.id]);
    return NextResponse.json({ success: true, budget });
  } catch (err) {
    console.error('Update budget error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
