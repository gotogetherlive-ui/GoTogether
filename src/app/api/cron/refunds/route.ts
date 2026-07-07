import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { PaymentOrchestrator } from '@/lib/payments/orchestrator';

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') || 20);
    const result = await PaymentOrchestrator.processRefundRetries(limit);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[CRON REFUNDS] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export { GET as POST };

