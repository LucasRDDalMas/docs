import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { commitSuggestion } from '@/lib/suggestions/commitGateway'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { discussionNumber } = await req.json() as { discussionNumber: number }

  const result = await commitSuggestion({
    discussionId: id,
    discussionNumber,
    approverToken: session.accessToken,
    approverLogin: session.login,
  })

  if (result === 'unauthorized') {
    return NextResponse.json({ error: 'Approval requires a different user who has reacted' }, { status: 403 })
  }
  if (result === 'conflict') {
    return NextResponse.json({ error: 'Conflict — please re-submit' }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
