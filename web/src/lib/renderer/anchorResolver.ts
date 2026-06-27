import type { CommentAnchor, ResolvedAnchor } from '@/types'

function extractParagraphs(html: string): Map<number, string> {
  const map = new Map<number, string>()
  const regex = /data-paragraph-index="(\d+)"[^>]*>([\s\S]*?)<\/\w+>/g
  let match
  while ((match = regex.exec(html)) !== null) {
    const idx = parseInt(match[1], 10)
    const text = match[2].replace(/<[^>]+>/g, '')
    map.set(idx, text)
  }
  return map
}

export function resolveAnchors(html: string, anchors: CommentAnchor[]): ResolvedAnchor[] {
  const paragraphs = extractParagraphs(html)

  return anchors.map((anchor) => {
    const atIndex = paragraphs.get(anchor.paragraphIndex)
    if (atIndex?.includes(anchor.highlightText)) {
      return { anchor, state: 'attached', resolvedParagraphIndex: anchor.paragraphIndex }
    }
    for (const [idx, text] of paragraphs) {
      if (text.includes(anchor.highlightText)) {
        return { anchor, state: 'fuzzy', resolvedParagraphIndex: idx }
      }
    }
    return { anchor, state: 'detached', resolvedParagraphIndex: -1 }
  })
}
