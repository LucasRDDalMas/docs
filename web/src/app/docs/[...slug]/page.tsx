import { notFound, redirect } from 'next/navigation'
import { fetchFile, fetchFileTree } from '@/lib/github/contents'
import { markdownToHtml } from '@/lib/renderer/markdownToHtml'
import { getSession } from '@/lib/auth/session'
import { AppShell } from '@/components/layout/AppShell'
import { FileTree } from '@/components/layout/FileTree'
import { CommentPanel } from '@/components/layout/CommentPanel'
import { DocContent } from '@/components/doc/DocContent'

interface Props { params: Promise<{ slug: string[] }> }

export default async function DocPage({ params }: Props) {
  const { slug } = await params
  const filePath = `doc/${slug.join('/')}.md`

  const [markdown, tree, session] = await Promise.all([
    fetchFile(filePath).catch(() => null),
    fetchFileTree(),
    getSession(),
  ])

  if (!session) redirect(`/api/auth/login?return=/docs/${slug.join('/')}`)
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
