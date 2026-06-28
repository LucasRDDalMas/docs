import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { listDiscussionsForFile, createDiscussion } from '@/lib/github/discussions'
import { buildCommentBody } from '@/lib/suggestions/parser'
import type { CommentAnchor } from '@/types'

const CAT = process.env.DISCUSSIONS_COMMENTS_CATEGORY_ID!

export async function GET(req: NextRequest) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!CAT) return NextResponse.json({ threads: [] })
  const file = req.nextUrl.searchParams.get('file')
  if (!file) return NextResponse.json({ error: 'file param required' }, { status: 400 })
  const threads = await listDiscussionsForFile(session.accessToken, file, CAT).catch(() => [])
  return NextResponse.json({ threads })
}

export async function POST(req: NextRequest) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { anchor, text } = await req.json() as { anchor: CommentAnchor; text: string }
  const body = buildCommentBody(anchor, text)
  const discussion = await createDiscussion(session.accessToken, {
    categoryId: CAT,
    title: `Comment on ${anchor.file} §${anchor.paragraphIndex}`,
    body,
  })
  return NextResponse.json({ discussion }, { status: 201 })
}
