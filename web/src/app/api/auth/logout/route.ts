import { NextRequest, NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
  await clearSession()
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin
  return NextResponse.redirect(new URL('/api/auth/login', base))
}
