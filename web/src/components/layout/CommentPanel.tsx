'use client'
import { useComments } from '@/hooks/useComments'
import { useSuggestions } from '@/hooks/useSuggestions'
import { CommentThread } from '@/components/comments/CommentThread'
import { ApproveButton } from '@/components/suggestions/ApproveButton'
import { usePanelStore } from './PanelStore'
import styles from './CommentPanel.module.css'

interface Props { file: string; currentUserLogin: string }

export function CommentPanel({ file, currentUserLogin }: Props) {
  const { threads: commentThreads, addReply, resolve } = useComments(file)
  const { threads: suggestionThreads, approve } = useSuggestions(file)
  const { closePanel } = usePanelStore()

  return (
    <div id="comment-panel" aria-label="Comments" className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Comments</span>
        <button className={styles.close} onClick={closePanel} aria-label="Close panel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {suggestionThreads.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Suggestions</h3>
          {suggestionThreads.map((t) => {
            const anchor = t.suggestion
            return (
              <div key={t.id} className={styles.suggestion}>
                {anchor && (
                  <div className={styles.diff}>
                    <del>{anchor.original}</del>
                    <ins>{anchor.proposed}</ins>
                  </div>
                )}
                <ApproveButton
                  thread={t}
                  currentUserLogin={currentUserLogin}
                  onApprove={() => approve(t.id, t.number)}
                />
              </div>
            )
          })}
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Threads</h3>
        {commentThreads.length === 0 && suggestionThreads.length === 0 && (
          <p className={styles.empty}>Select text in the document to add a comment.</p>
        )}
        {commentThreads.map((t) => (
          <CommentThread
            key={t.id}
            thread={t}
            onReply={addReply}
            onResolve={resolve}
          />
        ))}
      </section>
    </div>
  )
}
