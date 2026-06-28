import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import matter from 'gray-matter'
import { visit } from 'unist-util-visit'
import type { Root, Element } from 'hast'
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

export async function markdownToHtml(markdown: string): Promise<string> {
  const { content } = matter(markdown)
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
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
  return String(result)
}
