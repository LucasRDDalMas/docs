'use client'
import { useEffect, useState } from 'react'
import type { CommentAnchor } from '@/types'

interface SelectionState {
  anchor: CommentAnchor | null
  rect: DOMRect | null
}

export function useSelection(docPath: string): SelectionState {
  const [state, setState] = useState<SelectionState>({ anchor: null, rect: null })

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
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

  return state
}
