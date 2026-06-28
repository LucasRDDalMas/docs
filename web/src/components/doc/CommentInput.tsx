'use client'
import { useRef, useEffect, useState } from 'react'
import styles from './CommentInput.module.css'

interface Props {
  highlightText: string
  onSubmit: (text: string) => Promise<void> | void
  onCancel: () => void
  error?: string | null
  position?: { top: number; left: number } | null
}

export function CommentInput({ highlightText, onSubmit, onCancel, error, position }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  async function handleSubmit() {
    setLoading(true)
    try {
      await onSubmit(text)
    } finally {
      setLoading(false)
    }
  }

  const posStyle = position
    ? (() => {
        const PANEL_H = 280
        const left = Math.min(Math.max(8, position.left - 140), window.innerWidth - 396)
        const spaceBelow = window.innerHeight - (position.top + 48)
        const top = spaceBelow >= PANEL_H ? position.top + 48 : Math.max(8, position.top - PANEL_H - 8)
        return { position: 'fixed' as const, top, left, bottom: 'auto', right: 'auto' }
      })()
    : undefined

  return (
    <div className={styles.wrapper} style={posStyle}>
      <div className={styles.quote}>&ldquo;{highlightText}&rdquo;</div>
      <textarea
        ref={ref}
        className={styles.editor}
        placeholder="Add a comment…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        disabled={loading}
      />
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.actions}>
        <button onClick={onCancel} className={styles.cancel} disabled={loading}>Cancel</button>
        <button
          onClick={handleSubmit}
          className={styles.submit}
          disabled={text.trim() === '' || loading}
        >
          {loading ? 'Posting…' : 'Comment'}
        </button>
      </div>
    </div>
  )
}
