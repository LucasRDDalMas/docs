import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { fetchFileTree } from '@/lib/github/contents'

export async function GET() {
  try {
    await requireAuth()
    const tree = await fetchFileTree()
    return NextResponse.json({ tree })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
