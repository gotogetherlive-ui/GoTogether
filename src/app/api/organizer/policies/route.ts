import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, queryOne, run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { CancellationRule } from '@/lib/payments/cancellation-policy-engine';

export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.role !== 'business') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const policies = await query(
      `SELECT id, organizer_id, trip_id, policy_name, free_cancel_before_hours, rules_json, is_refundable, is_active, created_at, updated_at FROM public.booking_cancellation_policies WHERE organizer_id = $1 ORDER BY created_at DESC`,
      [user.id]
    );

    return NextResponse.json({ policies });
  } catch (err) {
    console.error('Fetch policies error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'business') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { trip_id, policy_name, free_cancel_before_hours, rules, is_refundable, is_active } = body;

    if (!policy_name || !Array.isArray(rules)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate rules format
    const validatedRules: CancellationRule[] = [];
    for (const rule of rules) {
      if (typeof rule.hours_before !== 'number' || typeof rule.refund_pct !== 'number') {
        return NextResponse.json({ error: 'Invalid rules format' }, { status: 400 });
      }
      validatedRules.push({
        hours_before: rule.hours_before,
        refund_pct: Math.min(100, Math.max(0, rule.refund_pct))
      });
    }

    const freeHours = typeof free_cancel_before_hours === 'number' ? free_cancel_before_hours : 72;
    const refundable = is_refundable !== undefined ? Boolean(is_refundable) : true;
    const active = is_active !== undefined ? Boolean(is_active) : true;
    const tripId = trip_id && String(trip_id).trim() ? String(trip_id).trim() : null;

    if (tripId) {
      // Verify trip belongs to this organizer
      const trip = await queryOne(`SELECT id FROM public.trips WHERE id = $1 AND organizer_id = $2`, [tripId, user.id]);
      if (!trip) {
        return NextResponse.json({ error: 'Trip not found or does not belong to you' }, { status: 404 });
      }

      // Upsert trip-specific policy
      await run(`
        INSERT INTO public.booking_cancellation_policies (
          id, organizer_id, trip_id, policy_name, free_cancel_before_hours, rules_json, is_refundable, is_active, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, NOW())
        ON CONFLICT (trip_id) DO UPDATE SET
          policy_name = EXCLUDED.policy_name,
          free_cancel_before_hours = EXCLUDED.free_cancel_before_hours,
          rules_json = EXCLUDED.rules_json,
          is_refundable = EXCLUDED.is_refundable,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `, [uuidv4(), user.id, tripId, policy_name, freeHours, JSON.stringify(validatedRules), refundable, active]);
    } else {
      // Create/Update default organizer-level policy (where trip_id is null)
      const existing = await queryOne(`SELECT id FROM public.booking_cancellation_policies WHERE organizer_id = $1 AND trip_id IS NULL`, [user.id]) as any;
      if (existing) {
        await run(`
          UPDATE public.booking_cancellation_policies
          SET policy_name = $1,
              free_cancel_before_hours = $2,
              rules_json = $3::jsonb,
              is_refundable = $4,
              is_active = $5,
              updated_at = NOW()
          WHERE id = $6
        `, [policy_name, freeHours, JSON.stringify(validatedRules), refundable, active, existing.id]);
      } else {
        await run(`
          INSERT INTO public.booking_cancellation_policies (
            id, organizer_id, trip_id, policy_name, free_cancel_before_hours, rules_json, is_refundable, is_active
          ) VALUES ($1, $2, NULL, $3, $4, $5::jsonb, $6, $7)
        `, [uuidv4(), user.id, policy_name, freeHours, JSON.stringify(validatedRules), refundable, active]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Save policy error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
