import { NextResponse } from 'next/server'
import { run } from '@/lib/db';import { getSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { latitude, longitude, address } = await request.json()

    if (typeof latitude !== 'number' || typeof longitude !== 'number' || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }
    if (address && (typeof address !== 'string' || address.length > 300)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }

    await run("UPDATE users SET latitude = $1, longitude = $2, address = $3, location_updated_at = NOW() WHERE id = $4", [latitude, longitude, address || null, user.id])

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
