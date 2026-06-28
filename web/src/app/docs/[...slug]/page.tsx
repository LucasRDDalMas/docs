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

export default async function DocPage({ params }: Props) {
  const { slug: rawSlug } = await params
  const slug = rawSlug.map(decodeURIComponent)
  if (!isValidSlug(slug)) notFound()

  const filePath = `docs/${slug.join('/')}.md`

  // Check auth first — no GitHub API calls for unauthenticated users
  const session = await getSession()
  if (!session) redirect(`/api/auth/login?return=/docs/${slug.join('/')}`)

  // Now safe to fetch — try _index.md fallback for folder paths
  const indexPath = filePath.replace(/\.md$/, '/_index.md')
  const [markdown, tree] = await Promise.all([
    fetchFile(filePath).catch(() => fetchFile(indexPath).catch(() => null)),
    fetchFileTree(),
  ])

  if (!markdown) notFound()

  const html = await markdownToHtml(markdown)

  return (
    <AppShell
      nav={<FileTree nodes={tree} currentPath={filePath} />}
      content={<DocContent html={html} filePath={filePath} />}
      panel={<CommentPanel file={filePath} currentUserLogin={session.login} />}
    />
  )
}
