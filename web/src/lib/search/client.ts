'use client'
import { create, load, search as oramaSearch } from '@orama/orama'
import type { RawData } from '@orama/orama'
import type { SearchResult } from '@/types'

const SCHEMA = {
  file: 'string',
  section: 'string',
  title: 'string',
  breadcrumb: 'string',
  body: 'string',
} as const

type DocDb = ReturnType<typeof create<typeof SCHEMA>>

let db: DocDb | null = null

export async function loadIndex(): Promise<void> {
  if (db) return
  const res = await fetch('/search-index.json')
  const rawData: RawData = await res.json()
  db = create({ schema: SCHEMA })
  load(db, rawData)
}

export async function search(query: string): Promise<SearchResult[]> {
  if (!db) await loadIndex()
  const results = await oramaSearch(db!, {
    term: query,
    properties: ['title', 'breadcrumb', 'body'],
    limit: 20,
  })
  return results.hits.map((hit) => {
    const doc = hit.document as Record<string, string>
    return {
      file: doc.file,
      section: doc.section as SearchResult['section'],
      title: doc.title,
      breadcrumb: doc.breadcrumb,
      excerpt: doc.body.slice(0, 160),
      score: hit.score,
    }
  })
}
