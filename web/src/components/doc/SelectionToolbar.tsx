'use client'
import styles from './SelectionToolbar.module.css'

interface Props {
  rect: DOMRect
  onComment: () => void
  onSuggest: () => void
}

export function SelectionToolbar({ rect, onComment, onSuggest }: Props) {
  const top = rect.top - 44
  const left = rect.left + rect.width / 2

  return (
    <div className={styles.toolbar} style={{ top, left }}>
      <button onClick={onComment}>💬 Comment</button>
      <button onClick={onSuggest}>✏️ Suggest</button>
    </div>
  )
}
