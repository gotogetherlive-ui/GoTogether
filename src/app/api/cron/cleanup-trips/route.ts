import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { cleanupDeletedTrips } from '@/lib/db';

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const deleted = await cleanupDeletedTrips();
    return NextResponse.json({
      success: true,
      deleted,
      message: deleted
        ? `Permanently deleted ${deleted} trip(s)`
        : 'No deleted trips have reached 24 hours',
    });
  } catch (error) {
    console.error('[CRON TRIP CLEANUP] Error:', error);
    return NextResponse.json({ error: 'Trip cleanup failed' }, { status: 500 });
  }
}

export { GET as POST };
