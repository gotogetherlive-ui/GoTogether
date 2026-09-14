import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// Retired account-key setup endpoint. Keep a clear response for older open tabs.
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ error: 'Chat encryption is automatic now. Reload this page; no chat password is required.' }, { status: 410 });
}
export const POST = GET;
