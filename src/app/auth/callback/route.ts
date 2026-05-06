import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  // This route is no longer used (was for Supabase OAuth)
  return NextResponse.redirect(`${origin}/login`)
}
