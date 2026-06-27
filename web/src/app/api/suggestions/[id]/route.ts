import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { listThumbsUpReactions } from '@/lib/github/reactions'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const number = parseInt(req.nextUrl.searchParams.get('number') ?? '0', 10)
  const reactions = await listThumbsUpReactions(session.accessToken, number)
  return NextResponse.json({ reactions })
}
