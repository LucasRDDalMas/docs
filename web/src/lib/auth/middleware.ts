import { getSession } from './session'
import type { Session } from '@/types'

export async function requireAuth(): Promise<Session> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}
