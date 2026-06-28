import { describe, it, expect } from 'vitest'
import type {
  Session,
  FileNode,
  CommentAnchor,
  SuggestionAnchor,
  DiscussionThread,
  SearchResult,
  AnchorState,
  ResolvedAnchor,
  DiscussionReply,
} from '@/types'

describe('types', () => {
  it('Session shape is correct', () => {
    const session: Session = {
      accessToken: 'tok',
      login: 'user',
      name: 'User Name',
      avatarUrl: 'https://example.com/avatar.png',
    }
    expect(session.login).toBe('user')
  })

  it('FileNode supports nested children', () => {
    const node: FileNode = {
      name: 'docs',
      path: '/docs',
      type: 'dir',
      children: [{ name: 'index.md', path: '/docs/index.md', type: 'file' }],
    }
    expect(node.children).toHaveLength(1)
  })

  it('CommentAnchor shape is correct', () => {
    const anchor: CommentAnchor = {
      file: 'docs/page.md',
      paragraphIndex: 2,
      highlightStart: 0,
      highlightEnd: 10,
      highlightText: 'some text',
    }
    expect(anchor.paragraphIndex).toBe(2)
  })

  it('AnchorState covers all variants', () => {
    const states: AnchorState[] = ['attached', 'fuzzy', 'detached']
    expect(states).toHaveLength(3)
  })

  it('ResolvedAnchor includes state and resolvedParagraphIndex', () => {
    const anchor: CommentAnchor = {
      file: 'docs/page.md',
      paragraphIndex: 0,
      highlightStart: 0,
      highlightEnd: 5,
      highlightText: 'hello',
    }
    const resolved: ResolvedAnchor = {
      anchor,
      state: 'fuzzy',
      resolvedParagraphIndex: 1,
    }
    expect(resolved.state).toBe('fuzzy')
  })

  it('SuggestionAnchor shape is correct', () => {
    const suggestion: SuggestionAnchor = {
      file: 'docs/page.md',
      paragraphIndex: 1,
      original: 'old text',
      proposed: 'new text',
      status: 'pending',
    }
    expect(suggestion.status).toBe('pending')
  })

  it('DiscussionReply shape is correct', () => {
    const reply: DiscussionReply = {
      id: '1',
      body: 'reply body',
      author: { login: 'user', avatarUrl: 'https://example.com/a.png' },
      createdAt: '2024-01-01T00:00:00Z',
    }
    expect(reply.id).toBe('1')
  })

  it('DiscussionThread shape is correct', () => {
    const thread: DiscussionThread = {
      id: 'D_1',
      number: 1,
      title: 'Test thread',
      body: 'body',
      author: { login: 'user', avatarUrl: 'https://example.com/a.png' },
      createdAt: '2024-01-01T00:00:00Z',
      closed: false,
      replies: [],
    }
    expect(thread.closed).toBe(false)
  })

  it('SearchResult shape is correct', () => {
    const result: SearchResult = {
      file: 'docs/page.md',
      section: 'portal',
      title: 'Portal Page',
      breadcrumb: 'doc > portal',
      excerpt: 'Some excerpt…',
      score: 0.95,
    }
    expect(result.section).toBe('portal')
  })
})
