'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { queryOne, run } from '@/lib/db'
import { verifyPassword, createSession, destroySession } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'

export async function signIn(formData: FormData): Promise<{ error?: string; success?: string } | void> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const headerStore = await headers()
  const ip = process.env.TRUST_PROXY === 'true'
    ? (headerStore.get('cf-connecting-ip') || headerStore.get('x-forwarded-for')?.split(',')[0] || headerStore.get('x-real-ip') || 'unknown').trim()
    : 'untrusted-proxy'
  const normalizedEmail = email.trim().toLowerCase()
  const limit = await rateLimit(`signin:${ip}:${normalizedEmail}`, 10, 15 * 60 * 1000)
  if (!limit.allowed) {
    return { error: 'Too many sign-in attempts. Please try again later.' }
  }

  const user = await queryOne<{ id: string; password_hash: string | null }>(
    'SELECT id, password_hash FROM users WHERE email = $1 AND deleted_at IS NULL',
    [normalizedEmail]
  )

  if (!user) {
    return { error: 'Invalid email or password.' }
  }

  if (!user.password_hash) {
    return { error: 'This account uses Google Sign-In. Please sign in with Google.' }
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return { error: 'Invalid email or password.' }
  }

  await createSession(user.id)
  redirect('/')
}

export async function signOut() {
  await destroySession()
  redirect('/login')
}

export async function updateUserLocation(latitude: number, longitude: number) {
  const { getSession } = await import('@/lib/auth')
  const user = await getSession()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  await run(
    'UPDATE users SET latitude = $1, longitude = $2, location_updated_at = NOW() WHERE id = $3',
    [latitude, longitude, user.id]
  )

  return { success: true }
}
