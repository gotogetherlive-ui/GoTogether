'use server'

import { redirect } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import db from '@/lib/db'
import { hashPassword, verifyPassword, createSession, destroySession } from '@/lib/auth'

export async function signUp(formData: FormData): Promise<{ error?: string; success?: string } | void> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }

  // Check if user already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined
  if (existingUser) {
    return { error: 'An account with this email already exists.' }
  }

  const hashedPw = await hashPassword(password)
  const userId = uuidv4()

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role, is_verified)
    VALUES (?, ?, ?, ?, 'regular', 0)
  `).run(userId, email, hashedPw, fullName || 'User')

  await createSession(userId)
  redirect('/')
}

export async function signIn(formData: FormData): Promise<{ error?: string; success?: string } | void> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const user = db.prepare(
    'SELECT id, password_hash FROM users WHERE email = ?'
  ).get(email) as { id: string; password_hash: string | null } | undefined

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

  db.prepare(
    'UPDATE users SET latitude = ?, longitude = ?, location_updated_at = datetime(\'now\') WHERE id = ?'
  ).run(latitude, longitude, user.id)

  return { success: true }
}
