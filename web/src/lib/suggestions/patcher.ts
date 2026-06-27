export function applyPatch(
  markdown: string,
  original: string,
  proposed: string,
): string | null {
  const idx = markdown.indexOf(original)
  if (idx === -1) return null
  return markdown.slice(0, idx) + proposed + markdown.slice(idx + original.length)
}
