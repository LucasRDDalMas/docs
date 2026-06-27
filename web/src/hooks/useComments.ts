'use client'
import { useState, useEffect, useCallback } from 'react'
import type { CommentAnchor, DiscussionThread } from '@/types'

export async function listComments(file: string): Promise<DiscussionThread[]> {
  const res = await fetch(`/api/comments?file=${encodeURIComponent(file)}`)
  const data = await res.json() as { threads: DiscussionThread[] }
  return data.threads ?? []
}

export function useComments(file: string) {
  const [threads, setThreads] = useState<DiscussionThread[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listComments(file)
      setThreads(result)
    } catch {
      setError('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }, [file])

  useEffect(() => { void load() }, [load])

  const addComment = useCallback(async (anchor: CommentAnchor, text: string) => {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anchor, text }),
    })
    if (!res.ok) throw new Error('Failed to create comment')
    await load()
  }, [load])

  const addReply = useCallback(async (threadId: string, body: string) => {
    await fetch(`/api/comments/${threadId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    await load()
  }, [load])

  const resolve = useCallback(async (threadId: string) => {
    await fetch(`/api/comments/${threadId}`, { method: 'DELETE' })
    await load()
  }, [load])

  return { threads, loading, error, addComment, addReply, resolve }
}
