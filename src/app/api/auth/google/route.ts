import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'node:crypto'

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 })
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  const state = crypto.randomBytes(32).toString('base64url')
  const cookieStore = await cookies()
  cookieStore.set('gt_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google/callback',
    maxAge: 10 * 60,
  })
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  
  return NextResponse.redirect(googleAuthUrl)
}
