'use client'
import { useComments } from '@/hooks/useComments'
import { useSuggestions } from '@/hooks/useSuggestions'
import { CommentThread } from '@/components/comments/CommentThread'
import { ApproveButton } from '@/components/suggestions/ApproveButton'
import { usePanelStore } from './PanelStore'
import styles from './CommentPanel.module.css'

function Skeletons() {
  return (
    <div className={styles.skeletons} aria-hidden="true">
      {[72, 55, 88].map((w) => (
        <div key={w} className={styles.skeletonCard}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} style={{ width: `${w}%` }} />
          <div className={styles.skeletonAuthorRow}>
            <div className={styles.skeletonAvatar} />
            <div className={styles.skeletonLine} style={{ width: '40%', margin: 0 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

interface Props { file: string; currentUserLogin: string }

export function CommentPanel({ file, currentUserLogin }: Props) {
  const { threads: commentThreads, loading: commentsLoading, addReply, resolve } = useComments(file)
  const { threads: suggestionThreads, loading: suggestionsLoading, approve } = useSuggestions(file)
  const { tab, setTab, closePanel } = usePanelStore()

  const commentCount = commentThreads.filter(t => !t.closed).length
  const suggestionCount = suggestionThreads.filter(t => !t.closed).length

  return (
    <div id="comment-panel" aria-label="Comments" className={styles.panel}>
      {/* ── Tab bar + close ── */}
      <div className={styles.tabBar}>
        <button
          role="tab"
          aria-selected={tab === 'comments'}
          className={`${styles.tabBtn} ${tab === 'comments' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('comments')}
        >
          Comments
          {commentCount > 0 && <span className={styles.count}>{commentCount}</span>}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'suggestions'}
          className={`${styles.tabBtn} ${tab === 'suggestions' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('suggestions')}
        >
          Suggestions
          {suggestionCount > 0 && <span className={`${styles.count} ${styles.countViolet}`}>{suggestionCount}</span>}
        </button>
        <button className={styles.close} onClick={closePanel} aria-label="Close panel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Comments tab ── */}
      {tab === 'comments' && (
        <div className={styles.body}>
          {commentsLoading ? (
            <Skeletons />
          ) : commentThreads.length === 0 ? (
            <p className={styles.empty}>Select text in the document to add a comment.</p>
          ) : (
            commentThreads.map((t) => (
              <CommentThread
                key={t.id}
                thread={t}
                onReply={addReply}
                onResolve={resolve}
              />
            ))
          )}
        </div>
      )}

      {/* ── Suggestions tab ── */}
      {tab === 'suggestions' && (
        <div className={styles.body}>
          {suggestionsLoading ? (
            <Skeletons />
          ) : suggestionThreads.length === 0 ? (
            <p className={styles.empty}>Select text in the document to propose a change.</p>
          ) : (
            suggestionThreads.map((t) => {
              const s = t.suggestion
              return (
                <div key={t.id} className={`${styles.sugCard} ${t.closed ? styles.sugClosed : ''}`}>
                  {s && (
                    <div className={styles.diff}>
                      <div className={styles.diffOrig}>{s.original}</div>
                      <div className={styles.diffProposed}>{s.proposed}</div>
                    </div>
                  )}
                  <div className={styles.sugMeta}>
                    <img
                      src={t.author.avatarUrl}
                      alt={t.author.login}
                      width={18}
                      height={18}
                      className={styles.sugAvatar}
                    />
                    <span className={styles.sugAuthor}>{t.author.login}</span>
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.sugLink}
                      aria-label="View discussion on GitHub"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                  <div className={styles.sugActions}>
                    <ApproveButton
                      thread={t}
                      currentUserLogin={currentUserLogin}
                      onApprove={() => approve(t.id, t.number)}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
