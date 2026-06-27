export interface Session {
  accessToken: string
  login: string
  name: string
  avatarUrl: string
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileNode[]
}

export interface CommentAnchor {
  file: string
  paragraphIndex: number
  highlightStart: number
  highlightEnd: number
  highlightText: string
}

export type AnchorState = 'attached' | 'fuzzy' | 'detached'

export interface ResolvedAnchor {
  anchor: CommentAnchor
  state: AnchorState
  resolvedParagraphIndex: number
}

export interface SuggestionAnchor {
  file: string
  paragraphIndex: number
  original: string
  proposed: string
  status: 'pending' | 'conflict'
}

export interface DiscussionReply {
  id: string
  body: string
  author: { login: string; avatarUrl: string }
  createdAt: string
}

export interface DiscussionThread {
  id: string
  number: number
  title: string
  body: string
  author: { login: string; avatarUrl: string }
  createdAt: string
  closed: boolean
  replies: DiscussionReply[]
  anchor?: CommentAnchor
  suggestion?: SuggestionAnchor
}

export interface SearchResult {
  file: string
  section: 'portal' | 'backlog' | 'glossary' | 'other'
  title: string
  breadcrumb: string
  excerpt: string
  score: number
}
