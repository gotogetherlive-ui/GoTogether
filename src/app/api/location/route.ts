import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { latitude, longitude, address } = await request.json()

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }

    db.prepare(
      "UPDATE users SET latitude = ?, longitude = ?, address = ?, location_updated_at = datetime('now') WHERE id = ?"
    ).run(latitude, longitude, address || null, user.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Location update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    return NextResponse.json({
      latitude: user.latitude,
      longitude: user.longitude,
      address: user.address,
      location_updated_at: user.location_updated_at,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
