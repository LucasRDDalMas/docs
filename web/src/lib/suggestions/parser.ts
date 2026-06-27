import type { CommentAnchor, SuggestionAnchor } from '@/types'

const ANCHOR_REGEX = /<!--\s*doc-anchor\s*([\s\S]*?)-->/
const SUGGESTION_REGEX = /<!--\s*doc-suggestion\s*([\s\S]*?)-->/

export function parseDiscussionBody(
  body: string,
): CommentAnchor | SuggestionAnchor | null {
  const anchorMatch = ANCHOR_REGEX.exec(body)
  if (anchorMatch) {
    try {
      return JSON.parse(anchorMatch[1].trim()) as CommentAnchor
    } catch {
      return null
    }
  }

  const suggestionMatch = SUGGESTION_REGEX.exec(body)
  if (suggestionMatch) {
    try {
      return JSON.parse(suggestionMatch[1].trim()) as SuggestionAnchor
    } catch {
      return null
    }
  }

  return null
}

export function buildCommentBody(anchor: CommentAnchor, text: string): string {
  return `<!-- doc-anchor\n${JSON.stringify(anchor)}\n-->\n\n${text}`
}

export function buildSuggestionBody(anchor: SuggestionAnchor): string {
  const meta = `<!-- doc-suggestion\n${JSON.stringify(anchor, null, 2)}\n-->`
  const diff = `> ~~${anchor.original}~~\n> ${anchor.proposed}`
  return `${meta}\n\n**Suggested change** — \`${anchor.file}\`, paragraph ${anchor.paragraphIndex}\n\n${diff}\n\nApprove by clicking 👍 (must not be the original author).`
}
