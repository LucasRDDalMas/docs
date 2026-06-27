'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearch } from '@/hooks/useSearch'
import type { SearchResult } from '@/types'
import styles from './SearchModal.module.css'

function groupBySection(results: SearchResult[]): Record<string, SearchResult[]> {
  return results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const key = r.section.charAt(0).toUpperCase() + r.section.slice(1)
    acc[key] = [...(acc[key] ?? []), r]
    return acc
  }, {})
}

export function SearchModal() {
  const { open, setOpen, results, search } = useSearch()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open) return null

  const grouped = groupBySection(results)

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Search"
      >
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Search docs…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            void search(e.target.value)
          }}
        />
        <div className={styles.results}>
          {Object.entries(grouped).map(([section, hits]) => (
            <div key={section}>
              <div className={styles.sectionLabel}>{section}</div>
              {hits.map((hit) => (
                <a
                  key={`${hit.file}-${hit.breadcrumb}`}
                  href={`/docs/${hit.file.replace(/^doc\//, '').replace(/\.md$/, '')}`}
                  className={styles.hit}
                  onClick={() => setOpen(false)}
                >
                  <span className={styles.breadcrumb}>{hit.breadcrumb}</span>
                  <span className={styles.excerpt}>{hit.excerpt}</span>
                </a>
              ))}
            </div>
          ))}
          {query && results.length === 0 && (
            <p className={styles.empty}>No results for &ldquo;{query}&rdquo;</p>
          )}
        </div>
      </div>
    </div>
  )
}
