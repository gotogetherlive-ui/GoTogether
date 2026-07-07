import { NextResponse } from 'next/server';
import { PaymentOrchestrator } from '@/lib/payments/orchestrator';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const expired = await PaymentOrchestrator.expireBookings();
    return NextResponse.json({ expired, message: expired ? `Expired ${expired} booking(s)` : 'No expired bookings' });
  } catch (err) {
    console.error('[CRON EXPIRE] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export { GET as POST };
