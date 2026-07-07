import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { rateLimit, getClientIP } from '@/lib/rateLimit';
import { PaymentOrchestrator } from '@/lib/payments/orchestrator';

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const limitRes = await rateLimit(`booking_order_${ip}`, 5, 10 * 60 * 1000);
    if (!limitRes.allowed) {
      return NextResponse.json(
        { error: `Too many booking attempts. Please try again after ${Math.ceil(limitRes.retryAfterMs / 1000)} seconds.` },
        { status: 429 }
      );
    }

    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid booking request" }, { status: 400 });
    }
    if (!("base_url" in body)) {
      (body as Record<string, unknown>).base_url = new URL(request.url).origin;
    }
    const result = await PaymentOrchestrator.startBooking(user, body);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    console.error('[CREATE ORDER] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
