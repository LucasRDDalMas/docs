import { getBotOctokit } from './client'
import { getCache } from '@/lib/cache'
import type { FileNode } from '@/types'

const OWNER = process.env.GITHUB_REPO_OWNER!
const REPO = process.env.GITHUB_REPO_NAME!
const ROOT = process.env.GITHUB_DOCS_ROOT ?? 'docs'

export function buildFilePath(root: string, path: string): string {
  return root ? `${root}/${path}` : path
}

export function buildCommitMessage(path: string): string {
  return `docs: accept suggestion in ${path} [skip ci]`
}

export async function fetchFile(path: string): Promise<string> {
  return getCache(`file:${path}`, 60_000, async () => {
    const octokit = getBotOctokit()
    const { data } = await octokit.rest.repos.getContent({ owner: OWNER, repo: REPO, path })
    if (Array.isArray(data) || data.type !== 'file') throw new Error('Not a file')
    return Buffer.from(data.content, 'base64').toString('utf8')
  })
}

export async function fetchFileSha(path: string): Promise<string> {
  const octokit = getBotOctokit()
  const { data } = await octokit.rest.repos.getContent({ owner: OWNER, repo: REPO, path })
  if (Array.isArray(data) || data.type !== 'file') throw new Error('Not a file')
  return data.sha
}

export async function commitFile(
  path: string,
  content: string,
  sha: string,
): Promise<void> {
  const octokit = getBotOctokit()
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path,
    message: buildCommitMessage(path),
    content: Buffer.from(content).toString('base64'),
    sha,
    committer: { name: 'docs-bot', email: 'docs-bot@users.noreply.github.com' },
  })
}

export async function fetchFileTree(): Promise<FileNode[]> {
  return getCache('file-tree', 120_000, async () => {
    const octokit = getBotOctokit()
    const { data } = await octokit.rest.git.getTree({
      owner: OWNER,
      repo: REPO,
      tree_sha: 'HEAD',
      recursive: '1',
    })
    return buildTree(data.tree, ROOT)
  })
}

function buildTree(
  items: Array<{ path?: string; type?: string }>,
  root: string,
): FileNode[] {
  const nodes = new Map<string, FileNode>()
  const rootPrefix = root ? `${root}/` : ''

  for (const item of items) {
    if (!item.path?.startsWith(rootPrefix)) continue
    const rel = item.path.slice(rootPrefix.length)
    const parts = rel.split('/')
    let parent: FileNode[] = nodes.get('__root__')?.children ?? []
    if (!nodes.has('__root__')) {
      const root: FileNode = { name: '', path: '', type: 'dir', children: [] }
      nodes.set('__root__', root)
      parent = root.children!
    }
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      const path = rootPrefix + parts.slice(0, i + 1).join('/')
      let node = parent.find(n => n.name === name)
      if (!node) {
        node = {
          name,
          path,
          type: i === parts.length - 1 && item.type === 'blob' ? 'file' : 'dir',
          children: [],
        }
        parent.push(node)
      }
      parent = node.children!
    }
  }
  return nodes.get('__root__')?.children ?? []
}
