import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { listDiscussionsForFile, createDiscussion } from '@/lib/github/discussions'
import { buildSuggestionBody } from '@/lib/suggestions/parser'
import type { SuggestionAnchor } from '@/types'

const CAT = process.env.DISCUSSIONS_SUGGESTIONS_CATEGORY_ID!

export async function GET(req: NextRequest) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const file = req.nextUrl.searchParams.get('file')
  if (!file) return NextResponse.json({ error: 'file param required' }, { status: 400 })
  const threads = await listDiscussionsForFile(session.accessToken, file, CAT)
  return NextResponse.json({ threads })
}

export async function POST(req: NextRequest) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const anchor = await req.json() as SuggestionAnchor
  const body = buildSuggestionBody(anchor)
  const discussion = await createDiscussion(session.accessToken, {
    categoryId: CAT,
    title: `Suggestion: ${anchor.file} §${anchor.paragraphIndex}`,
    body,
  })
  return NextResponse.json({ discussion }, { status: 201 })
}
