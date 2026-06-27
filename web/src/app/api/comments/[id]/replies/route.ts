import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { addReply } from '@/lib/github/discussions'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { body } = await req.json() as { body: string }
  await addReply(session.accessToken, id, body)
  return NextResponse.json({ ok: true }, { status: 201 })
}
