'use client'
import { createPortal } from 'react-dom'
import styles from './SelectionToolbar.module.css'

interface Props {
  rect: DOMRect
  onComment: () => void
  onSuggest: () => void
}

// Only renders after a user mouseup — always client-side, document is always available.
// No mounted-state guard: the extra setState it caused fired a second React commit
// that cleared the browser selection after useLayoutEffect had just restored it.
export function SelectionToolbar({ rect, onComment, onSuggest }: Props) {
  const top = rect.top - 44
  const left = rect.left + rect.width / 2

  return createPortal(
    <div
      className={styles.toolbar}
      style={{ top, left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button onClick={onComment}>💬 Comment</button>
      <button onClick={onSuggest}>✏️ Suggest</button>
    </div>,
    document.body,
  )
}
