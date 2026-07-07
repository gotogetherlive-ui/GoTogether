import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { queryOne, run } from '@/lib/db';import { createSession } from '@/lib/auth'
import { cookies } from 'next/headers'

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
  const state = searchParams.get('state')
  const cookieStore = await cookies()
  const expectedState = cookieStore.get('gt_oauth_state')?.value
  cookieStore.delete('gt_oauth_state')

  const requestOrigin = new URL(request.url).origin
  const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || requestOrigin

  if (error || !code || !state || !expectedState || state !== expectedState) {
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
    if (!googleUser.verified_email || !googleUser.email) {
      return NextResponse.redirect(`${origin}/login?error=unverified_google_email`)
    }

    // Upsert user in our database
    let user = await queryOne('SELECT id, google_id FROM users WHERE google_id = $1 OR LOWER(email) = LOWER($2)', [googleUser.id, googleUser.email]) as { id: string; google_id: string | null } | undefined

    if (user) {
      if (user.google_id && user.google_id !== googleUser.id) {
        return NextResponse.redirect(`${origin}/login?error=google_account_conflict`)
      }
      // Update existing user with Google info
      await run('UPDATE users SET google_id = $1, avatar_url = $2, full_name = CASE WHEN full_name = \'\' THEN $3 ELSE full_name END WHERE id = $4', [googleUser.id, googleUser.picture, googleUser.name, user.id])
    } else {
      // Create new user
      const userId = uuidv4()
      await run(`
        INSERT INTO users (id, email, full_name, google_id, avatar_url, role, is_verified)
        VALUES ($1, $2, $3, $4, $5, 'regular', 1)
      `, [userId, googleUser.email, googleUser.name, googleUser.id, googleUser.picture])
      user = { id: userId, google_id: googleUser.id }
    }

    // Create session
    await createSession(user!.id)

    return NextResponse.redirect(`${origin}/`)
  } catch (err) {
    console.error('Google auth error:', err)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }
}
