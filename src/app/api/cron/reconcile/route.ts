import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { reconcilePayments } from '@/lib/payments/reconciliation';

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await reconcilePayments();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[CRON RECONCILE] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export { GET as POST };
