import { Octokit } from '@octokit/rest'
import { create, insert, save } from '@orama/orama'
import matter from 'gray-matter'
import fs from 'fs'
import path from 'path'

const OWNER = process.env.GITHUB_REPO_OWNER!
const REPO = process.env.GITHUB_REPO_NAME!
const ROOT = process.env.GITHUB_DOCS_ROOT ?? 'doc'
const SECTION_MAP: Record<string, string> = {
  portal: 'portal',
  backlog: 'backlog',
  glossary: 'glossary',
}

async function getAllMarkdownFiles(
  octokit: Octokit,
): Promise<Array<{ path: string; content: string }>> {
  const { data } = await octokit.rest.git.getTree({
    owner: OWNER,
    repo: REPO,
    tree_sha: 'HEAD',
    recursive: '1',
  })
  const mdFiles = data.tree.filter(
    (f) => f.path?.startsWith(`${ROOT}/`) && f.path.endsWith('.md') && f.type === 'blob',
  )
  return Promise.all(
    mdFiles.map(async (f) => {
      const { data: blob } = await octokit.rest.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: f.path!,
      })
      if (Array.isArray(blob) || blob.type !== 'file') {
        return { path: f.path!, content: '' }
      }
      return {
        path: f.path!,
        content: Buffer.from(blob.content, 'base64').toString('utf8'),
      }
    }),
  )
}

function chunkByHeadings(content: string): Array<{ heading: string; body: string }> {
  const lines = content.split('\n')
  const chunks: Array<{ heading: string; body: string }> = []
  let current = { heading: '', lines: [] as string[] }
  for (const line of lines) {
    if (line.startsWith('#')) {
      if (current.lines.length) {
        chunks.push({ heading: current.heading, body: current.lines.join('\n').trim() })
      }
      current = { heading: line.replace(/^#+\s*/, ''), lines: [] }
    } else {
      current.lines.push(line)
    }
  }
  if (current.lines.length) {
    chunks.push({ heading: current.heading, body: current.lines.join('\n').trim() })
  }
  return chunks
}

function getSection(filePath: string): string {
  const rel = filePath.slice(`${ROOT}/`.length)
  const top = rel.split('/')[0]
  return SECTION_MAP[top] ?? 'other'
}

async function main() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

  // Try to load transformers; fall back gracefully — schema is text-only for now
  try {
    await import('@xenova/transformers')
    console.log('Transformers available — text-only index selected (schema has no embedding field)')
  } catch {
    console.log('Transformers not available — building text-only index')
  }

  const db = await create({
    schema: {
      file: 'string',
      section: 'string',
      title: 'string',
      breadcrumb: 'string',
      body: 'string',
    } as const,
  })

  const files = await getAllMarkdownFiles(octokit)
  console.log(`Indexing ${files.length} files…`)

  for (const { path: filePath, content } of files) {
    const { content: stripped } = matter(content)
    const chunks = chunkByHeadings(stripped)
    const section = getSection(filePath)
    const title = filePath.split('/').pop()?.replace(/\.md$/, '') ?? ''

    for (const chunk of chunks) {
      await insert(db, {
        file: filePath,
        section,
        title,
        breadcrumb: chunk.heading ? `${title} › ${chunk.heading}` : title,
        body: chunk.body.slice(0, 500),
      })
    }
  }

  const serialised = await save(db)
  const outPath = path.join(process.cwd(), 'public', 'search-index.json')
  fs.writeFileSync(outPath, JSON.stringify(serialised))
  console.log(`Index written to ${outPath}`)
}

main().catch(console.error)
