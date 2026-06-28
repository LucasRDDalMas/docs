'use client'
import { createContext, useContext, useState, useCallback, useEffect, createElement } from 'react'
import { search } from '@/lib/search/client'
import type { SearchResult } from '@/types'

interface SearchCtx {
  open: boolean
  setOpen: (v: boolean) => void
  results: SearchResult[]
  search: (q: string) => void
}

const Ctx = createContext<SearchCtx>({
  open: false,
  setOpen: () => {},
  results: [],
  search: () => {},
})

export function SearchStoreProvider({ children }: { children: React.ReactNode }) {
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
    if (!q.trim()) { setResults([]); return }
    const hits = await search(q)
    setResults(hits)
  }, [])

  return createElement(Ctx.Provider, { value: { open, setOpen, results, search: runSearch } }, children)
}

export function useSearch() {
  return useContext(Ctx)
}
