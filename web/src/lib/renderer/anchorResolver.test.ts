import { describe, it, expect } from 'vitest'
import { resolveAnchors } from './anchorResolver'
import type { CommentAnchor } from '@/types'

const HTML = `
  <p data-paragraph-index="0">First paragraph text here</p>
  <p data-paragraph-index="1">Second paragraph content</p>
`

describe('resolveAnchors', () => {
  it('returns attached when text found at expected index', () => {
    const anchor: CommentAnchor = {
      file: 'test.md',
      paragraphIndex: 0,
      highlightStart: 0,
      highlightEnd: 5,
      highlightText: 'First',
    }
    const [resolved] = resolveAnchors(HTML, [anchor])
    expect(resolved.state).toBe('attached')
    expect(resolved.resolvedParagraphIndex).toBe(0)
  })

  it('returns fuzzy when text found at different index', () => {
    const anchor: CommentAnchor = {
      file: 'test.md',
      paragraphIndex: 0,
      highlightStart: 0,
      highlightEnd: 6,
      highlightText: 'Second',
    }
    const [resolved] = resolveAnchors(HTML, [anchor])
    expect(resolved.state).toBe('fuzzy')
    expect(resolved.resolvedParagraphIndex).toBe(1)
  })

  it('returns detached when text not found anywhere', () => {
    const anchor: CommentAnchor = {
      file: 'test.md',
      paragraphIndex: 0,
      highlightStart: 0,
      highlightEnd: 4,
      highlightText: 'Gone',
    }
    const [resolved] = resolveAnchors(HTML, [anchor])
    expect(resolved.state).toBe('detached')
    expect(resolved.resolvedParagraphIndex).toBe(-1)
  })
})
