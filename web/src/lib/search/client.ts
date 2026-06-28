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
    boost: { title: 3, breadcrumb: 2, body: 1 },
    limit: 100,  // fetch broad set; re-ranked below
  })
  const q = query.toLowerCase()

  type Candidate = { hit: (typeof results.hits)[0]; bucket: number }
  const candidates: Candidate[] = results.hits.map((hit) => {
    const doc = hit.document as Record<string, string>
    const bodyLc = doc.body.toLowerCase()
    const breadcrumbLc = doc.breadcrumb.toLowerCase()
    // bucket 0 = exact phrase in breadcrumb, 1 = exact phrase in body, 2 = BM25 only
    const bucket = breadcrumbLc.includes(q) ? 0 : bodyLc.includes(q) ? 1 : 2
    return { hit, bucket }
  })

  return candidates
    .sort((a, b) => a.bucket - b.bucket || b.hit.score - a.hit.score)
    .slice(0, 12)
    .map(({ hit }) => {
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
