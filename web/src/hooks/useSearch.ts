'use client'
import { useState, useCallback, useEffect } from 'react'
import { search } from '@/lib/search/client'
import type { SearchResult } from '@/types'

export function useSearch() {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    const hits = await search(q)
    setResults(hits)
  }, [])

  return { open, setOpen, results, search: runSearch }
}
