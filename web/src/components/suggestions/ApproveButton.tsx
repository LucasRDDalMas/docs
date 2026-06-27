'use client'
import { useState } from 'react'
import type { DiscussionThread } from '@/types'
import styles from './ApproveButton.module.css'

interface Props {
  thread: DiscussionThread
  currentUserLogin: string
  onApprove: () => Promise<void>
}

export function ApproveButton({ thread, currentUserLogin, onApprove }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isAuthor = thread.author.login === currentUserLogin

  if (thread.closed) {
    return <span className={styles.accepted}>✓ Accepted</span>
  }

  if (isAuthor) {
    return <span className={styles.waiting}>Awaiting peer approval</span>
  }

  return (
    <div>
      <button
        className={styles.btn}
        disabled={loading}
        onClick={async () => {
          setLoading(true)
          setError(null)
          try {
            await onApprove()
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to approve')
          } finally {
            setLoading(false)
          }
        }}
      >
        {loading ? 'Approving…' : '👍 Approve & commit'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
