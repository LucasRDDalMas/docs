'use client'
import { useState } from 'react'
import { useSelection } from '@/hooks/useSelection'
import { useComments } from '@/hooks/useComments'
import { useSuggestions } from '@/hooks/useSuggestions'
import { usePanelStore } from '@/components/layout/PanelStore'
import { SelectionToolbar } from './SelectionToolbar'
import { SuggestionDiff } from './SuggestionDiff'
import type { SuggestionAnchor } from '@/types'
import type { DocMeta } from '@/lib/renderer/markdownToHtml'
import styles from './DocContent.module.css'

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
      <a href="/docs/portal" className={styles.crumbLink}>Docs</a>
      {crumbs.map((c) => (
        <span key={c.href}>
          <span className={styles.crumbSep}>/</span>
          {c.last
            ? <span className={styles.crumbCurrent}>{c.label}</span>
            : <a href={c.href} className={styles.crumbLink}>{c.label}</a>}
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
  const { anchor, rect } = useSelection(filePath)
  const { addComment } = useComments(filePath)
  const { addSuggestion } = useSuggestions(filePath)
  const { openPanel } = usePanelStore()
  const [mode, setMode] = useState<'comment' | 'suggest' | null>(null)

  async function handleComment() {
    if (!anchor) return
    // eslint-disable-next-line no-alert
    const text = window.prompt('Add a comment:')
    if (!text) return
    await addComment(anchor, text)
    openPanel()
    setMode(null)
  }

  async function handleSuggest(proposed: string) {
    if (!anchor) return
    const suggestionAnchor: SuggestionAnchor = {
      file: filePath,
      paragraphIndex: anchor.paragraphIndex,
      original: anchor.highlightText,
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

      {rect && anchor && mode === null && (
        <SelectionToolbar
          rect={rect}
          onComment={() => { setMode('comment'); void handleComment() }}
          onSuggest={() => setMode('suggest')}
        />
      )}
      {mode === 'suggest' && anchor && (
        <SuggestionDiff
          anchor={anchor}
          onSubmit={(proposed) => { void handleSuggest(proposed) }}
          onCancel={() => setMode(null)}
        />
      )}
      <article
        dangerouslySetInnerHTML={{ __html: html }}
        data-doc-path={filePath}
        className={styles.article}
      />
    </div>
  )
}
