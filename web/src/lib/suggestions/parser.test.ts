import { describe, it, expect } from 'vitest'
import { parseDiscussionBody } from './parser'

const commentBody = `<!-- doc-anchor
{"file":"portal/dashboard/index.md","paragraphIndex":2,"highlightStart":0,"highlightEnd":10,"highlightText":"Dashboard"}
-->

My comment here.`

const suggestionBody = `<!-- doc-suggestion
{"file":"portal/dashboard/index.md","paragraphIndex":2,"original":"Dashboard","proposed":"Overview","status":"pending"}
-->

Suggested change.`

describe('parseDiscussionBody', () => {
  it('parses a comment anchor', () => {
    const result = parseDiscussionBody(commentBody)
    expect(result).toMatchObject({
      file: 'portal/dashboard/index.md',
      paragraphIndex: 2,
      highlightText: 'Dashboard',
    })
  })

  it('parses a suggestion anchor', () => {
    const result = parseDiscussionBody(suggestionBody)
    expect(result).toMatchObject({
      file: 'portal/dashboard/index.md',
      original: 'Dashboard',
      proposed: 'Overview',
      status: 'pending',
    })
  })

  it('returns null for plain body with no metadata', () => {
    expect(parseDiscussionBody('Just a comment, no metadata')).toBeNull()
  })
})
