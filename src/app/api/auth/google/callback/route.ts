import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import db from '@/lib/db'
import { createSession } from '@/lib/auth'

interface GoogleTokenResponse {
  access_token: string
  id_token: string
  token_type: string
}

interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture: string
  verified_email: boolean
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const origin = new URL(request.url).origin

  if (error || !code) {
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`)
  }

  try {
    // Exchange code for tokens
    const redirectUri = `${origin}/api/auth/google/callback`
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(`${origin}/login?error=token_exchange_failed`)
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json()

    // Fetch user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(`${origin}/login?error=user_info_failed`)
    }

    const googleUser: GoogleUserInfo = await userInfoResponse.json()

    // Upsert user in our database
    let user = db.prepare(
      'SELECT id FROM users WHERE google_id = ? OR email = ?'
    ).get(googleUser.id, googleUser.email) as { id: string } | undefined

    if (user) {
      // Update existing user with Google info
      db.prepare(
        'UPDATE users SET google_id = ?, avatar_url = ?, full_name = CASE WHEN full_name = \'\' THEN ? ELSE full_name END WHERE id = ?'
      ).run(googleUser.id, googleUser.picture, googleUser.name, user.id)
    } else {
      // Create new user
      const userId = uuidv4()
      db.prepare(`
        INSERT INTO users (id, email, full_name, google_id, avatar_url, role, is_verified)
        VALUES (?, ?, ?, ?, ?, 'regular', 1)
      `).run(userId, googleUser.email, googleUser.name, googleUser.id, googleUser.picture)
      user = { id: userId }
    }

    // Create session
    await createSession(user.id)

    return NextResponse.redirect(`${origin}/`)
  } catch (err) {
    console.error('Google auth error:', err)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }
}
