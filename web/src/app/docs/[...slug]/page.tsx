import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { fetchFile, fetchFileTree } from '@/lib/github/contents'
import { markdownToHtml } from '@/lib/renderer/markdownToHtml'
import { getSession } from '@/lib/auth/session'
import { AppShell } from '@/components/layout/AppShell'
import { FileTree } from '@/components/layout/FileTree'
import { CommentPanel } from '@/components/layout/CommentPanel'
import { DocContent } from '@/components/doc/DocContent'

interface Props { params: Promise<{ slug: string[] }> }

// Allow letters, numbers, spaces, hyphens, underscores, dots — but no traversal
const SAFE_SEGMENT = /^[a-zA-Z0-9 _.\-]+$/

function isValidSlug(segments: string[]): boolean {
  return segments.length > 0 &&
    segments.every(s => s.length > 0 && !s.includes('..') && SAFE_SEGMENT.test(s))
}

function titleFromSlug(slug: string[]): string {
  const last = slug[slug.length - 1]
  const segment = last === 'index' ? (slug[slug.length - 2] ?? last) : last
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function titleFromMarkdown(markdown: string): string | null {
  const fmMatch = markdown.match(/^---[\s\S]*?^title:\s*["']?(.+?)["']?\s*$/m)
  if (fmMatch) return fmMatch[1].trim()
  const h1Match = markdown.match(/^#\s+(.+)$/m)
  if (h1Match) return h1Match[1].trim()
  return null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = rawSlug.map(decodeURIComponent)
  const filePath = `docs/${slug.join('/')}.md`
  const base = filePath.replace(/\.md$/, '')
  const markdown = await fetchFile(filePath)
    .catch(() => fetchFile(`${base}/_index.md`))
    .catch(() => fetchFile(`${base}/index.md`))
    .catch(() => null)
  const pageTitle = (markdown && titleFromMarkdown(markdown)) ?? titleFromSlug(slug)
  return { title: `${pageTitle} — Docs` }
}

export default async function DocPage({ params }: Props) {
  const { slug: rawSlug } = await params
  const slug = rawSlug.map(decodeURIComponent)
  if (!isValidSlug(slug)) notFound()
  if (slug[slug.length - 1] === 'index') redirect(`/docs/${slug.slice(0, -1).join('/')}`)

  const filePath = `docs/${slug.join('/')}.md`

  // Check auth first — no GitHub API calls for unauthenticated users
  const session = await getSession()
  if (!session) redirect(`/api/auth/login?return=/docs/${slug.join('/')}`)

  // Now safe to fetch — try _index.md and index.md fallbacks for folder paths
  const base = filePath.replace(/\.md$/, '')
  const [markdown, tree] = await Promise.all([
    fetchFile(filePath)
      .catch(() => fetchFile(`${base}/_index.md`))
      .catch(() => fetchFile(`${base}/index.md`))
      .catch(() => null),
    fetchFileTree(),
  ])

  if (!markdown) notFound()

  const { html, frontmatter } = await markdownToHtml(markdown)

  return (
    <AppShell
      userLogin={session.login}
      nav={<FileTree nodes={tree} currentPath={filePath} />}
      content={<DocContent html={html} frontmatter={frontmatter} filePath={filePath} slug={slug} />}
      panel={<CommentPanel file={filePath} currentUserLogin={session.login} />}
    />
  )
}
