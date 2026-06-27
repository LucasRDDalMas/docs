export function applyPatch(
  markdown: string,
  original: string,
  proposed: string,
): string {
  const idx = markdown.indexOf(original)
  if (idx === -1) return markdown
  return markdown.slice(0, idx) + proposed + markdown.slice(idx + original.length)
}
