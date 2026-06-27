'use client'
import { useState } from 'react'
import { useSelection } from '@/hooks/useSelection'
import { useComments } from '@/hooks/useComments'
import { useSuggestions } from '@/hooks/useSuggestions'
import { SelectionToolbar } from './SelectionToolbar'
import { SuggestionDiff } from './SuggestionDiff'
import type { SuggestionAnchor } from '@/types'
import styles from './DocContent.module.css'

interface Props { html: string; filePath: string }

export function DocContent({ html, filePath }: Props) {
  const { anchor, rect } = useSelection(filePath)
  const { addComment } = useComments(filePath)
  const { addSuggestion } = useSuggestions(filePath)
  const [mode, setMode] = useState<'comment' | 'suggest' | null>(null)

  async function handleComment() {
    if (!anchor) return
    // eslint-disable-next-line no-alert
    const text = window.prompt('Add a comment:')
    if (!text) return
    await addComment(anchor, text)
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
    setMode(null)
  }

  return (
    <div className={styles.wrapper}>
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
