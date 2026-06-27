import { describe, it, expect } from 'vitest'
import { applyPatch } from './patcher'

describe('applyPatch', () => {
  it('replaces first occurrence of original with proposed', () => {
    const md = '# Title\n\nThis is the original text here.\n\nAnother paragraph.'
    const result = applyPatch(md, 'original text', 'updated text')
    expect(result).toContain('updated text')
    expect(result).not.toContain('original text')
  })

  it('returns null if text not found', () => {
    const md = '# Title\n\nSome content.'
    const result = applyPatch(md, 'missing text', 'replacement')
    expect(result).toBeNull()
  })

  it('only replaces the first occurrence', () => {
    const md = 'word word word'
    const result = applyPatch(md, 'word', 'term')
    expect(result).toBe('term word word')
  })
})
