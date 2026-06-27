'use client'
import { useComments } from '@/hooks/useComments'
import { useSuggestions } from '@/hooks/useSuggestions'
import { CommentThread } from '@/components/comments/CommentThread'
import { ApproveButton } from '@/components/suggestions/ApproveButton'
import styles from './CommentPanel.module.css'

interface Props { file: string; currentUserLogin: string }

export function CommentPanel({ file, currentUserLogin }: Props) {
  const { threads: commentThreads, addReply, resolve } = useComments(file)
  const { threads: suggestionThreads, approve } = useSuggestions(file)

  return (
    <div id="comment-panel" aria-label="Comments" className={styles.panel}>
      {suggestionThreads.length > 0 && (
        <section>
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
      <section>
        <h3 className={styles.sectionTitle}>Comments</h3>
        {commentThreads.length === 0 && (
          <p className={styles.empty}>No comments yet. Select text to add one.</p>
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
