'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import type { CommentAnchor } from '@/types'
import styles from './SuggestionDiff.module.css'

// rehypeSanitize (default schema) strips <script>, event handlers, javascript: URLs,
// and all other dangerous HTML before the string reaches dangerouslySetInnerHTML.
// The input is user-authored markdown, not arbitrary third-party HTML.
function renderMd(md: string): string {
  try {
    return String(
      unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeSanitize)   // ← XSS sanitization — must stay in this pipeline
        .use(rehypeStringify)
        .processSync(md),
    )
  } catch {
    return `<pre>${md.replace(/</g, '&lt;')}</pre>`
  }
}

interface Props {
  anchor: CommentAnchor
  onSubmit: (proposed: string) => void
  onCancel: () => void
  position?: { top: number; left: number } | null
}

export function SuggestionDiff({ anchor, onSubmit, onCancel, position }: Props) {
  const [proposed, setProposed] = useState(anchor.highlightText)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
    textareaRef.current?.select()
  }, [])

  // Only compute rendered HTML when the preview tab is active
  const preview = useMemo(
    () =>
      tab === 'preview'
        ? { orig: renderMd(anchor.highlightText), proposed: renderMd(proposed) }
        : null,
    [tab, anchor.highlightText, proposed],
  )

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (changed) onSubmit(proposed)
    }
    if (e.key === 'Escape') onCancel()
  }

  const W = 540
  const H = 460
  const posStyle = position
    ? (() => {
        const left = Math.min(Math.max(8, position.left - W / 2), window.innerWidth - W - 8)
        const spaceBelow = window.innerHeight - (position.top + 48)
        const top = spaceBelow >= H ? position.top + 48 : Math.max(8, position.top - H - 8)
        return { position: 'fixed' as const, top, left, bottom: 'auto', right: 'auto' }
      })()
    : undefined

  const changed = proposed !== anchor.highlightText && proposed.trim() !== ''

  return (
    <div className={styles.wrapper} style={posStyle} onKeyDown={handleKeyDown}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <span className={styles.title}>Suggest a change</span>
        <div className={styles.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'write'}
            className={`${styles.tab} ${tab === 'write' ? styles.tabActive : ''}`}
            onClick={() => setTab('write')}
          >
            Write
          </button>
          <button
            role="tab"
            aria-selected={tab === 'preview'}
            className={`${styles.tab} ${tab === 'preview' ? styles.tabActive : ''}`}
            onClick={() => { setTab('preview'); textareaRef.current?.blur() }}
          >
            Preview
          </button>
        </div>
        <button className={styles.closeBtn} onClick={onCancel} aria-label="Cancel">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Body ── */}
      <div className={styles.body}>
        {/* Original */}
        <div className={styles.pane}>
          <div className={styles.paneLabel}>
            <span className={styles.delPill}>−</span> Original
          </div>
          {tab === 'write' ? (
            <div className={`${styles.rawBox} ${styles.rawOrig}`}>{anchor.highlightText}</div>
          ) : (
            <div
              className={`${styles.previewBox} ${styles.previewOrig}`}
              dangerouslySetInnerHTML={{ __html: preview!.orig }}
            />
          )}
        </div>

        <div className={styles.divider} aria-hidden="true" />

        {/* Suggestion */}
        <div className={styles.pane}>
          <div className={styles.paneLabel}>
            <span className={styles.insPill}>+</span> Your suggestion
            {tab === 'write' && <span className={styles.hint}>Markdown · ⌘↵ submit · Esc cancel</span>}
          </div>
          {tab === 'write' ? (
            <textarea
              ref={textareaRef}
              className={styles.editor}
              value={proposed}
              onChange={(e) => setProposed(e.target.value)}
              rows={6}
              spellCheck
            />
          ) : (
            <div
              className={`${styles.previewBox} ${styles.previewIns}`}
              dangerouslySetInnerHTML={{ __html: preview!.proposed }}
            />
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className={styles.actions}>
        <button onClick={onCancel} className={styles.cancel}>Cancel</button>
        <button onClick={() => onSubmit(proposed)} className={styles.submit} disabled={!changed}>
          Submit suggestion
        </button>
      </div>
    </div>
  )
}
