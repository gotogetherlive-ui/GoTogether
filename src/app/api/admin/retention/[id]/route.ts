import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdminUser } from '@/lib/admin';
import { run } from '@/lib/db';

// PATCH — Update a retention rule
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, inactive_days, subject, body_html, is_active } = body;

    // Build dynamic update
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (name !== undefined) { values.push(name); updates.push(`name = $${values.length}`); }
    if (inactive_days !== undefined) { values.push(inactive_days); updates.push(`inactive_days = $${values.length}`); }
    if (subject !== undefined) { values.push(subject); updates.push(`subject = $${values.length}`); }
    if (body_html !== undefined) { values.push(body_html); updates.push(`body_html = $${values.length}`); }
    if (is_active !== undefined) { values.push(is_active); updates.push(`is_active = $${values.length}`); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    await run(`UPDATE retention_email_rules SET ${updates.join(', ')} WHERE id = $${values.length}`, values);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Retention PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — Delete a retention rule and its logs
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    await run('DELETE FROM retention_email_logs WHERE rule_id = $1', [id]);
    await run('DELETE FROM retention_email_rules WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Retention DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
