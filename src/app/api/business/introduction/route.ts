import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { notifyAdmins } from '@/lib/notificationEvents';
import { parseBusinessIntroduction, type BusinessIntroduction } from '@/lib/businessIntroduction';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Please sign in to register your business.' }, { status: 401 });
    const introduction = await queryOne<BusinessIntroduction>(
      `SELECT id, full_name, phone_number, travel_name, company_address, status, review_note, created_at
       FROM business_introductions WHERE user_id = $1`, [session.id]);
    // Preserve the existing review/dashboard screens for applications already submitted.
    const existing = await queryOne<{ id: string }>('SELECT id FROM business_applications WHERE user_id = $1 LIMIT 1', [session.id]);
    return NextResponse.json({ introduction: introduction || null, canProceed: session.role === 'business' || !!existing || introduction?.status === 'approved' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Business introduction status failed:', error);
    return NextResponse.json({ error: 'Could not load your application. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Please sign in to register your business.' }, { status: 401 });
    if (session.role === 'business') return NextResponse.json({ error: 'Your business is already registered.' }, { status: 409 });
    let details: ReturnType<typeof parseBusinessIntroduction>;
    try { details = parseBusinessIntroduction(await request.json()); }
    catch (error) { return NextResponse.json({ error: error instanceof SyntaxError ? 'Invalid request.' : error instanceof Error ? error.message : 'Invalid details.' }, { status: 400 }); }
    const introduction = await queryOne<BusinessIntroduction>(
      `INSERT INTO business_introductions (id, user_id, full_name, phone_number, travel_name, company_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING id, full_name, phone_number, travel_name, company_address, status, review_note, created_at`,
      [randomUUID(), session.id, details.fullName, details.phoneNumber, details.travelName, details.companyAddress]);
    if (!introduction) return NextResponse.json({ error: 'You have already submitted your details. Refresh to see your status.' }, { status: 409 });
    await notifyAdmins();
    return NextResponse.json({ introduction, canProceed: false }, { status: 201 });
  } catch (error) {
    console.error('Business introduction submission failed:', error);
    return NextResponse.json({ error: 'Could not submit your details. Please try again.' }, { status: 500 });
  }
}
