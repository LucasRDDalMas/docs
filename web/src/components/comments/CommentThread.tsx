'use client'
import { useState } from 'react'
import type { DiscussionThread } from '@/types'
import styles from './CommentThread.module.css'

interface Props {
  thread: DiscussionThread
  onReply: (id: string, body: string) => Promise<void>
  onResolve: (id: string) => Promise<void>
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function CommentThread({ thread, onReply, onResolve }: Props) {
  const [expanded, setExpanded] = useState(!thread.closed)
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

  const userText = thread.body.replace(/<!--[\s\S]*?-->\n*/g, '').trim()
  const replyCount = thread.replies.length
  const hasContent = replyCount > 0 || !thread.closed
  const quote = thread.anchor?.highlightText

  return (
    <div className={`${styles.thread} ${thread.closed ? styles.closed : ''}`}>
      {quote && (
        <div className={styles.quote}>
          <span className={styles.quoteText}>{quote}</span>
        </div>
      )}

      <button
        className={styles.header}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <img
          src={thread.author.avatarUrl}
          className={styles.avatar}
          alt={thread.author.login}
          width={28}
          height={28}
        />
        <div className={styles.headerText}>
          <div className={styles.meta}>
            <span className={styles.author}>{thread.author.login}</span>
            <span className={styles.time}>{timeAgo(thread.createdAt)}</span>
          </div>
          <p className={`${styles.body} ${!expanded ? styles.bodyClamp : ''}`}>{userText}</p>
        </div>
        {hasContent && (
          <div className={styles.headerEnd}>
            {!expanded && replyCount > 0 && (
              <span className={styles.replyBadge}>{replyCount}</span>
            )}
            <Chevron open={expanded} />
          </div>
        )}
      </button>

      <div className={`${styles.collapsible} ${expanded ? styles.collapsibleOpen : ''}`}>
        <div className={styles.collapsibleInner}>
          {thread.replies.map((r) => (
            <div key={r.id} className={styles.reply}>
              <img
                src={r.author.avatarUrl}
                className={styles.avatar}
                alt={r.author.login}
                width={24}
                height={24}
              />
              <div className={styles.replyContent}>
                <div className={styles.meta}>
                  <span className={styles.author}>{r.author.login}</span>
                  <span className={styles.time}>{timeAgo(r.createdAt)}</span>
                </div>
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
      </div>
    </div>
  )
}
