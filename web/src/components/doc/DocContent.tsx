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
  const { threads: suggestionThreads, addSuggestion } = useSuggestions(filePath)
  const { openPanel, open: panelOpen } = usePanelStore()
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

  // Single merged highlight effect — handles both comment and suggestion marks.
  //
  // Root cause of the "only one type shows" bug: each surroundContents() call splits
  // text nodes. If two separate effects each call normalize() and search independently,
  // the first effect's marks split the text so the second effect's indexOf() fails.
  //
  // Fix: one effect, normalize each paragraph exactly once, then apply all highlights
  // for that paragraph right-to-left (by character offset). Going right-to-left means
  // each mark never splits the text that still needs to be found to the left.
  useEffect(() => {
    const article = articleRef.current
    if (!article) return

    // — Remove stale marks —
    function unwrap(mark: HTMLElement) {
      const parent = mark.parentNode
      if (!parent) return
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
      parent.removeChild(mark)
    }

    const activeCommentIds = new Set(
      threads.filter(t => t.anchor && !t.closed).map(t => t.id)
    )
    const activeSuggestionIds = new Set(
      suggestionThreads.filter(t => t.suggestion && !t.closed).map(t => t.id)
    )

    article.querySelectorAll<HTMLElement>('[data-comment-hl]').forEach(mark => {
      if (!activeCommentIds.has(mark.getAttribute('data-comment-hl') ?? '')) unwrap(mark)
    })
    article.querySelectorAll<HTMLElement>('[data-suggestion-hl]').forEach(mark => {
      if (!activeSuggestionIds.has(mark.getAttribute('data-suggestion-hl') ?? '')) unwrap(mark)
    })

    // — Collect pending highlights, grouped by paragraph index —
    type Pending = {
      text: string
      attrName: string
      id: string
      className: string
      onClick: () => void
      startIdx: number
    }
    const byParagraph = new Map<number, Pending[]>()

    for (const t of threads.filter(t => t.anchor && !t.closed)) {
      if (article.querySelector(`[data-comment-hl="${t.id}"]`)) continue
      const { highlightText, paragraphIndex } = t.anchor!
      if (!highlightText) continue
      const para = article.querySelector(`[data-paragraph-index="${paragraphIndex}"]`)
      if (!para) continue
      const idx = (para.textContent ?? '').indexOf(highlightText)
      if (idx === -1) continue
      const list = byParagraph.get(paragraphIndex) ?? []
      list.push({ text: highlightText, attrName: 'data-comment-hl', id: t.id,
        className: styles.commentHighlight, onClick: () => openPanel('comments'), startIdx: idx })
      byParagraph.set(paragraphIndex, list)
    }

    for (const t of suggestionThreads.filter(t => t.suggestion && !t.closed)) {
      if (article.querySelector(`[data-suggestion-hl="${t.id}"]`)) continue
      const s = t.suggestion!
      if (!s.original) continue
      const para = article.querySelector(`[data-paragraph-index="${s.paragraphIndex}"]`)
      if (!para) continue
      const idx = (para.textContent ?? '').indexOf(s.original)
      if (idx === -1) continue
      const list = byParagraph.get(s.paragraphIndex) ?? []
      list.push({ text: s.original, attrName: 'data-suggestion-hl', id: t.id,
        className: styles.suggestionHighlight, onClick: () => openPanel('suggestions'), startIdx: idx })
      byParagraph.set(s.paragraphIndex, list)
    }

    // — Apply per paragraph: normalize once, then right-to-left —
    for (const [paragraphIndex, highlights] of byParagraph) {
      const para = article.querySelector(`[data-paragraph-index="${paragraphIndex}"]`)
      if (!para) continue

      // One normalize per paragraph, before any surroundContents splits text nodes.
      para.normalize()

      // Sort descending so we wrap rightmost text first. Each wrap only splits
      // text nodes AT and AFTER the selection, never to the left — so earlier
      // (smaller startIdx) searches still find intact text nodes.
      const sorted = [...highlights].sort((a, b) => b.startIdx - a.startIdx)

      for (const h of sorted) {
        // Walk text nodes accumulating character offsets to locate the target text.
        // We walk all text nodes (including those already inside a <mark>) so the
        // accumulated offset matches the original paragraph character positions.
        const walker = document.createTreeWalker(para, NodeFilter.SHOW_TEXT)
        let accumulated = 0
        let found = false
        let n: Node | null
        while ((n = walker.nextNode()) && !found) {
          const textNode = n as Text
          const len = textNode.textContent?.length ?? 0
          const nodeEnd = accumulated + len
          if (accumulated <= h.startIdx && h.startIdx < nodeEnd) {
            const endIdx = h.startIdx + h.text.length
            if (endIdx <= nodeEnd) {
              try {
                const range = document.createRange()
                range.setStart(textNode, h.startIdx - accumulated)
                range.setEnd(textNode, endIdx - accumulated)
                const mark = document.createElement('mark')
                mark.setAttribute(h.attrName, h.id)
                mark.className = h.className
                mark.addEventListener('click', h.onClick)
                range.surroundContents(mark)
                found = true
              } catch { /* spans element boundary — skip */ }
            }
            break
          }
          accumulated += len
        }
      }
    }
  }, [threads, suggestionThreads, openPanel, panelOpen])

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
      openPanel('comments')
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
    openPanel('suggestions')
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
          position={frozenPos}
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
