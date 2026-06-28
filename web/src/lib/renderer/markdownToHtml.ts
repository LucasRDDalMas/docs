import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import matter from 'gray-matter'
import { visit } from 'unist-util-visit'
import type { Root, Element, Text } from 'hast'
import type { Root as MdastRoot, Text as MdastText } from 'mdast'
import type { Plugin } from 'unified'

const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'])

const injectParagraphIndex: Plugin<[], Root> = () => (tree) => {
  let index = 0
  visit(tree, 'element', (node: Element) => {
    if (BLOCK_TAGS.has(node.tagName)) {
      node.properties = node.properties ?? {}
      node.properties['dataParagraphIndex'] = index++
    }
  })
}

// Convert Obsidian [[wiki links]] to <a> tags
const remarkWikiLinks: Plugin<[], MdastRoot> = () => (tree) => {
  visit(tree, 'text', (node: MdastText, index, parent) => {
    if (!parent || index == null) return
    const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
    const parts: (MdastText | { type: 'link'; url: string; children: MdastText[] })[] = []
    let last = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(node.value)) !== null) {
      if (match.index > last) parts.push({ type: 'text', value: node.value.slice(last, match.index) })
      const target = match[1].trim()
      const label = match[2]?.trim() ?? target
      const href = `/docs/${target.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '/')}`
      parts.push({ type: 'link', url: href, children: [{ type: 'text', value: label }] })
      last = match.index + match[0].length
    }

    if (parts.length === 0) return
    if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) })

    // Replace node in parent
    parent.children.splice(index, 1, ...(parts as MdastText[]))
  })
}

export interface DocMeta {
  title?: string
  type?: string
  status?: string
  tags?: string[]
  description?: string
  section?: string
  [key: string]: unknown
}

export interface RenderedDoc {
  html: string
  frontmatter: DocMeta
}

export async function markdownToHtml(markdown: string): Promise<RenderedDoc> {
  const { content, data } = matter(markdown)
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkWikiLinks)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, {
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        '*': [...(defaultSchema.attributes?.['*'] ?? []), 'dataParagraphIndex', 'dataDocPath'],
      },
    })
    .use(injectParagraphIndex)
    .use(rehypeStringify)
    .process(content)
  return { html: String(result), frontmatter: data as DocMeta }
}
