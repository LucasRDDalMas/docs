'use client'
import { useState } from 'react'
import type { CommentAnchor } from '@/types'
import styles from './SuggestionDiff.module.css'

interface Props {
  anchor: CommentAnchor
  onSubmit: (proposed: string) => void
  onCancel: () => void
}

export function SuggestionDiff({ anchor, onSubmit, onCancel }: Props) {
  const [proposed, setProposed] = useState(anchor.highlightText)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>Suggest a change</div>
      <div className={styles.panels}>
        <div className={styles.panel}>
          <div className={styles.label}>Original</div>
          <div className={styles.original}>{anchor.highlightText}</div>
        </div>
        <div className={styles.panel}>
          <div className={styles.label}>Proposed</div>
          <textarea
            className={styles.editor}
            value={proposed}
            onChange={(e) => setProposed(e.target.value)}
            rows={4}
          />
        </div>
      </div>
      <div className={styles.actions}>
        <button onClick={onCancel} className={styles.cancel}>Cancel</button>
        <button
          onClick={() => onSubmit(proposed)}
          className={styles.submit}
          disabled={proposed === anchor.highlightText || proposed.trim() === ''}
        >
          Submit suggestion
        </button>
      </div>
    </div>
  )
}
