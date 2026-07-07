import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PaymentOrchestrator } from '@/lib/payments/orchestrator';

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await PaymentOrchestrator.verifyPayment(user, await request.json());
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.body);
  } catch (err) {
    console.error('[VERIFY PAYMENT] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
