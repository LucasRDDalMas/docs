'use client'
import { useState } from 'react'
import type { DiscussionThread } from '@/types'
import styles from './CommentThread.module.css'

interface Props {
  thread: DiscussionThread
  onReply: (id: string, body: string) => Promise<void>
  onResolve: (id: string) => Promise<void>
}

export function CommentThread({ thread, onReply, onResolve }: Props) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    if (!reply.trim()) return
    setSending(true)
    try {
      await onReply(thread.id, reply)
      setReply('')
    } finally {
      setSending(false)
    }
  }

  // Strip the HTML comment metadata block injected by buildCommentBody
  const userText = thread.body.replace(/<!--[\s\S]*?-->\n*/g, '').trim()

  return (
    <div className={`${styles.thread} ${thread.closed ? styles.closed : ''}`}>
      <div className={styles.comment}>
        <img
          src={thread.author.avatarUrl}
          className={styles.avatar}
          alt={thread.author.login}
          width={24}
          height={24}
        />
        <div>
          <span className={styles.author}>{thread.author.login}</span>
          <p className={styles.body}>{userText}</p>
        </div>
      </div>
      {thread.replies.map((r) => (
        <div key={r.id} className={`${styles.comment} ${styles.reply}`}>
          <img
            src={r.author.avatarUrl}
            className={styles.avatar}
            alt={r.author.login}
            width={24}
            height={24}
          />
          <div>
            <span className={styles.author}>{r.author.login}</span>
            <p className={styles.body}>{r.body}</p>
          </div>
        </div>
      ))}
      {!thread.closed && (
        <div className={styles.compose}>
          <textarea
            className={styles.input}
            placeholder="Reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
          />
          <div className={styles.actions}>
            <button onClick={() => onResolve(thread.id)} className={styles.resolve}>
              Resolve
            </button>
            <button
              onClick={submit}
              disabled={sending || !reply.trim()}
              className={styles.send}
            >
              {sending ? '…' : 'Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
