import { getIronSession, type SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'
import type { Session } from '@/types'

export function buildSessionCookieOptions(): SessionOptions {
  return {
    cookieName: 'docs-session',
    password: process.env.SESSION_SECRET!,
    cookieOptions: { httpOnly: true, secure: true, sameSite: 'lax' },
  }
}

export async function getSession(): Promise<Session | null> {
  const session = await getIronSession<{ user?: Session }>(
    await cookies(),
    buildSessionCookieOptions(),
  )
  return session.user ?? null
}

export async function setSession(user: Session): Promise<void> {
  const session = await getIronSession<{ user?: Session }>(
    await cookies(),
    buildSessionCookieOptions(),
  )
  session.user = user
  await session.save()
}

export async function clearSession(): Promise<void> {
  const session = await getIronSession<{ user?: Session }>(
    await cookies(),
    buildSessionCookieOptions(),
  )
  session.destroy()
}
