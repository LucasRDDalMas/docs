'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useComments } from '@/hooks/useComments'
import { useSuggestions } from '@/hooks/useSuggestions'
import { usePanelStore } from '@/components/layout/PanelStore'
import { SuggestionDiff } from './SuggestionDiff'
import { CommentInput } from './CommentInput'
import type { CommentAnchor, SuggestionAnchor } from '@/types'
import type { DocMeta } from '@/lib/renderer/markdownToHtml'
import styles from './DocContent.module.css'
import toolbarStyles from './SelectionToolbar.module.css'

interface Props {
  html: string
  filePath: string
  frontmatter?: DocMeta
  slug?: string[]
}

function Breadcrumb({ slug }: { slug: string[] }) {
  const crumbs = slug.map((s, i) => ({
    label: s.replace(/-/g, ' '),
    href: `/docs/${slug.slice(0, i + 1).join('/')}`,
    last: i === slug.length - 1,
  }))
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <Link href="/docs/portal" className={styles.crumbLink}>Docs</Link>
      {crumbs.map((c) => (
        <span key={c.href}>
          <span className={styles.crumbSep}>/</span>
          {c.last
            ? <span className={styles.crumbCurrent}>{c.label}</span>
            : <Link href={c.href} className={styles.crumbLink}>{c.label}</Link>}
        </span>
      ))}
    </nav>
  )
}

function DocMetaBlock({ meta }: { meta: DocMeta }) {
  const tags = Array.isArray(meta.tags) ? meta.tags : meta.tags ? [meta.tags] : []
  if (!meta.status && !meta.type && tags.length === 0 && !meta.description) return null
  return (
    <div className={styles.meta}>
      <div className={styles.metaBadges}>
        {meta.type && <span className={`${styles.badge} ${styles.badgeType}`}>{meta.type}</span>}
        {meta.status && <span className={`${styles.badge} ${styles.badgeStatus}`}>{meta.status}</span>}
        {tags.map((t) => (
          <span key={String(t)} className={`${styles.badge} ${styles.badgeTag}`}>{String(t)}</span>
        ))}
      </div>
      {meta.description && <p className={styles.metaDesc}>{meta.description}</p>}
    </div>
  )
}

export function DocContent({ html, filePath, frontmatter, slug }: Props) {
  const { addComment, threads } = useComments(filePath)
  const { addSuggestion } = useSuggestions(filePath)
  const { openPanel } = usePanelStore()
  const [mode, setMode] = useState<'comment' | 'suggest' | null>(null)
  const [frozenAnchor, setFrozenAnchor] = useState<CommentAnchor | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [frozenPos, setFrozenPos] = useState<{ top: number; left: number } | null>(null)

  // Toolbar is always in the DOM, shown/hidden via direct DOM — no React setState
  // on mouseup, so the browser's text selection is never cleared by a re-render.
  const toolbarRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  const liveAnchorRef = useRef<CommentAnchor | null>(null)
  const liveRectRef = useRef<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection()
      const toolbar = toolbarRef.current
      const clear = () => {
        if (toolbar) { toolbar.style.visibility = 'hidden' }
        liveAnchorRef.current = null
        liveRectRef.current = null
      }

      if (!sel || sel.isCollapsed || !sel.rangeCount) { clear(); return }

      const range = sel.getRangeAt(0)
      const container = range.commonAncestorContainer
      const block = (container.nodeType === Node.TEXT_NODE
        ? (container as Text).parentElement
        : container as Element
      )?.closest('[data-paragraph-index]')
      if (!block) { clear(); return }

      const paragraphIndex = parseInt(block.getAttribute('data-paragraph-index') ?? '0', 10)
      const highlightText = sel.toString().trim()
      if (!highlightText) { clear(); return }

      liveAnchorRef.current = {
        file: filePath,
        paragraphIndex,
        highlightStart: range.startOffset,
        highlightEnd: range.endOffset,
        highlightText,
      }

      if (toolbar) {
        const rect = range.getBoundingClientRect()
        const top = Math.max(8, rect.top - 44)
        const left = rect.left + rect.width / 2
        liveRectRef.current = { top, left }
        // Use visibility instead of display to avoid layout flush that clears selection
        toolbar.style.top = `${top}px`
        toolbar.style.left = `${left}px`
        toolbar.style.visibility = 'visible'
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [filePath])

  useEffect(() => {
    if (mode !== null && toolbarRef.current) {
      toolbarRef.current.style.visibility = 'hidden'
    }
  }, [mode])

  // Apply inline highlights whenever the thread list changes.
  // Idempotent: only removes marks for resolved threads and only adds marks
  // that aren't already in the DOM, so a re-run never wipes existing highlights.
  useEffect(() => {
    const article = articleRef.current
    if (!article) return

    const active = threads.filter(t => t.anchor && !t.closed)
    const activeIds = new Set(active.map(t => t.id))

    // Remove marks only for threads that are now closed/gone
    article.querySelectorAll<HTMLElement>('[data-comment-hl]').forEach(mark => {
      const id = mark.getAttribute('data-comment-hl') ?? ''
      if (activeIds.has(id)) return
      const parent = mark.parentNode
      if (!parent) return
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
      parent.removeChild(mark)
    })

    if (!active.length) return

    for (const thread of active) {
      // Skip threads that already have a highlight in the DOM
      if (article.querySelector(`[data-comment-hl="${thread.id}"]`)) continue

      const anchor = thread.anchor!
      const { highlightText, paragraphIndex } = anchor
      if (!highlightText) continue

      const para = article.querySelector(`[data-paragraph-index="${paragraphIndex}"]`)
      if (!para) continue

      // Merge any split text nodes so indexOf works reliably
      para.normalize()

      const walker = document.createTreeWalker(para, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) {
        const textNode = node as Text
        const content = textNode.textContent ?? ''
        const idx = content.indexOf(highlightText)
        if (idx === -1) continue
        try {
          const range = document.createRange()
          range.setStart(textNode, idx)
          range.setEnd(textNode, idx + highlightText.length)
          const mark = document.createElement('mark')
          mark.setAttribute('data-comment-hl', thread.id)
          mark.className = styles.commentHighlight
          mark.addEventListener('click', () => openPanel())
          range.surroundContents(mark)
        } catch {
          // highlightText spans element boundaries — skip
        }
        break
      }
    }
  }, [threads, openPanel])

  function handleCommentClick() {
    if (!liveAnchorRef.current) return
    setFrozenAnchor(liveAnchorRef.current)
    setFrozenPos(liveRectRef.current)
    setMode('comment')
  }

  function handleSuggestClick() {
    if (!liveAnchorRef.current) return
    setFrozenAnchor(liveAnchorRef.current)
    setFrozenPos(liveRectRef.current)
    setMode('suggest')
  }

  async function submitComment(text: string) {
    if (!frozenAnchor) return
    setSubmitError(null)
    try {
      await addComment(frozenAnchor, text)
      openPanel()
      setMode(null)
    } catch {
      setSubmitError('Failed to post comment. Check your connection and try again.')
    }
  }

  async function handleSuggest(proposed: string) {
    if (!frozenAnchor) return
    const suggestionAnchor: SuggestionAnchor = {
      file: filePath,
      paragraphIndex: frozenAnchor.paragraphIndex,
      original: frozenAnchor.highlightText,
      proposed,
      status: 'pending',
    }
    await addSuggestion(suggestionAnchor)
    openPanel()
    setMode(null)
  }

  return (
    <div className={styles.wrapper}>
      {slug && <Breadcrumb slug={slug} />}
      {frontmatter && <DocMetaBlock meta={frontmatter} />}

      {/* Toolbar: always in DOM, positioned & shown via direct DOM on mouseup */}
      <div
        ref={toolbarRef}
        style={{ visibility: 'hidden' }}
        className={toolbarStyles.toolbar}
        onMouseDown={(e) => e.preventDefault()}
      >
        <button onClick={handleCommentClick}>💬 Comment</button>
        <button onClick={handleSuggestClick}>✏️ Suggest</button>
      </div>

      {mode === 'comment' && frozenAnchor && (
        <CommentInput
          highlightText={frozenAnchor.highlightText}
          onSubmit={submitComment}
          onCancel={() => { setMode(null); setSubmitError(null) }}
          error={submitError}
          position={frozenPos}
        />
      )}
      {mode === 'suggest' && frozenAnchor && (
        <SuggestionDiff
          anchor={frozenAnchor}
          onSubmit={(proposed) => { void handleSuggest(proposed) }}
          onCancel={() => setMode(null)}
        />
      )}
      <article
        ref={articleRef}
        dangerouslySetInnerHTML={{ __html: html }}
        data-doc-path={filePath}
        className={styles.article}
      />
    </div>
  )
}
