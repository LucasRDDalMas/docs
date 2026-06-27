'use client'
import { useState, useEffect, useCallback } from 'react'
import type { DiscussionThread, SuggestionAnchor } from '@/types'

export async function listSuggestions(file: string): Promise<DiscussionThread[]> {
  const res = await fetch(`/api/suggestions?file=${encodeURIComponent(file)}`)
  const data = await res.json() as { threads: DiscussionThread[] }
  return data.threads ?? []
}

export function useSuggestions(file: string) {
  const [threads, setThreads] = useState<DiscussionThread[]>([])

  const load = useCallback(async () => {
    try {
      const result = await listSuggestions(file)
      setThreads(result)
    } catch {
      // silently ignore load errors; UI shows empty state
    }
  }, [file])

  useEffect(() => { void load() }, [load])

  const addSuggestion = useCallback(async (anchor: SuggestionAnchor) => {
    await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(anchor),
    })
    await load()
  }, [load])

  const approve = useCallback(async (threadId: string, discussionNumber: number) => {
    const res = await fetch(`/api/suggestions/${threadId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discussionNumber }),
    })
    if (!res.ok) {
      const err = await res.json() as { error: string }
      throw new Error(err.error)
    }
    await load()
  }, [load])

  return { threads, addSuggestion, approve }
}
