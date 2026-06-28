'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearch } from '@/hooks/useSearch'
import type { SearchResult } from '@/types'
import styles from './SearchModal.module.css'

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const words = query.trim().split(/\s+/).filter((w) => w.length > 2)
  if (!words.length) return text
  const regex = new RegExp(
    `(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  )
  const parts: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push(<mark key={match.index}>{match[0]}</mark>)
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

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
          className={`${styles.input}${results.length > 0 || query ? ` ${styles.inputWithResults}` : ''}`}
          placeholder="Search docs…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            void search(e.target.value)
          }}
        />
        {(results.length > 0 || (query && results.length === 0)) && (
          <div className={styles.results}>
            {Object.entries(grouped).map(([section, hits]) => (
              <div key={section}>
                <div className={styles.sectionLabel}>{section}</div>
                {hits.map((hit) => (
                  <Link
                    key={`${hit.file}-${hit.breadcrumb}`}
                    href={`/docs/${hit.file.replace(/^docs\//, '').replace(/\.md$/, '')}`}
                    className={styles.hit}
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.breadcrumb}>{highlight(hit.breadcrumb, query)}</span>
                    <span className={styles.excerpt}>{highlight(hit.excerpt, query)}</span>
                  </Link>
                ))}
              </div>
            ))}
            {query && results.length === 0 && (
              <p className={styles.empty}>No results for &ldquo;{query}&rdquo;</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
