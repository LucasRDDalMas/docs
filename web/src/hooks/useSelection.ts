'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CommentAnchor } from '@/types'

interface SelectionState {
  anchor: CommentAnchor | null
  rect: DOMRect | null
}

// SSR-safe: only used in 'use client' components, but Next.js pre-renders them on the server
const useClientLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function useSelection(docPath: string): SelectionState {
  const [state, setState] = useState<SelectionState>({ anchor: null, rect: null })
  const savedRange = useRef<Range | null>(null)

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        savedRange.current = null
        setState({ anchor: null, rect: null })
        return
      }
      const range = sel.getRangeAt(0)
      const container = range.commonAncestorContainer
      const block = (container.nodeType === Node.TEXT_NODE
        ? (container as Text).parentElement
        : container as Element
      )?.closest('[data-paragraph-index]')
      if (!block) return

      const paragraphIndex = parseInt(block.getAttribute('data-paragraph-index') ?? '0', 10)
      const highlightText = sel.toString().trim()
      if (!highlightText) return

      const rect = range.getBoundingClientRect()
      savedRange.current = range.cloneRange()
      setState({
        rect,
        anchor: {
          file: docPath,
          paragraphIndex,
          highlightStart: range.startOffset,
          highlightEnd: range.endOffset,
          highlightText,
        },
      })
    }

    document.addEventListener('mouseup', handler)
    return () => document.removeEventListener('mouseup', handler)
  }, [docPath])

  // React re-renders clear the browser's text selection. Restore it before each paint.
  // No dependency array: must run after every commit, not just when anchor changes,
  // because any child re-render (e.g. toolbar mounting) can also clear the selection.
  useClientLayoutEffect(() => {
    if (!state.anchor || !savedRange.current) return
    const sel = window.getSelection()
    if (!sel || !sel.isCollapsed) return  // already has a selection, don't clobber it
    sel.removeAllRanges()
    sel.addRange(savedRange.current)
  })

  return state
}
