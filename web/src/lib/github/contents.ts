import fs from 'fs'
import path from 'path'
import { getBotOctokit } from './client'
import { getCache } from '@/lib/cache'
import type { FileNode } from '@/types'

const OWNER = process.env.GITHUB_REPO_OWNER!
const REPO = process.env.GITHUB_REPO_NAME!
const ROOT = process.env.GITHUB_DOCS_ROOT ?? 'docs'

// Absolute path to the local docs folder (only present during local dev)
const LOCAL_DOCS = path.resolve(process.cwd(), '..', ROOT)

function localPath(filePath: string): string {
  const rel = filePath.startsWith(`${ROOT}/`) ? filePath.slice(`${ROOT}/`.length) : filePath
  return path.join(LOCAL_DOCS, rel)
}

export function buildFilePath(root: string, relPath: string): string {
  return root ? `${root}/${relPath}` : relPath
}

export function buildCommitMessage(filePath: string): string {
  return `docs: accept suggestion in ${filePath} [skip ci]`
}

export async function fetchFile(filePath: string): Promise<string> {
  return getCache(`file:${filePath}`, 60_000, async () => {
    if (fs.existsSync(LOCAL_DOCS)) {
      const abs = localPath(filePath)
      if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`)
      return fs.readFileSync(abs, 'utf8')
    }
    const octokit = getBotOctokit()
    const { data } = await octokit.rest.repos.getContent({ owner: OWNER, repo: REPO, path: filePath })
    if (Array.isArray(data) || data.type !== 'file') throw new Error('Not a file')
    return Buffer.from(data.content, 'base64').toString('utf8')
  })
}

export async function fetchFileSha(filePath: string): Promise<string> {
  const octokit = getBotOctokit()
  const { data } = await octokit.rest.repos.getContent({ owner: OWNER, repo: REPO, path: filePath })
  if (Array.isArray(data) || data.type !== 'file') throw new Error('Not a file')
  return data.sha
}

export async function commitFile(
  filePath: string,
  content: string,
  sha: string,
): Promise<void> {
  const octokit = getBotOctokit()
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: filePath,
    message: buildCommitMessage(filePath),
    content: Buffer.from(content).toString('base64'),
    sha,
    committer: { name: 'docs-bot', email: 'docs-bot@users.noreply.github.com' },
  })
}

export async function fetchFileTree(): Promise<FileNode[]> {
  return getCache('file-tree', 120_000, async () => {
    if (fs.existsSync(LOCAL_DOCS)) {
      return buildTreeLocal(LOCAL_DOCS, LOCAL_DOCS)
    }
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

function buildTreeLocal(dir: string, root: string): FileNode[] {
  const nodes: FileNode[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => !e.name.startsWith('.'))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  for (const entry of entries) {
    const abs = path.join(dir, entry.name)
    const rel = `${ROOT}/${path.relative(root, abs).replace(/\\/g, '/')}`
    if (entry.isDirectory()) {
      nodes.push({ name: entry.name, path: rel, type: 'dir', children: buildTreeLocal(abs, root) })
    } else if (entry.name.endsWith('.md')) {
      nodes.push({ name: entry.name, path: rel, type: 'file', children: [] })
    }
  }
  return nodes
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
      const rootNode: FileNode = { name: '', path: '', type: 'dir', children: [] }
      nodes.set('__root__', rootNode)
      parent = rootNode.children!
    }
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      const nodePath = rootPrefix + parts.slice(0, i + 1).join('/')
      let node = parent.find(n => n.name === name)
      if (!node) {
        node = {
          name,
          path: nodePath,
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
