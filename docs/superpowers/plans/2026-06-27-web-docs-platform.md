# Web Docs Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stateless Next.js 15 web app that renders the Markdown vault, with inline comments and suggestions backed by GitHub Discussions, hybrid search built at CI time, and a GitHub Actions + Helm deploy pipeline.

**Architecture:** All persistent state lives in GitHub Discussions — no database, no PVC. The Next.js pod runs with a read-only filesystem. User identity comes from GitHub OAuth (iron-session cookie); a GitHub App bot commits accepted suggestions to `main`, triggering a Helm redeploy.

**Tech Stack:** Next.js 15 App Router, TypeScript, Octokit.js, iron-session, unified/remark/rehype, gray-matter, Orama, @xenova/transformers, diff-match-patch, Radix UI, CSS Modules, Docker, Helm, GitHub Actions.

## Global Constraints

- Node.js ≥ 22; Next.js 15 App Router (no Pages Router)
- TypeScript strict mode — no `any`
- Pod filesystem is read-only — no `fs.writeFile` at runtime; all disk writes are build-time only
- All GitHub API calls for comments/reactions use the **user's** OAuth token (correct attribution)
- Only Commit Gateway uses the **bot** GitHub App identity
- Zero proprietary dependencies — every library must be MIT or Apache 2.0
- Vitest for all tests; no Jest
- CSS Modules + CSS custom properties — no Tailwind

---

### Task 1: Project Scaffold ✅

**Files:**
- Create: `web/package.json`
- Create: `web/next.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/.env.example`
- Create: `web/src/types/index.ts`

**Interfaces:**
- Produces: `Session`, `CommentAnchor`, `SuggestionAnchor`, `SearchResult`, `DiscussionThread`, `FileNode` types consumed by all later tasks

- [ ] **Step 1: Create the `web/` directory and initialise Next.js**

```bash
mkdir -p web && cd web
npx create-next-app@latest . \
  --typescript --no-tailwind --no-eslint \
  --app --src-dir --no-import-alias
```

Expected: Next.js 15 scaffold with `src/app/` created.

- [ ] **Step 2: Install dependencies**

```bash
cd web
npm install \
  @octokit/rest @octokit/graphql \
  iron-session \
  unified remark remark-parse remark-rehype rehype-stringify rehype-raw \
  gray-matter \
  @orama/orama \
  diff-match-patch \
  @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-tooltip

npm install --save-dev \
  @xenova/transformers \
  vitest @vitejs/plugin-react \
  @types/diff-match-patch
```

- [ ] **Step 3: Write `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `web/next.config.ts`**

```ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',
  experimental: { serverComponentsExternalPackages: ['@xenova/transformers'] },
}

export default config
```

- [ ] **Step 5: Write `web/.env.example`**

```bash
# GitHub OAuth App
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# GitHub App (bot identity for commits)
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=          # PEM, newlines replaced with \n
GITHUB_APP_INSTALLATION_ID=

# Docs repo
GITHUB_REPO_OWNER=
GITHUB_REPO_NAME=
GITHUB_DOCS_ROOT=doc             # subfolder inside repo containing the vault

# Session
SESSION_SECRET=                  # 32+ random chars

# Discussion category node IDs (set after GitHub setup)
DISCUSSIONS_COMMENTS_CATEGORY_ID=
DISCUSSIONS_SUGGESTIONS_CATEGORY_ID=
```

- [ ] **Step 6: Write `web/src/types/index.ts`**

```ts
export interface Session {
  accessToken: string
  login: string
  name: string
  avatarUrl: string
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileNode[]
}

export interface CommentAnchor {
  file: string
  paragraphIndex: number
  highlightStart: number
  highlightEnd: number
  highlightText: string
}

export type AnchorState = 'attached' | 'fuzzy' | 'detached'

export interface ResolvedAnchor {
  anchor: CommentAnchor
  state: AnchorState
  resolvedParagraphIndex: number
}

export interface SuggestionAnchor {
  file: string
  paragraphIndex: number
  original: string
  proposed: string
  status: 'pending' | 'conflict'
}

export interface DiscussionReply {
  id: string
  body: string
  author: { login: string; avatarUrl: string }
  createdAt: string
}

export interface DiscussionThread {
  id: string
  number: number
  title: string
  body: string
  author: { login: string; avatarUrl: string }
  createdAt: string
  closed: boolean
  replies: DiscussionReply[]
  anchor?: CommentAnchor
  suggestion?: SuggestionAnchor
}

export interface SearchResult {
  file: string
  section: 'portal' | 'backlog' | 'glossary' | 'other'
  title: string
  breadcrumb: string
  excerpt: string
  score: number
}
```

- [ ] **Step 7: Configure Vitest — write `web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

- [ ] **Step 8: Commit**

```bash
cd web
git add .
git commit -m "feat: scaffold Next.js 15 project with types and tooling"
```

---

### Task 2: In-Memory Cache + GitHub API Client ✅

**Files:**
- Create: `web/src/lib/cache.ts`
- Create: `web/src/lib/github/client.ts`
- Test: `web/src/lib/cache.test.ts`

**Interfaces:**
- Produces: `getCache<T>(key, ttlMs, fetcher)` — used by contents.ts and discussions.ts
- Produces: `getUserOctokit(token: string): Octokit` — used by discussions.ts and reactions.ts
- Produces: `getBotOctokit(): Octokit` — used by commitGateway.ts

- [ ] **Step 1: Write the failing test for cache**

```ts
// web/src/lib/cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCache } from './cache'

beforeEach(() => { vi.useFakeTimers() })

describe('getCache', () => {
  it('calls fetcher on first access', async () => {
    const fetcher = vi.fn().mockResolvedValue('value-1')
    const result = await getCache('key1', 5000, fetcher)
    expect(result).toBe('value-1')
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('returns cached value before TTL', async () => {
    const fetcher = vi.fn().mockResolvedValue('value-2')
    await getCache('key2', 5000, fetcher)
    vi.advanceTimersByTime(4000)
    await getCache('key2', 5000, fetcher)
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('re-fetches after TTL expires', async () => {
    const fetcher = vi.fn().mockResolvedValue('value-3')
    await getCache('key3', 5000, fetcher)
    vi.advanceTimersByTime(6000)
    await getCache('key3', 5000, fetcher)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
cd web && npx vitest run src/lib/cache.test.ts
```

Expected: `Error: Cannot find module './cache'`

- [ ] **Step 3: Implement `web/src/lib/cache.ts`**

```ts
interface CacheEntry<T> { value: T; expiresAt: number }

const store = new Map<string, CacheEntry<unknown>>()

export async function getCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (entry && Date.now() < entry.expiresAt) return entry.value
  const value = await fetcher()
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
  return value
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
cd web && npx vitest run src/lib/cache.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Implement `web/src/lib/github/client.ts`**

```ts
import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'

export function getUserOctokit(token: string): Octokit {
  return new Octokit({ auth: token })
}

export function getBotOctokit(): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      installationId: process.env.GITHUB_APP_INSTALLATION_ID!,
    },
  })
}
```

> Note: `@octokit/auth-app` must be installed: `npm install @octokit/auth-app`

- [ ] **Step 6: Commit**

```bash
cd web
git add src/lib/cache.ts src/lib/cache.test.ts src/lib/github/client.ts
git commit -m "feat: in-memory TTL cache and GitHub Octokit client factory"
```

---

### Task 3: Auth — GitHub OAuth + iron-session ✅

**Files:**
- Create: `web/src/lib/auth/session.ts`
- Create: `web/src/lib/auth/middleware.ts`
- Create: `web/src/app/api/auth/login/route.ts`
- Create: `web/src/app/api/auth/callback/route.ts`
- Create: `web/src/app/api/auth/logout/route.ts`
- Test: `web/src/lib/auth/session.test.ts`

**Interfaces:**
- Produces: `getSession(req): Promise<Session | null>` — used by all API routes
- Produces: `requireAuth(req): Promise<Session>` — throws 401 if not logged in

- [ ] **Step 1: Write failing test**

```ts
// web/src/lib/auth/session.test.ts
import { describe, it, expect } from 'vitest'
import { buildSessionCookieOptions } from './session'

describe('buildSessionCookieOptions', () => {
  it('returns httpOnly secure options', () => {
    const opts = buildSessionCookieOptions()
    expect(opts.cookieName).toBe('docs-session')
    expect(opts.cookieOptions?.httpOnly).toBe(true)
    expect(opts.cookieOptions?.secure).toBe(true)
    expect(opts.cookieOptions?.sameSite).toBe('lax')
  })
})
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
cd web && npx vitest run src/lib/auth/session.test.ts
```

- [ ] **Step 3: Implement `web/src/lib/auth/session.ts`**

```ts
import { IronSessionOptions, getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import type { Session } from '@/types'

export function buildSessionCookieOptions(): IronSessionOptions {
  return {
    cookieName: 'docs-session',
    password: process.env.SESSION_SECRET!,
    cookieOptions: { httpOnly: true, secure: true, sameSite: 'lax' },
  }
}

export async function getSession(): Promise<Session | null> {
  const session = await getIronSession<{ user?: Session }>(
    await cookies(),
    buildSessionCookieOptions(),
  )
  return session.user ?? null
}

export async function setSession(user: Session): Promise<void> {
  const session = await getIronSession<{ user?: Session }>(
    await cookies(),
    buildSessionCookieOptions(),
  )
  session.user = user
  await session.save()
}

export async function clearSession(): Promise<void> {
  const session = await getIronSession<{ user?: Session }>(
    await cookies(),
    buildSessionCookieOptions(),
  )
  session.destroy()
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
cd web && npx vitest run src/lib/auth/session.test.ts
```

- [ ] **Step 5: Implement `web/src/lib/auth/middleware.ts`**

```ts
import { NextResponse } from 'next/server'
import { getSession } from './session'
import type { Session } from '@/types'

export async function requireAuth(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    throw new Response('Unauthorized', { status: 401 })
  }
  return session
}
```

- [ ] **Step 6: Implement auth API routes**

`web/src/app/api/auth/login/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'

export function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get('return') ?? '/docs'
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    scope: 'read:user user:email',
    state: encodeURIComponent(returnTo),
  })
  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params}`,
  )
}
```

`web/src/app/api/auth/callback/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { setSession } from '@/lib/auth/session'
import { getUserOctokit } from '@/lib/github/client'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state') ?? ''
  const returnTo = decodeURIComponent(state) || '/docs'

  if (!code) return NextResponse.redirect(new URL('/login?error=missing_code', req.url))

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      code,
    }),
  })
  const tokenData = await tokenRes.json() as { access_token?: string; error?: string }
  if (!tokenData.access_token) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', req.url))
  }

  const octokit = getUserOctokit(tokenData.access_token)
  const { data: ghUser } = await octokit.rest.users.getAuthenticated()

  await setSession({
    accessToken: tokenData.access_token,
    login: ghUser.login,
    name: ghUser.name ?? ghUser.login,
    avatarUrl: ghUser.avatar_url,
  })

  return NextResponse.redirect(new URL(returnTo, req.url))
}
```

`web/src/app/api/auth/logout/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth/session'

export async function POST() {
  await clearSession()
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_BASE_URL))
}
```

- [ ] **Step 7: Commit**

```bash
cd web
git add src/lib/auth/ src/app/api/auth/
git commit -m "feat: GitHub OAuth login/callback/logout with iron-session"
```

---

### Task 4: GitHub Contents API + Doc File Tree ✅

**Files:**
- Create: `web/src/lib/github/contents.ts`
- Create: `web/src/app/api/docs/tree/route.ts`
- Test: `web/src/lib/github/contents.test.ts`

**Interfaces:**
- Produces: `fetchFile(path: string): Promise<string>` — raw Markdown content
- Produces: `fetchFileTree(root: string): Promise<FileNode[]>`
- Produces: `commitFile(path: string, content: string, sha: string, message: string): Promise<void>` — bot identity

- [ ] **Step 1: Write failing tests**

```ts
// web/src/lib/github/contents.test.ts
import { describe, it, expect, vi } from 'vitest'
import { buildFilePath, buildCommitMessage } from './contents'

describe('buildFilePath', () => {
  it('joins root and path without double slash', () => {
    expect(buildFilePath('doc', 'portal/dashboard/index.md'))
      .toBe('doc/portal/dashboard/index.md')
  })

  it('handles empty root', () => {
    expect(buildFilePath('', 'portal/index.md')).toBe('portal/index.md')
  })
})

describe('buildCommitMessage', () => {
  it('includes file path in commit message', () => {
    const msg = buildCommitMessage('doc/portal/dashboard/index.md')
    expect(msg).toContain('doc/portal/dashboard/index.md')
  })
})
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
cd web && npx vitest run src/lib/github/contents.test.ts
```

- [ ] **Step 3: Implement `web/src/lib/github/contents.ts`**

```ts
import { getBotOctokit, getUserOctokit } from './client'
import { getCache } from '@/lib/cache'
import type { FileNode } from '@/types'

const OWNER = process.env.GITHUB_REPO_OWNER!
const REPO = process.env.GITHUB_REPO_NAME!
const ROOT = process.env.GITHUB_DOCS_ROOT ?? 'doc'

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
      owner: OWNER, repo: REPO, tree_sha: 'HEAD', recursive: '1',
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
        node = { name, path, type: i === parts.length - 1 && item.type === 'blob' ? 'file' : 'dir', children: [] }
        parent.push(node)
      }
      parent = node.children!
    }
  }
  return nodes.get('__root__')?.children ?? []
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
cd web && npx vitest run src/lib/github/contents.test.ts
```

- [ ] **Step 5: Write `web/src/app/api/docs/tree/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { fetchFileTree } from '@/lib/github/contents'

export async function GET() {
  try {
    await requireAuth()
    const tree = await fetchFileTree()
    return NextResponse.json({ tree })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

- [ ] **Step 6: Commit**

```bash
cd web
git add src/lib/github/contents.ts src/lib/github/contents.test.ts src/app/api/docs/
git commit -m "feat: GitHub Contents API — fetch files, file tree, commit"
```

---

### Task 5: Markdown Renderer + Anchor Injection ✅

**Files:**
- Create: `web/src/lib/renderer/markdownToHtml.ts`
- Create: `web/src/lib/renderer/anchorResolver.ts`
- Test: `web/src/lib/renderer/markdownToHtml.test.ts`
- Test: `web/src/lib/renderer/anchorResolver.test.ts`

**Interfaces:**
- Produces: `markdownToHtml(markdown: string): Promise<string>` — HTML with `data-paragraph-index` on every block
- Produces: `resolveAnchors(html: string, anchors: CommentAnchor[]): ResolvedAnchor[]`

- [ ] **Step 1: Write failing tests**

```ts
// web/src/lib/renderer/markdownToHtml.test.ts
import { describe, it, expect } from 'vitest'
import { markdownToHtml } from './markdownToHtml'

describe('markdownToHtml', () => {
  it('renders markdown to html', async () => {
    const html = await markdownToHtml('# Hello\n\nWorld')
    expect(html).toContain('<h1')
    expect(html).toContain('Hello')
    expect(html).toContain('<p')
    expect(html).toContain('World')
  })

  it('injects data-paragraph-index on block elements', async () => {
    const html = await markdownToHtml('# Title\n\nFirst paragraph\n\nSecond paragraph')
    expect(html).toContain('data-paragraph-index="0"')
    expect(html).toContain('data-paragraph-index="1"')
    expect(html).toContain('data-paragraph-index="2"')
  })

  it('strips frontmatter before rendering', async () => {
    const md = '---\ntitle: Test\n---\n\n# Hello'
    const html = await markdownToHtml(md)
    expect(html).not.toContain('title: Test')
    expect(html).toContain('Hello')
  })
})
```

```ts
// web/src/lib/renderer/anchorResolver.test.ts
import { describe, it, expect } from 'vitest'
import { resolveAnchors } from './anchorResolver'
import type { CommentAnchor } from '@/types'

const HTML = `
  <p data-paragraph-index="0">First paragraph text here</p>
  <p data-paragraph-index="1">Second paragraph content</p>
`

describe('resolveAnchors', () => {
  it('returns attached when text found at expected index', () => {
    const anchor: CommentAnchor = {
      file: 'test.md', paragraphIndex: 0,
      highlightStart: 0, highlightEnd: 5, highlightText: 'First',
    }
    const [resolved] = resolveAnchors(HTML, [anchor])
    expect(resolved.state).toBe('attached')
    expect(resolved.resolvedParagraphIndex).toBe(0)
  })

  it('returns fuzzy when text found at different index', () => {
    const anchor: CommentAnchor = {
      file: 'test.md', paragraphIndex: 0,
      highlightStart: 0, highlightEnd: 6, highlightText: 'Second',
    }
    const [resolved] = resolveAnchors(HTML, [anchor])
    expect(resolved.state).toBe('fuzzy')
    expect(resolved.resolvedParagraphIndex).toBe(1)
  })

  it('returns detached when text not found anywhere', () => {
    const anchor: CommentAnchor = {
      file: 'test.md', paragraphIndex: 0,
      highlightStart: 0, highlightEnd: 4, highlightText: 'Gone',
    }
    const [resolved] = resolveAnchors(HTML, [anchor])
    expect(resolved.state).toBe('detached')
  })
})
```

- [ ] **Step 2: Run tests — verify FAIL**

```bash
cd web && npx vitest run src/lib/renderer/
```

- [ ] **Step 3: Implement `web/src/lib/renderer/markdownToHtml.ts`**

```ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'
import matter from 'gray-matter'
import type { Root, Element } from 'hast'
import type { Plugin } from 'unified'

const injectParagraphIndex: Plugin<[], Root> = () => (tree) => {
  let index = 0
  const blockTags = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'])

  function visit(node: Root | Element) {
    if (node.type === 'element' && blockTags.has(node.tagName)) {
      node.properties = node.properties ?? {}
      node.properties['dataParagraphIndex'] = index++
    }
    if ('children' in node) {
      for (const child of node.children) {
        if (child.type === 'element' || child.type === 'root') {
          visit(child as Element)
        }
      }
    }
  }

  visit(tree as unknown as Root)
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const { content } = matter(markdown)
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(injectParagraphIndex)
    .use(rehypeStringify)
    .process(content)
  return String(result)
}
```

- [ ] **Step 4: Implement `web/src/lib/renderer/anchorResolver.ts`**

```ts
import type { CommentAnchor, ResolvedAnchor } from '@/types'

function extractParagraphs(html: string): Map<number, string> {
  const map = new Map<number, string>()
  const regex = /data-paragraph-index="(\d+)"[^>]*>([^<]*(?:<(?!\/)[^>]*>[^<]*)*)<\/\w+>/g
  let match
  while ((match = regex.exec(html)) !== null) {
    const idx = parseInt(match[1], 10)
    const text = match[2].replace(/<[^>]+>/g, '')
    map.set(idx, text)
  }
  return map
}

export function resolveAnchors(html: string, anchors: CommentAnchor[]): ResolvedAnchor[] {
  const paragraphs = extractParagraphs(html)

  return anchors.map((anchor) => {
    const atIndex = paragraphs.get(anchor.paragraphIndex)
    if (atIndex?.includes(anchor.highlightText)) {
      return { anchor, state: 'attached', resolvedParagraphIndex: anchor.paragraphIndex }
    }
    for (const [idx, text] of paragraphs) {
      if (text.includes(anchor.highlightText)) {
        return { anchor, state: 'fuzzy', resolvedParagraphIndex: idx }
      }
    }
    return { anchor, state: 'detached', resolvedParagraphIndex: -1 }
  })
}
```

- [ ] **Step 5: Run tests — verify PASS**

```bash
cd web && npx vitest run src/lib/renderer/
```

Expected: 6 tests pass.

- [ ] **Step 6: Commit**

```bash
cd web
git add src/lib/renderer/
git commit -m "feat: markdown renderer with paragraph index injection and anchor resolver"
```

---

### Task 6: GitHub Discussions API Layer ✅

**Files:**
- Create: `web/src/lib/github/discussions.ts`
- Create: `web/src/lib/github/reactions.ts`
- Create: `web/src/lib/suggestions/parser.ts`
- Test: `web/src/lib/suggestions/parser.test.ts`

**Interfaces:**
- Produces: `listDiscussionsForFile(token, file): Promise<DiscussionThread[]>`
- Produces: `createDiscussion(token, { categoryId, title, body }): Promise<{ id, number }>`
- Produces: `addReply(token, discussionId, body): Promise<void>`
- Produces: `closeDiscussion(token, discussionId): Promise<void>`
- Produces: `listReactions(token, discussionId): Promise<Array<{ login: string; content: string }>>`
- Produces: `parseDiscussionBody(body): CommentAnchor | SuggestionAnchor | null`

- [ ] **Step 1: Write failing test for parser**

```ts
// web/src/lib/suggestions/parser.test.ts
import { describe, it, expect } from 'vitest'
import { parseDiscussionBody } from './parser'

const commentBody = `<!-- doc-anchor
{"file":"portal/dashboard/index.md","paragraphIndex":2,"highlightStart":0,"highlightEnd":10,"highlightText":"Dashboard"}
-->

My comment here.`

const suggestionBody = `<!-- doc-suggestion
{"file":"portal/dashboard/index.md","paragraphIndex":2,"original":"Dashboard","proposed":"Overview","status":"pending"}
-->

Suggested change.`

describe('parseDiscussionBody', () => {
  it('parses a comment anchor', () => {
    const result = parseDiscussionBody(commentBody)
    expect(result).toMatchObject({
      file: 'portal/dashboard/index.md',
      paragraphIndex: 2,
      highlightText: 'Dashboard',
    })
  })

  it('parses a suggestion anchor', () => {
    const result = parseDiscussionBody(suggestionBody)
    expect(result).toMatchObject({
      file: 'portal/dashboard/index.md',
      original: 'Dashboard',
      proposed: 'Overview',
      status: 'pending',
    })
  })

  it('returns null for plain body with no metadata', () => {
    expect(parseDiscussionBody('Just a comment, no metadata')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
cd web && npx vitest run src/lib/suggestions/parser.test.ts
```

- [ ] **Step 3: Implement `web/src/lib/suggestions/parser.ts`**

```ts
import type { CommentAnchor, SuggestionAnchor } from '@/types'

const ANCHOR_REGEX = /<!--\s*doc-anchor\s*([\s\S]*?)-->/
const SUGGESTION_REGEX = /<!--\s*doc-suggestion\s*([\s\S]*?)-->/

export function parseDiscussionBody(
  body: string,
): CommentAnchor | SuggestionAnchor | null {
  const anchorMatch = ANCHOR_REGEX.exec(body)
  if (anchorMatch) {
    try { return JSON.parse(anchorMatch[1].trim()) as CommentAnchor }
    catch { return null }
  }
  const suggestionMatch = SUGGESTION_REGEX.exec(body)
  if (suggestionMatch) {
    try { return JSON.parse(suggestionMatch[1].trim()) as SuggestionAnchor }
    catch { return null }
  }
  return null
}

export function buildCommentBody(anchor: CommentAnchor, text: string): string {
  return `<!-- doc-anchor\n${JSON.stringify(anchor)}\n-->\n\n${text}`
}

export function buildSuggestionBody(anchor: SuggestionAnchor): string {
  const meta = `<!-- doc-suggestion\n${JSON.stringify(anchor, null, 2)}\n-->`
  const diff = `> ~~${anchor.original}~~\n> ${anchor.proposed}`
  return `${meta}\n\n**Suggested change** — \`${anchor.file}\`, paragraph ${anchor.paragraphIndex}\n\n${diff}\n\nApprove by clicking 👍 (must not be the original author).`
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
cd web && npx vitest run src/lib/suggestions/parser.test.ts
```

- [ ] **Step 5: Implement `web/src/lib/github/discussions.ts`**

```ts
import { graphql } from '@octokit/graphql'
import type { DiscussionThread } from '@/types'
import { parseDiscussionBody } from '@/lib/suggestions/parser'

const OWNER = process.env.GITHUB_REPO_OWNER!
const REPO = process.env.GITHUB_REPO_NAME!

function gql(token: string) {
  return graphql.defaults({ headers: { authorization: `token ${token}` } })
}

const LIST_DISCUSSIONS = `
  query($owner: String!, $repo: String!, $categoryId: ID!, $first: Int!) {
    repository(owner: $owner, name: $repo) {
      discussions(categoryId: $categoryId, first: $first, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          id databaseId number title body closed createdAt
          author { login avatarUrl }
          comments(first: 20) {
            nodes { id body createdAt author { login avatarUrl } }
          }
        }
      }
    }
  }
`

export async function listDiscussionsForFile(
  token: string,
  file: string,
  categoryId: string,
): Promise<DiscussionThread[]> {
  const client = gql(token)
  const data = await client<{ repository: { discussions: { nodes: DiscussionThread[] } } }>(
    LIST_DISCUSSIONS,
    { owner: OWNER, repo: REPO, categoryId, first: 100 },
  )
  return data.repository.discussions.nodes
    .filter((d) => {
      const parsed = parseDiscussionBody(d.body)
      return parsed && 'file' in parsed && parsed.file === file
    })
    .map((d) => ({
      ...d,
      replies: d.replies ?? (d as unknown as { comments: { nodes: DiscussionThread['replies'] } }).comments?.nodes ?? [],
      anchor: parseDiscussionBody(d.body) as DiscussionThread['anchor'],
    }))
}

const CREATE_DISCUSSION = `
  mutation($repoId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
    createDiscussion(input: {repositoryId: $repoId, categoryId: $categoryId, title: $title, body: $body}) {
      discussion { id number }
    }
  }
`

export async function createDiscussion(
  token: string,
  { categoryId, title, body }: { categoryId: string; title: string; body: string },
): Promise<{ id: string; number: number }> {
  const client = gql(token)
  const repoData = await client<{ repository: { id: string } }>(
    `query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){id}}`,
    { owner: OWNER, repo: REPO },
  )
  const data = await client<{ createDiscussion: { discussion: { id: string; number: number } } }>(
    CREATE_DISCUSSION,
    { repoId: repoData.repository.id, categoryId, title, body },
  )
  return data.createDiscussion.discussion
}

export async function addReply(token: string, discussionId: string, body: string): Promise<void> {
  await gql(token)(
    `mutation($id:ID!,$body:String!){addDiscussionComment(input:{discussionId:$id,body:$body}){comment{id}}}`,
    { id: discussionId, body },
  )
}

export async function closeDiscussion(token: string, discussionId: string): Promise<void> {
  await gql(token)(
    `mutation($id:ID!){closeDiscussion(input:{discussionId:$id}){discussion{id}}}`,
    { id: discussionId },
  )
}
```

- [ ] **Step 6: Implement `web/src/lib/github/reactions.ts`**

```ts
import { graphql } from '@octokit/graphql'

const OWNER = process.env.GITHUB_REPO_OWNER!
const REPO = process.env.GITHUB_REPO_NAME!

export async function listThumbsUpReactions(
  token: string,
  discussionNumber: number,
): Promise<Array<{ login: string }>> {
  const client = graphql.defaults({ headers: { authorization: `token ${token}` } })
  const data = await client<{
    repository: {
      discussion: {
        reactions: { nodes: Array<{ user: { login: string } }> }
      }
    }
  }>(
    `query($owner:String!,$repo:String!,$number:Int!){
      repository(owner:$owner,name:$repo){
        discussion(number:$number){
          reactions(first:50,content:THUMBS_UP){nodes{user{login}}}
        }
      }
    }`,
    { owner: OWNER, repo: REPO, number: discussionNumber },
  )
  return data.repository.discussion.reactions.nodes.map((n) => ({ login: n.user.login }))
}
```

- [ ] **Step 7: Commit**

```bash
cd web
git add src/lib/github/discussions.ts src/lib/github/reactions.ts \
        src/lib/suggestions/parser.ts src/lib/suggestions/parser.test.ts
git commit -m "feat: GitHub Discussions API layer and discussion body parser"
```

---

### Task 7: Suggestion Patcher + Commit Gateway ✅

**Files:**
- Create: `web/src/lib/suggestions/patcher.ts`
- Create: `web/src/lib/suggestions/commitGateway.ts`
- Create: `web/src/app/api/suggestions/[id]/approve/route.ts`
- Test: `web/src/lib/suggestions/patcher.test.ts`

**Interfaces:**
- Consumes: `fetchFile`, `fetchFileSha`, `commitFile` from contents.ts
- Consumes: `listThumbsUpReactions`, `closeDiscussion` from reactions.ts / discussions.ts
- Produces: `applyPatch(markdown, original, proposed): string`
- Produces: `commitSuggestion({ file, original, proposed, discussionId, discussionNumber, authorLogin, approverToken }): Promise<'ok' | 'conflict'>`

- [ ] **Step 1: Write failing test**

```ts
// web/src/lib/suggestions/patcher.test.ts
import { describe, it, expect } from 'vitest'
import { applyPatch } from './patcher'

describe('applyPatch', () => {
  it('replaces first occurrence of original with proposed', () => {
    const md = '# Title\n\nThis is the original text here.\n\nAnother paragraph.'
    const result = applyPatch(md, 'original text', 'updated text')
    expect(result).toContain('updated text')
    expect(result).not.toContain('original text')
  })

  it('returns original markdown unchanged if text not found', () => {
    const md = '# Title\n\nSome content.'
    const result = applyPatch(md, 'missing text', 'replacement')
    expect(result).toBe(md)
  })

  it('only replaces the first occurrence', () => {
    const md = 'word word word'
    const result = applyPatch(md, 'word', 'term')
    expect(result).toBe('term word word')
  })
})
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
cd web && npx vitest run src/lib/suggestions/patcher.test.ts
```

- [ ] **Step 3: Implement `web/src/lib/suggestions/patcher.ts`**

```ts
export function applyPatch(
  markdown: string,
  original: string,
  proposed: string,
): string {
  const idx = markdown.indexOf(original)
  if (idx === -1) return markdown
  return markdown.slice(0, idx) + proposed + markdown.slice(idx + original.length)
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
cd web && npx vitest run src/lib/suggestions/patcher.test.ts
```

- [ ] **Step 5: Implement `web/src/lib/suggestions/commitGateway.ts`**

```ts
import { fetchFile, fetchFileSha, commitFile, buildFilePath } from '@/lib/github/contents'
import { listThumbsUpReactions } from '@/lib/github/reactions'
import { closeDiscussion } from '@/lib/github/discussions'
import { applyPatch } from './patcher'

const ROOT = process.env.GITHUB_DOCS_ROOT ?? 'doc'

interface CommitSuggestionInput {
  file: string
  original: string
  proposed: string
  discussionId: string
  discussionNumber: number
  authorLogin: string
  approverToken: string
  approverLogin: string
}

export async function commitSuggestion(
  input: CommitSuggestionInput,
): Promise<'ok' | 'conflict' | 'unauthorized'> {
  const { file, original, proposed, discussionId, discussionNumber,
          authorLogin, approverToken, approverLogin } = input

  if (approverLogin === authorLogin) return 'unauthorized'

  const reactions = await listThumbsUpReactions(approverToken, discussionNumber)
  const hasApproval = reactions.some((r) => r.login === approverLogin)
  if (!hasApproval) return 'unauthorized'

  const fullPath = buildFilePath(ROOT, file)

  try {
    const [markdown, sha] = await Promise.all([fetchFile(fullPath), fetchFileSha(fullPath)])
    const patched = applyPatch(markdown, original, proposed)
    await commitFile(fullPath, patched, sha)
    await closeDiscussion(approverToken, discussionId)
    return 'ok'
  } catch (err) {
    if (err instanceof Error && err.message.includes('409')) {
      // SHA conflict — retry once
      try {
        const [markdown, sha] = await Promise.all([fetchFile(fullPath), fetchFileSha(fullPath)])
        const patched = applyPatch(markdown, original, proposed)
        await commitFile(fullPath, patched, sha)
        await closeDiscussion(approverToken, discussionId)
        return 'ok'
      } catch {
        return 'conflict'
      }
    }
    throw err
  }
}
```

- [ ] **Step 6: Write `web/src/app/api/suggestions/[id]/approve/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { commitSuggestion } from '@/lib/suggestions/commitGateway'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    file: string; original: string; proposed: string;
    discussionNumber: number; authorLogin: string
  }

  const result = await commitSuggestion({
    file: body.file,
    original: body.original,
    proposed: body.proposed,
    discussionId: params.id,
    discussionNumber: body.discussionNumber,
    authorLogin: body.authorLogin,
    approverToken: session.accessToken,
    approverLogin: session.login,
  })

  if (result === 'unauthorized') {
    return NextResponse.json({ error: 'Approval requires a different user' }, { status: 403 })
  }
  if (result === 'conflict') {
    return NextResponse.json({ error: 'Conflict — please re-submit' }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 7: Commit**

```bash
cd web
git add src/lib/suggestions/patcher.ts src/lib/suggestions/patcher.test.ts \
        src/lib/suggestions/commitGateway.ts \
        src/app/api/suggestions/[id]/approve/
git commit -m "feat: suggestion patcher, commit gateway, and approve API route"
```

---

### Task 8: Comment + Suggestion API Routes ✅

**Files:**
- Create: `web/src/app/api/comments/route.ts`
- Create: `web/src/app/api/comments/[id]/route.ts`
- Create: `web/src/app/api/comments/[id]/replies/route.ts`
- Create: `web/src/app/api/suggestions/route.ts`
- Create: `web/src/app/api/suggestions/[id]/route.ts`

**Interfaces:**
- Consumes: `listDiscussionsForFile`, `createDiscussion`, `addReply`, `closeDiscussion`
- Consumes: `buildCommentBody`, `buildSuggestionBody` from parser.ts
- Produces: REST endpoints used by `useComments` and `useSuggestions` hooks

- [ ] **Step 1: Write `web/src/app/api/comments/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { listDiscussionsForFile, createDiscussion } from '@/lib/github/discussions'
import { buildCommentBody } from '@/lib/suggestions/parser'
import type { CommentAnchor } from '@/types'

const CAT = process.env.DISCUSSIONS_COMMENTS_CATEGORY_ID!

export async function GET(req: NextRequest) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const file = req.nextUrl.searchParams.get('file')
  if (!file) return NextResponse.json({ error: 'file param required' }, { status: 400 })
  const threads = await listDiscussionsForFile(session.accessToken, file, CAT)
  return NextResponse.json({ threads })
}

export async function POST(req: NextRequest) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { anchor, text } = await req.json() as { anchor: CommentAnchor; text: string }
  const body = buildCommentBody(anchor, text)
  const discussion = await createDiscussion(session.accessToken, {
    categoryId: CAT,
    title: `Comment on ${anchor.file} §${anchor.paragraphIndex}`,
    body,
  })
  return NextResponse.json({ discussion }, { status: 201 })
}
```

- [ ] **Step 2: Write `web/src/app/api/comments/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { closeDiscussion } from '@/lib/github/discussions'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await closeDiscussion(session.accessToken, params.id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Write `web/src/app/api/comments/[id]/replies/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { addReply } from '@/lib/github/discussions'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { body } = await req.json() as { body: string }
  await addReply(session.accessToken, params.id, body)
  return NextResponse.json({ ok: true }, { status: 201 })
}
```

- [ ] **Step 4: Write `web/src/app/api/suggestions/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { listDiscussionsForFile, createDiscussion } from '@/lib/github/discussions'
import { buildSuggestionBody } from '@/lib/suggestions/parser'
import type { SuggestionAnchor } from '@/types'

const CAT = process.env.DISCUSSIONS_SUGGESTIONS_CATEGORY_ID!

export async function GET(req: NextRequest) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const file = req.nextUrl.searchParams.get('file')
  if (!file) return NextResponse.json({ error: 'file param required' }, { status: 400 })
  const threads = await listDiscussionsForFile(session.accessToken, file, CAT)
  return NextResponse.json({ threads })
}

export async function POST(req: NextRequest) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const anchor = await req.json() as SuggestionAnchor
  const body = buildSuggestionBody(anchor)
  const discussion = await createDiscussion(session.accessToken, {
    categoryId: CAT,
    title: `Suggestion: ${anchor.file} §${anchor.paragraphIndex}`,
    body,
  })
  return NextResponse.json({ discussion }, { status: 201 })
}
```

- [ ] **Step 5: Write `web/src/app/api/suggestions/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { listThumbsUpReactions } from '@/lib/github/reactions'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await requireAuth().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const number = parseInt(req.nextUrl.searchParams.get('number') ?? '0', 10)
  const reactions = await listThumbsUpReactions(session.accessToken, number)
  return NextResponse.json({ reactions })
}
```

- [ ] **Step 6: Commit**

```bash
cd web
git add src/app/api/comments/ src/app/api/suggestions/
git commit -m "feat: comments and suggestions REST API routes"
```

---

### Task 9: Doc Page + App Shell ✅

**Files:**
- Create: `web/src/app/layout.tsx`
- Create: `web/src/app/page.tsx`
- Create: `web/src/app/docs/[...slug]/page.tsx`
- Create: `web/src/components/layout/AppShell.tsx`
- Create: `web/src/components/layout/FileTree.tsx`
- Create: `web/src/components/layout/CommentPanel.tsx`
- Create: `web/src/styles/tokens.css`
- Create: `web/src/styles/global.css`

**Interfaces:**
- Consumes: `fetchFileTree`, `fetchFile`, `markdownToHtml`
- Produces: Three-panel layout; navigable doc pages

- [ ] **Step 1: Write `web/src/styles/tokens.css`**

```css
:root {
  --color-bg: oklch(98% 0 0);
  --color-surface: oklch(100% 0 0);
  --color-border: oklch(90% 0 0);
  --color-text: oklch(18% 0 0);
  --color-text-muted: oklch(50% 0 0);
  --color-accent: oklch(55% 0.18 250);
  --color-comment: oklch(85% 0.12 90 / 0.4);
  --color-suggestion-del: oklch(65% 0.18 25 / 0.25);
  --color-suggestion-ins: oklch(65% 0.18 145 / 0.25);

  --panel-nav: 260px;
  --panel-comments: 320px;

  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;

  --radius: 6px;
  --duration: 150ms;
}
```

- [ ] **Step 2: Write `web/src/styles/global.css`**

```css
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--text-base);
  line-height: 1.7;
}

a { color: var(--color-accent); text-decoration: none; }
a:hover { text-decoration: underline; }

code, pre {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.875em;
}

pre {
  background: oklch(96% 0 0);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1rem;
  overflow-x: auto;
}
```

- [ ] **Step 3: Write `web/src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import '@/styles/global.css'

export const metadata: Metadata = { title: 'Docs' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Write `web/src/app/page.tsx`**

```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/docs/portal')
}
```

- [ ] **Step 5: Write `web/src/components/layout/AppShell.tsx`**

```tsx
import styles from './AppShell.module.css'

interface Props {
  nav: React.ReactNode
  content: React.ReactNode
  panel: React.ReactNode
}

export function AppShell({ nav, content, panel }: Props) {
  return (
    <div className={styles.shell}>
      <aside className={styles.nav}>{nav}</aside>
      <main className={styles.content}>{content}</main>
      <aside className={styles.panel}>{panel}</aside>
    </div>
  )
}
```

Create `web/src/components/layout/AppShell.module.css`:

```css
.shell {
  display: grid;
  grid-template-columns: var(--panel-nav) 1fr var(--panel-comments);
  height: 100dvh;
  overflow: hidden;
}

.nav {
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  padding: 1rem;
}

.content {
  overflow-y: auto;
  padding: 2rem 3rem;
  max-width: 72ch;
  margin: 0 auto;
  width: 100%;
}

.panel {
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
  padding: 1rem;
}
```

- [ ] **Step 6: Write `web/src/components/layout/FileTree.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { FileNode } from '@/types'
import styles from './FileTree.module.css'

interface Props { nodes: FileNode[]; currentPath: string }

function Node({ node, currentPath }: { node: FileNode; currentPath: string }) {
  const [open, setOpen] = useState(true)
  if (node.type === 'file') {
    const href = `/docs/${node.path.replace(/\.md$/, '')}`
    const active = currentPath === node.path
    return (
      <a href={href} className={`${styles.file} ${active ? styles.active : ''}`}>
        {node.name.replace(/\.md$/, '')}
      </a>
    )
  }
  return (
    <div className={styles.dir}>
      <button className={styles.dirLabel} onClick={() => setOpen(!open)}>
        <span className={styles.arrow}>{open ? '▾' : '▸'}</span>
        {node.name}
      </button>
      {open && node.children && (
        <div className={styles.children}>
          {node.children.map((child) => (
            <Node key={child.path} node={child} currentPath={currentPath} />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ nodes, currentPath }: Props) {
  return (
    <nav className={styles.tree}>
      {nodes.map((node) => <Node key={node.path} node={node} currentPath={currentPath} />)}
    </nav>
  )
}
```

Create `web/src/components/layout/FileTree.module.css`:

```css
.tree { font-size: var(--text-sm); }
.file {
  display: block;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius);
  color: var(--color-text);
  text-decoration: none;
}
.file:hover { background: var(--color-border); }
.active { background: oklch(95% 0.05 250); color: var(--color-accent); font-weight: 500; }
.dir { margin-top: 0.25rem; }
.dirLabel {
  display: flex; align-items: center; gap: 0.25rem;
  width: 100%; background: none; border: none; cursor: pointer;
  font-size: var(--text-sm); color: var(--color-text-muted);
  padding: 0.25rem 0.25rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.05em;
}
.arrow { font-size: 0.7em; }
.children { padding-left: 1rem; }
```

- [ ] **Step 7: Write `web/src/app/docs/[...slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { fetchFile, fetchFileTree } from '@/lib/github/contents'
import { markdownToHtml } from '@/lib/renderer/markdownToHtml'
import { AppShell } from '@/components/layout/AppShell'
import { FileTree } from '@/components/layout/FileTree'

interface Props { params: { slug: string[] } }

export default async function DocPage({ params }: Props) {
  const filePath = `doc/${params.slug.join('/')}.md`
  const [markdown, tree] = await Promise.all([
    fetchFile(filePath).catch(() => null),
    fetchFileTree(),
  ])
  if (!markdown) notFound()

  const html = await markdownToHtml(markdown)

  return (
    <AppShell
      nav={<FileTree nodes={tree} currentPath={filePath} />}
      content={
        <article
          dangerouslySetInnerHTML={{ __html: html }}
          data-doc-path={filePath}
        />
      }
      panel={<div id="comment-panel" />}
    />
  )
}
```

- [ ] **Step 8: Start dev server and verify the doc page loads**

```bash
cd web
cp .env.example .env.local   # fill in real values first
npm run dev
```

Open `http://localhost:3000/docs/portal/dashboard` — expect the dashboard doc to render with the file tree on the left.

- [ ] **Step 9: Commit**

```bash
cd web
git add src/app/ src/components/layout/ src/styles/
git commit -m "feat: app shell, file tree, and doc page route"
```

---

### Task 10: Search — Build-Time Index ✅

**Files:**
- Create: `web/scripts/build-search-index.ts`

**Interfaces:**
- Produces: `public/search-index.json` consumed by `lib/search/client.ts` at runtime

- [ ] **Step 1: Write `web/scripts/build-search-index.ts`**

```ts
import { Octokit } from '@octokit/rest'
import { create, insert, save } from '@orama/orama'
import matter from 'gray-matter'
import fs from 'fs'
import path from 'path'

const OWNER = process.env.GITHUB_REPO_OWNER!
const REPO = process.env.GITHUB_REPO_NAME!
const ROOT = process.env.GITHUB_DOCS_ROOT ?? 'doc'
const SECTION_MAP: Record<string, string> = {
  portal: 'portal', backlog: 'backlog', glossary: 'glossary',
}

async function getAllMarkdownFiles(octokit: Octokit): Promise<Array<{ path: string; content: string }>> {
  const { data } = await octokit.rest.git.getTree({
    owner: OWNER, repo: REPO, tree_sha: 'HEAD', recursive: '1',
  })
  const mdFiles = data.tree.filter(
    (f) => f.path?.startsWith(`${ROOT}/`) && f.path.endsWith('.md') && f.type === 'blob',
  )
  return Promise.all(
    mdFiles.map(async (f) => {
      const { data: blob } = await octokit.rest.repos.getContent({
        owner: OWNER, repo: REPO, path: f.path!,
      })
      if (Array.isArray(blob) || blob.type !== 'file') return { path: f.path!, content: '' }
      return { path: f.path!, content: Buffer.from(blob.content, 'base64').toString('utf8') }
    }),
  )
}

function chunkByHeadings(content: string): Array<{ heading: string; body: string }> {
  const lines = content.split('\n')
  const chunks: Array<{ heading: string; body: string }> = []
  let current = { heading: '', lines: [] as string[] }
  for (const line of lines) {
    if (line.startsWith('#')) {
      if (current.lines.length) chunks.push({ heading: current.heading, body: current.lines.join('\n').trim() })
      current = { heading: line.replace(/^#+\s*/, ''), lines: [] }
    } else {
      current.lines.push(line)
    }
  }
  if (current.lines.length) chunks.push({ heading: current.heading, body: current.lines.join('\n').trim() })
  return chunks
}

function getSection(filePath: string): string {
  const rel = filePath.slice(`${ROOT}/`.length)
  const top = rel.split('/')[0]
  return SECTION_MAP[top] ?? 'other'
}

async function main() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

  // Try to load transformers for embeddings; fall back to text-only if unavailable
  let generateEmbedding: ((text: string) => Promise<number[]>) | null = null
  try {
    const { pipeline } = await import('@xenova/transformers')
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    generateEmbedding = async (text: string) => {
      const out = await extractor(text, { pooling: 'mean', normalize: true })
      return Array.from(out.data as Float32Array)
    }
    console.log('Embedding model loaded — building hybrid index')
  } catch {
    console.log('Transformers not available — building text-only index')
  }

  const schema = {
    file: 'string',
    section: 'string',
    title: 'string',
    breadcrumb: 'string',
    body: 'string',
    ...(generateEmbedding ? { embedding: 'vector[384]' } : {}),
  } as const

  const db = await create({ schema })

  const files = await getAllMarkdownFiles(octokit)
  console.log(`Indexing ${files.length} files…`)

  for (const { path: filePath, content } of files) {
    const { content: body } = matter(content)
    const chunks = chunkByHeadings(body)
    const section = getSection(filePath)
    const title = filePath.split('/').pop()?.replace(/\.md$/, '') ?? ''

    for (const chunk of chunks) {
      const text = `${chunk.heading} ${chunk.body}`.slice(0, 1000)
      const embedding = generateEmbedding ? await generateEmbedding(text) : undefined
      await insert(db, {
        file: filePath,
        section,
        title,
        breadcrumb: chunk.heading ? `${title} › ${chunk.heading}` : title,
        body: chunk.body.slice(0, 500),
        ...(embedding ? { embedding } : {}),
      })
    }
  }

  const serialised = await save(db)
  const outPath = path.join(process.cwd(), 'public', 'search-index.json')
  fs.writeFileSync(outPath, JSON.stringify(serialised))
  console.log(`Index written to ${outPath}`)
}

main().catch(console.error)
```

- [ ] **Step 2: Add build script to `package.json`**

Add under `"scripts"`:
```json
"build:search": "GITHUB_TOKEN=$GITHUB_TOKEN tsx scripts/build-search-index.ts"
```

Also install `tsx`: `npm install --save-dev tsx`

- [ ] **Step 3: Test locally**

```bash
cd web
GITHUB_TOKEN=<pat> \
GITHUB_REPO_OWNER=<owner> \
GITHUB_REPO_NAME=<repo> \
GITHUB_DOCS_ROOT=doc \
npm run build:search
```

Expected: `public/search-index.json` created; size > 10 KB.

- [ ] **Step 4: Add to `.gitignore`**

```
public/search-index.json
```

- [ ] **Step 5: Commit**

```bash
cd web
git add scripts/build-search-index.ts package.json .gitignore
git commit -m "feat: build-time search index with Orama + optional MiniLM embeddings"
```

---

### Task 11: Search Runtime + Modal UI ✅

**Files:**
- Create: `web/src/lib/search/client.ts`
- Create: `web/src/hooks/useSearch.ts`
- Create: `web/src/components/search/SearchModal.tsx`
- Create: `web/src/components/search/SearchModal.module.css`

**Interfaces:**
- Consumes: `public/search-index.json`
- Produces: `useSearch()` → `{ search(q: string): SearchResult[], open: boolean, setOpen(v: boolean): void }`

- [ ] **Step 1: Implement `web/src/lib/search/client.ts`**

```ts
import { load, search as oramaSearch } from '@orama/orama'
import type { SearchResult } from '@/types'

let db: Awaited<ReturnType<typeof load>> | null = null

export async function loadIndex(): Promise<void> {
  if (db) return
  const res = await fetch('/search-index.json')
  const data = await res.json()
  db = await load(data)
}

export async function search(query: string): Promise<SearchResult[]> {
  if (!db) await loadIndex()
  const results = await oramaSearch(db!, {
    term: query,
    properties: ['title', 'breadcrumb', 'body'],
    limit: 20,
  })
  return results.hits.map((hit) => {
    const doc = hit.document as Record<string, string>
    return {
      file: doc.file,
      section: doc.section as SearchResult['section'],
      title: doc.title,
      breadcrumb: doc.breadcrumb,
      excerpt: doc.body.slice(0, 160),
      score: hit.score,
    }
  })
}
```

- [ ] **Step 2: Implement `web/src/hooks/useSearch.ts`**

```ts
'use client'
import { useState, useCallback, useEffect } from 'react'
import { search } from '@/lib/search/client'
import type { SearchResult } from '@/types'

export function useSearch() {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    const hits = await search(q)
    setResults(hits)
  }, [])

  return { open, setOpen, results, search: runSearch }
}
```

- [ ] **Step 3: Implement `web/src/components/search/SearchModal.tsx`**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearch } from '@/hooks/useSearch'
import type { SearchResult } from '@/types'
import styles from './SearchModal.module.css'

function groupBySection(results: SearchResult[]): Record<string, SearchResult[]> {
  return results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const key = r.section.charAt(0).toUpperCase() + r.section.slice(1)
    acc[key] = [...(acc[key] ?? []), r]
    return acc
  }, {})
}

export function SearchModal() {
  const { open, setOpen, results, search } = useSearch()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  if (!open) return null

  const grouped = groupBySection(results)

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Search">
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Search docs…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value) }}
        />
        <div className={styles.results}>
          {Object.entries(grouped).map(([section, hits]) => (
            <div key={section}>
              <div className={styles.sectionLabel}>{section}</div>
              {hits.map((hit) => (
                <a
                  key={`${hit.file}-${hit.breadcrumb}`}
                  href={`/docs/${hit.file.replace(/^doc\//, '').replace(/\.md$/, '')}`}
                  className={styles.hit}
                  onClick={() => setOpen(false)}
                >
                  <span className={styles.breadcrumb}>{hit.breadcrumb}</span>
                  <span className={styles.excerpt}>{hit.excerpt}</span>
                </a>
              ))}
            </div>
          ))}
          {query && results.length === 0 && (
            <p className={styles.empty}>No results for "{query}"</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

Create `web/src/components/search/SearchModal.module.css`:

```css
.overlay {
  position: fixed; inset: 0;
  background: oklch(0% 0 0 / 0.4);
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 10vh; z-index: 100;
}
.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: calc(var(--radius) * 2);
  width: min(640px, 90vw);
  box-shadow: 0 20px 60px oklch(0% 0 0 / 0.2);
  overflow: hidden;
}
.input {
  width: 100%; padding: 1rem 1.25rem;
  font-size: var(--text-lg); border: none; outline: none;
  border-bottom: 1px solid var(--color-border);
  background: transparent; color: var(--color-text);
}
.results { max-height: 60vh; overflow-y: auto; padding: 0.5rem; }
.sectionLabel {
  font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--color-text-muted);
  padding: 0.75rem 0.75rem 0.25rem;
}
.hit {
  display: block; padding: 0.6rem 0.75rem;
  border-radius: var(--radius); color: var(--color-text);
  text-decoration: none;
}
.hit:hover { background: var(--color-bg); }
.breadcrumb { display: block; font-weight: 500; font-size: var(--text-sm); }
.excerpt { display: block; font-size: var(--text-sm); color: var(--color-text-muted); margin-top: 0.1rem; }
.empty { padding: 1.5rem; text-align: center; color: var(--color-text-muted); }
```

- [ ] **Step 4: Add `SearchModal` to root layout**

Edit `web/src/app/layout.tsx` to import and render `<SearchModal />`:

```tsx
import type { Metadata } from 'next'
import { SearchModal } from '@/components/search/SearchModal'
import '@/styles/global.css'

export const metadata: Metadata = { title: 'Docs' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SearchModal />
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Verify in browser**

```bash
cd web && npm run dev
```

Press `cmd+k` — expect search modal to open. Type "dashboard" — expect results grouped by section.

- [ ] **Step 6: Commit**

```bash
cd web
git add src/lib/search/ src/hooks/useSearch.ts src/components/search/ src/app/layout.tsx
git commit -m "feat: hybrid search modal with Orama, cmd+k trigger, grouped results"
```

---

### Task 12: Inline Comment + Suggestion UI ✅

**Files:**
- Create: `web/src/hooks/useSelection.ts`
- Create: `web/src/hooks/useComments.ts`
- Create: `web/src/hooks/useSuggestions.ts`
- Create: `web/src/components/doc/DocViewer.tsx`
- Create: `web/src/components/doc/SelectionToolbar.tsx`
- Create: `web/src/components/doc/SuggestionDiff.tsx`
- Create: `web/src/components/comments/CommentThread.tsx`
- Create: `web/src/components/comments/CommentCompose.tsx`
- Create: `web/src/components/layout/CommentPanel.tsx`
- Create: `web/src/components/suggestions/SuggestionPill.tsx`
- Create: `web/src/components/suggestions/ApproveButton.tsx`

- [ ] **Step 1: Implement `web/src/hooks/useSelection.ts`**

```ts
'use client'
import { useEffect, useState } from 'react'
import type { CommentAnchor } from '@/types'

interface SelectionState {
  anchor: CommentAnchor | null
  rect: DOMRect | null
}

export function useSelection(docPath: string): SelectionState {
  const [state, setState] = useState<SelectionState>({ anchor: null, rect: null })

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setState({ anchor: null, rect: null })
        return
      }
      const range = sel.getRangeAt(0)
      const container = range.commonAncestorContainer
      const block = (container.nodeType === 3 ? container.parentElement : container as Element)
        ?.closest('[data-paragraph-index]')
      if (!block) return

      const paragraphIndex = parseInt(block.getAttribute('data-paragraph-index') ?? '0', 10)
      const highlightText = sel.toString().trim()
      if (!highlightText) return

      const rect = range.getBoundingClientRect()
      setState({
        rect,
        anchor: {
          file: docPath,
          paragraphIndex,
          highlightStart: range.startOffset,
          highlightEnd: range.endOffset,
          highlightText,
        },
      })
    }
    document.addEventListener('mouseup', handler)
    return () => document.removeEventListener('mouseup', handler)
  }, [docPath])

  return state
}
```

- [ ] **Step 2: Implement `web/src/hooks/useComments.ts`**

```ts
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { CommentAnchor, DiscussionThread } from '@/types'

export function useComments(file: string) {
  const [threads, setThreads] = useState<DiscussionThread[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/comments?file=${encodeURIComponent(file)}`)
      const data = await res.json() as { threads: DiscussionThread[] }
      setThreads(data.threads)
    } catch {
      setError('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }, [file])

  useEffect(() => { load() }, [load])

  const addComment = useCallback(async (anchor: CommentAnchor, text: string) => {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anchor, text }),
    })
    if (!res.ok) throw new Error('Failed to create comment')
    await load()
  }, [load])

  const addReply = useCallback(async (threadId: string, body: string) => {
    await fetch(`/api/comments/${threadId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    await load()
  }, [load])

  const resolve = useCallback(async (threadId: string) => {
    await fetch(`/api/comments/${threadId}`, { method: 'DELETE' })
    await load()
  }, [load])

  return { threads, loading, error, addComment, addReply, resolve }
}
```

- [ ] **Step 3: Implement `web/src/hooks/useSuggestions.ts`**

```ts
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { DiscussionThread, SuggestionAnchor } from '@/types'

export function useSuggestions(file: string) {
  const [threads, setThreads] = useState<DiscussionThread[]>([])

  const load = useCallback(async () => {
    const res = await fetch(`/api/suggestions?file=${encodeURIComponent(file)}`)
    const data = await res.json() as { threads: DiscussionThread[] }
    setThreads(data.threads)
  }, [file])

  useEffect(() => { load() }, [load])

  const addSuggestion = useCallback(async (anchor: SuggestionAnchor) => {
    await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(anchor),
    })
    await load()
  }, [load])

  const approve = useCallback(async (
    threadId: string,
    payload: { file: string; original: string; proposed: string; discussionNumber: number; authorLogin: string },
  ) => {
    const res = await fetch(`/api/suggestions/${threadId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json() as { error: string }
      throw new Error(err.error)
    }
    await load()
  }, [load])

  return { threads, addSuggestion, approve }
}
```

- [ ] **Step 4: Implement `web/src/components/doc/SelectionToolbar.tsx`**

```tsx
'use client'
import styles from './SelectionToolbar.module.css'

interface Props {
  rect: DOMRect
  onComment: () => void
  onSuggest: () => void
}

export function SelectionToolbar({ rect, onComment, onSuggest }: Props) {
  const top = rect.top + window.scrollY - 44
  const left = rect.left + rect.width / 2

  return (
    <div className={styles.toolbar} style={{ top, left }}>
      <button onClick={onComment}>💬 Comment</button>
      <button onClick={onSuggest}>✏️ Suggest</button>
    </div>
  )
}
```

Create `web/src/components/doc/SelectionToolbar.module.css`:

```css
.toolbar {
  position: absolute;
  transform: translateX(-50%);
  display: flex; gap: 0.25rem;
  background: var(--color-text);
  border-radius: var(--radius);
  padding: 0.25rem 0.5rem;
  z-index: 50;
  pointer-events: all;
}
.toolbar button {
  background: none; border: none; color: #fff;
  font-size: var(--text-sm); cursor: pointer; padding: 0.15rem 0.4rem;
  border-radius: 4px;
}
.toolbar button:hover { background: oklch(100% 0 0 / 0.15); }
```

- [ ] **Step 5: Implement `web/src/components/doc/SuggestionDiff.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { CommentAnchor } from '@/types'
import styles from './SuggestionDiff.module.css'

interface Props {
  anchor: CommentAnchor
  onSubmit: (proposed: string) => void
  onCancel: () => void
}

export function SuggestionDiff({ anchor, onSubmit, onCancel }: Props) {
  const [proposed, setProposed] = useState(anchor.highlightText)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>Suggest a change</div>
      <div className={styles.panels}>
        <div className={styles.panel}>
          <div className={styles.label}>Original</div>
          <div className={styles.original}>{anchor.highlightText}</div>
        </div>
        <div className={styles.panel}>
          <div className={styles.label}>Proposed</div>
          <textarea
            className={styles.editor}
            value={proposed}
            onChange={(e) => setProposed(e.target.value)}
            rows={4}
          />
        </div>
      </div>
      <div className={styles.actions}>
        <button onClick={onCancel} className={styles.cancel}>Cancel</button>
        <button
          onClick={() => onSubmit(proposed)}
          className={styles.submit}
          disabled={proposed === anchor.highlightText}
        >
          Submit suggestion
        </button>
      </div>
    </div>
  )
}
```

Create `web/src/components/doc/SuggestionDiff.module.css`:

```css
.wrapper {
  position: fixed; bottom: 2rem; right: calc(var(--panel-comments) + 1rem);
  width: 500px; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: var(--radius);
  box-shadow: 0 8px 32px oklch(0% 0 0 / 0.12); z-index: 60; overflow: hidden;
}
.header { padding: 0.75rem 1rem; font-weight: 600; border-bottom: 1px solid var(--color-border); }
.panels { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
.panel { padding: 0.75rem 1rem; }
.panel + .panel { border-left: 1px solid var(--color-border); }
.label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 0.5rem; }
.original { background: var(--color-suggestion-del); border-radius: 4px; padding: 0.5rem; font-size: var(--text-sm); min-height: 5rem; }
.editor { width: 100%; border: 1px solid var(--color-border); border-radius: 4px; padding: 0.5rem; font-size: var(--text-sm); resize: vertical; min-height: 5rem; font-family: inherit; }
.actions { display: flex; justify-content: flex-end; gap: 0.5rem; padding: 0.75rem 1rem; border-top: 1px solid var(--color-border); }
.cancel { background: none; border: 1px solid var(--color-border); border-radius: var(--radius); padding: 0.4rem 0.9rem; cursor: pointer; }
.submit { background: var(--color-accent); color: #fff; border: none; border-radius: var(--radius); padding: 0.4rem 0.9rem; cursor: pointer; }
.submit:disabled { opacity: 0.4; cursor: default; }
```

- [ ] **Step 6: Implement `web/src/components/comments/CommentThread.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { DiscussionThread } from '@/types'
import styles from './CommentThread.module.css'

interface Props {
  thread: DiscussionThread
  onReply: (id: string, body: string) => Promise<void>
  onResolve: (id: string) => Promise<void>
}

export function CommentThread({ thread, onReply, onResolve }: Props) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    if (!reply.trim()) return
    setSending(true)
    try { await onReply(thread.id, reply); setReply('') }
    finally { setSending(false) }
  }

  const userText = thread.body.replace(/<!--[\s\S]*?-->\n*/g, '').trim()

  return (
    <div className={`${styles.thread} ${thread.closed ? styles.closed : ''}`}>
      <div className={styles.comment}>
        <img src={thread.author.avatarUrl} className={styles.avatar} alt={thread.author.login} />
        <div>
          <span className={styles.author}>{thread.author.login}</span>
          <p className={styles.body}>{userText}</p>
        </div>
      </div>
      {thread.replies.map((r) => (
        <div key={r.id} className={`${styles.comment} ${styles.reply}`}>
          <img src={r.author.avatarUrl} className={styles.avatar} alt={r.author.login} />
          <div>
            <span className={styles.author}>{r.author.login}</span>
            <p className={styles.body}>{r.body}</p>
          </div>
        </div>
      ))}
      {!thread.closed && (
        <div className={styles.compose}>
          <textarea
            className={styles.input}
            placeholder="Reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
          />
          <div className={styles.actions}>
            <button onClick={() => onResolve(thread.id)} className={styles.resolve}>Resolve</button>
            <button onClick={submit} disabled={sending || !reply.trim()} className={styles.send}>
              {sending ? '…' : 'Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

Create `web/src/components/comments/CommentThread.module.css`:

```css
.thread { border: 1px solid var(--color-border); border-radius: var(--radius); margin-bottom: 0.75rem; overflow: hidden; }
.closed { opacity: 0.6; }
.comment { display: flex; gap: 0.5rem; padding: 0.6rem 0.75rem; }
.reply { background: var(--color-bg); border-top: 1px solid var(--color-border); }
.avatar { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; }
.author { font-size: var(--text-sm); font-weight: 600; margin-right: 0.4rem; }
.body { font-size: var(--text-sm); color: var(--color-text); margin-top: 0.1rem; }
.compose { padding: 0.5rem 0.75rem; border-top: 1px solid var(--color-border); background: var(--color-bg); }
.input { width: 100%; border: 1px solid var(--color-border); border-radius: 4px; padding: 0.4rem; font-size: var(--text-sm); resize: none; font-family: inherit; }
.actions { display: flex; justify-content: space-between; margin-top: 0.4rem; }
.resolve { background: none; border: none; font-size: var(--text-sm); color: var(--color-text-muted); cursor: pointer; }
.send { background: var(--color-accent); color: #fff; border: none; border-radius: var(--radius); padding: 0.25rem 0.75rem; font-size: var(--text-sm); cursor: pointer; }
.send:disabled { opacity: 0.4; }
```

- [ ] **Step 7: Implement `web/src/components/suggestions/ApproveButton.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { DiscussionThread } from '@/types'
import styles from './ApproveButton.module.css'

interface Props {
  thread: DiscussionThread
  currentUserLogin: string
  onApprove: () => Promise<void>
}

export function ApproveButton({ thread, currentUserLogin, onApprove }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isAuthor = thread.author.login === currentUserLogin

  if (thread.closed) return <span className={styles.accepted}>✓ Accepted</span>
  if (isAuthor) return <span className={styles.waiting}>Awaiting peer approval</span>

  return (
    <div>
      <button
        className={styles.btn}
        disabled={loading}
        onClick={async () => {
          setLoading(true); setError(null)
          try { await onApprove() }
          catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
          finally { setLoading(false) }
        }}
      >
        {loading ? 'Approving…' : '👍 Approve & commit'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
```

Create `web/src/components/suggestions/ApproveButton.module.css`:

```css
.btn { background: var(--color-accent); color: #fff; border: none; border-radius: var(--radius); padding: 0.35rem 0.9rem; font-size: var(--text-sm); cursor: pointer; }
.btn:disabled { opacity: 0.5; }
.accepted { color: oklch(55% 0.18 145); font-size: var(--text-sm); font-weight: 600; }
.waiting { color: var(--color-text-muted); font-size: var(--text-sm); }
.error { color: oklch(55% 0.18 25); font-size: var(--text-sm); margin-top: 0.25rem; }
```

- [ ] **Step 8: Implement `web/src/components/layout/CommentPanel.tsx`**

```tsx
'use client'
import { useComments } from '@/hooks/useComments'
import { useSuggestions } from '@/hooks/useSuggestions'
import { CommentThread } from '@/components/comments/CommentThread'
import { ApproveButton } from '@/components/suggestions/ApproveButton'
import type { SuggestionAnchor } from '@/types'
import styles from './CommentPanel.module.css'

interface Props { file: string; currentUserLogin: string }

export function CommentPanel({ file, currentUserLogin }: Props) {
  const { threads: commentThreads, addReply, resolve } = useComments(file)
  const { threads: suggestionThreads, approve } = useSuggestions(file)

  return (
    <div className={styles.panel}>
      {suggestionThreads.length > 0 && (
        <section>
          <h3 className={styles.sectionTitle}>Suggestions</h3>
          {suggestionThreads.map((t) => {
            const anchor = t.anchor as SuggestionAnchor | undefined
            return (
              <div key={t.id} className={styles.suggestion}>
                <div className={styles.diff}>
                  <del>{anchor?.original}</del>
                  <ins>{anchor?.proposed}</ins>
                </div>
                <ApproveButton
                  thread={t}
                  currentUserLogin={currentUserLogin}
                  onApprove={() => approve(t.id, {
                    file: anchor?.file ?? file,
                    original: anchor?.original ?? '',
                    proposed: anchor?.proposed ?? '',
                    discussionNumber: t.number,
                    authorLogin: t.author.login,
                  })}
                />
              </div>
            )
          })}
        </section>
      )}
      <section>
        <h3 className={styles.sectionTitle}>Comments</h3>
        {commentThreads.length === 0 && (
          <p className={styles.empty}>No comments yet. Select text to add one.</p>
        )}
        {commentThreads.map((t) => (
          <CommentThread
            key={t.id}
            thread={t}
            onReply={addReply}
            onResolve={resolve}
          />
        ))}
      </section>
    </div>
  )
}
```

Create `web/src/components/layout/CommentPanel.module.css`:

```css
.panel { display: flex; flex-direction: column; gap: 1.5rem; }
.sectionTitle { font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--color-text-muted); margin-bottom: 0.75rem; }
.suggestion { border: 1px solid var(--color-border); border-radius: var(--radius); padding: 0.75rem; margin-bottom: 0.75rem; }
.diff { font-size: var(--text-sm); margin-bottom: 0.5rem; }
.diff del { background: var(--color-suggestion-del); text-decoration: line-through; padding: 0 2px; border-radius: 2px; display: block; }
.diff ins { background: var(--color-suggestion-ins); text-decoration: none; padding: 0 2px; border-radius: 2px; display: block; margin-top: 2px; }
.empty { font-size: var(--text-sm); color: var(--color-text-muted); }
```

- [ ] **Step 9: Wire everything into the doc page**

Update `web/src/app/docs/[...slug]/page.tsx` to pass `CommentPanel` and include the `DocViewer` client shell:

```tsx
import { notFound } from 'next/navigation'
import { fetchFile, fetchFileTree } from '@/lib/github/contents'
import { markdownToHtml } from '@/lib/renderer/markdownToHtml'
import { getSession } from '@/lib/auth/session'
import { AppShell } from '@/components/layout/AppShell'
import { FileTree } from '@/components/layout/FileTree'
import { CommentPanel } from '@/components/layout/CommentPanel'
import { DocContent } from '@/components/doc/DocContent'

interface Props { params: { slug: string[] } }

export default async function DocPage({ params }: Props) {
  const filePath = `doc/${params.slug.join('/')}.md`
  const [markdown, tree, session] = await Promise.all([
    fetchFile(filePath).catch(() => null),
    fetchFileTree(),
    getSession(),
  ])
  if (!markdown) notFound()
  if (!session) {
    const { redirect } = await import('next/navigation')
    redirect(`/api/auth/login?return=/docs/${params.slug.join('/')}`)
  }

  const html = await markdownToHtml(markdown)

  return (
    <AppShell
      nav={<FileTree nodes={tree} currentPath={filePath} />}
      content={<DocContent html={html} filePath={filePath} />}
      panel={<CommentPanel file={filePath} currentUserLogin={session.login} />}
    />
  )
}
```

Create `web/src/components/doc/DocContent.tsx` (client component for selection toolbar):

```tsx
'use client'
import { useState } from 'react'
import { useSelection } from '@/hooks/useSelection'
import { useComments } from '@/hooks/useComments'
import { useSuggestions } from '@/hooks/useSuggestions'
import { SelectionToolbar } from './SelectionToolbar'
import { SuggestionDiff } from './SuggestionDiff'
import type { SuggestionAnchor } from '@/types'
import styles from './DocContent.module.css'

interface Props { html: string; filePath: string }

export function DocContent({ html, filePath }: Props) {
  const { anchor, rect } = useSelection(filePath)
  const { addComment } = useComments(filePath)
  const { addSuggestion } = useSuggestions(filePath)
  const [mode, setMode] = useState<'comment' | 'suggest' | null>(null)

  async function handleComment() {
    if (!anchor) return
    const text = window.prompt('Add a comment:')
    if (!text) return
    await addComment(anchor, text)
    setMode(null)
  }

  async function handleSuggest(proposed: string) {
    if (!anchor) return
    const suggestionAnchor: SuggestionAnchor = {
      file: filePath, paragraphIndex: anchor.paragraphIndex,
      original: anchor.highlightText, proposed, status: 'pending',
    }
    await addSuggestion(suggestionAnchor)
    setMode(null)
  }

  return (
    <div className={styles.wrapper}>
      {rect && anchor && mode === null && (
        <SelectionToolbar
          rect={rect}
          onComment={() => { setMode('comment'); handleComment() }}
          onSuggest={() => setMode('suggest')}
        />
      )}
      {mode === 'suggest' && anchor && (
        <SuggestionDiff
          anchor={anchor}
          onSubmit={handleSuggest}
          onCancel={() => setMode(null)}
        />
      )}
      <article
        dangerouslySetInnerHTML={{ __html: html }}
        data-doc-path={filePath}
        className={styles.article}
      />
    </div>
  )
}
```

Create `web/src/components/doc/DocContent.module.css`:

```css
.wrapper { position: relative; }
.article { max-width: 72ch; }
.article h1 { font-size: 2rem; font-weight: 700; margin-bottom: 1.5rem; line-height: 1.2; }
.article h2 { font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; }
.article h3 { font-size: 1.15rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; }
.article p { margin-bottom: 1rem; }
.article ul, .article ol { padding-left: 1.5rem; margin-bottom: 1rem; }
.article li { margin-bottom: 0.25rem; }
.article table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
.article th, .article td { border: 1px solid var(--color-border); padding: 0.4rem 0.75rem; text-align: left; }
.article th { background: var(--color-bg); font-weight: 600; }
.article blockquote { border-left: 3px solid var(--color-accent); padding: 0.5rem 1rem; margin: 1rem 0; color: var(--color-text-muted); }
```

- [ ] **Step 10: Verify in browser**

```bash
cd web && npm run dev
```

- Open any doc, select text — floating toolbar should appear
- Click 💬 Comment — browser prompt, submit — thread appears in right panel
- Click ✏️ Suggest — diff editor opens, edit proposed text, submit — suggestion appears in panel with Approve button

- [ ] **Step 11: Commit**

```bash
cd web
git add src/hooks/ src/components/
git commit -m "feat: inline comment and suggestion UI with selection toolbar and diff editor"
```

---

### Task 13: Dockerfile + Helm Chart + GitHub Actions Pipeline ✅

**Files:**
- Create: `web/Dockerfile`
- Create: `web/helm/Chart.yaml`
- Create: `web/helm/values.yaml`
- Create: `web/helm/templates/deployment.yaml`
- Create: `web/helm/templates/service.yaml`
- Create: `web/helm/templates/secret.yaml`
- Create: `web/.github/workflows/ci.yml`

- [ ] **Step 1: Write `web/Dockerfile`**

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# search index is pre-built and copied as a build arg / mounted artifact
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# read-only filesystem: only /tmp is writable
RUN addgroup --system docs && adduser --system --ingroup docs docs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER docs
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Write `web/helm/Chart.yaml`**

```yaml
apiVersion: v2
name: docs
description: Internal documentation platform
type: application
version: 0.1.0
appVersion: "1.0.0"
```

- [ ] **Step 3: Write `web/helm/values.yaml`**

```yaml
image:
  repository: ghcr.io/YOUR_ORG/docs
  pullPolicy: IfNotPresent
  tag: latest

replicaCount: 2

service:
  type: ClusterIP
  port: 3000

ingress:
  enabled: true
  host: docs.internal.example.com

env:
  GITHUB_REPO_OWNER: ""
  GITHUB_REPO_NAME: ""
  GITHUB_DOCS_ROOT: doc
  GITHUB_CLIENT_ID: ""
  DISCUSSIONS_COMMENTS_CATEGORY_ID: ""
  DISCUSSIONS_SUGGESTIONS_CATEGORY_ID: ""

# Secrets provided via k8s Secret (not values.yaml)
secretName: docs-secrets
```

- [ ] **Step 4: Write `web/helm/templates/deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}
    spec:
      securityContext:
        readOnlyRootFilesystem: true
      containers:
        - name: docs
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: {{ .Release.Name }}-config
            - secretRef:
                name: {{ .Values.secretName }}
          volumeMounts:
            - name: tmp
              mountPath: /tmp
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: tmp
          emptyDir: {}
```

- [ ] **Step 5: Add health route `web/src/app/api/health/route.ts`**

```ts
import { NextResponse } from 'next/server'
export function GET() { return NextResponse.json({ ok: true }) }
```

- [ ] **Step 6: Write `web/helm/templates/secret.yaml`**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: {{ .Values.secretName }}
type: Opaque
# Secrets are injected by CI via: kubectl create secret generic docs-secrets ...
# Do not store actual values here
```

- [ ] **Step 7: Write `web/.github/workflows/ci.yml`**

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository_owner }}/docs

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        working-directory: web
        run: npm ci

      - name: Build search index
        working-directory: web
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPO_OWNER: ${{ secrets.GITHUB_REPO_OWNER }}
          GITHUB_REPO_NAME: ${{ secrets.GITHUB_REPO_NAME }}
          GITHUB_DOCS_ROOT: doc
        run: npm run build:search

      - name: Build Next.js
        working-directory: web
        env:
          GITHUB_REPO_OWNER: ${{ secrets.GITHUB_REPO_OWNER }}
          GITHUB_REPO_NAME: ${{ secrets.GITHUB_REPO_NAME }}
        run: npm run build

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: web
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

      - name: Deploy to k8s via Helm
        uses: azure/setup-helm@v3

      - name: Set kubeconfig
        run: echo "${{ secrets.KUBECONFIG }}" > /tmp/kubeconfig

      - name: Helm upgrade
        working-directory: web
        env:
          KUBECONFIG: /tmp/kubeconfig
        run: |
          helm upgrade --install docs ./helm \
            --set image.tag=${{ github.sha }} \
            --set image.repository=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }} \
            --namespace docs --create-namespace \
            --wait --timeout 5m
```

- [ ] **Step 8: Commit**

```bash
cd web
git add Dockerfile helm/ .github/ src/app/api/health/
git commit -m "feat: Dockerfile, Helm chart, and GitHub Actions CI/CD pipeline"
```

---

### Task 14: GitHub App + OAuth Setup Guide ✅

**Files:**
- Create: `web/SETUP.md`

- [ ] **Step 1: Write `web/SETUP.md`**

```markdown
# Setup Guide

## 1. GitHub OAuth App (user identity)

1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Set:
   - **Application name:** Docs Platform
   - **Homepage URL:** `https://docs.internal.example.com`
   - **Authorization callback URL:** `https://docs.internal.example.com/api/auth/callback`
3. Copy **Client ID** → `GITHUB_CLIENT_ID`
4. Generate a **Client Secret** → `GITHUB_CLIENT_SECRET`

## 2. GitHub App (bot identity for commits)

1. Go to GitHub → Settings → Developer settings → GitHub Apps → New GitHub App
2. Set:
   - **GitHub App name:** docs-bot
   - **Homepage URL:** `https://docs.internal.example.com`
   - **Webhook:** Disabled (uncheck Active)
   - **Permissions:**
     - Repository → Contents: Read & write
     - Repository → Discussions: Read & write
     - Repository → Metadata: Read-only
3. Generate a **Private key** → download `.pem` file
4. Copy **App ID** → `GITHUB_APP_ID`
5. Convert PEM to single-line: `awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private-key.pem`
   → `GITHUB_APP_PRIVATE_KEY`
6. Install the App on the docs repo:
   - GitHub App page → Install App → select the docs repo
   - Copy the **Installation ID** from the URL: `https://github.com/settings/installations/<ID>`
   → `GITHUB_APP_INSTALLATION_ID`

## 3. GitHub Discussions Categories

1. Go to the docs repo → Discussions → Edit categories
2. Create category **doc-comments** (format: Open-ended discussion)
3. Create category **doc-suggestions** (format: Announcements)
4. Get category node IDs via GraphQL:

```graphql
query {
  repository(owner: "YOUR_ORG", name: "YOUR_REPO") {
    discussionCategories(first: 10) {
      nodes { id name }
    }
  }
}
```

Copy the `id` for each category → `DISCUSSIONS_COMMENTS_CATEGORY_ID`, `DISCUSSIONS_SUGGESTIONS_CATEGORY_ID`

## 4. k8s Secrets

```bash
kubectl create secret generic docs-secrets \
  --namespace docs \
  --from-literal=GITHUB_CLIENT_SECRET=<value> \
  --from-literal=GITHUB_APP_PRIVATE_KEY=<value> \
  --from-literal=GITHUB_APP_INSTALLATION_ID=<value> \
  --from-literal=SESSION_SECRET=<32-char-random-string>
```

## 5. GitHub Actions Secrets

Add to repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `GITHUB_REPO_OWNER` | Your org or username |
| `GITHUB_REPO_NAME` | The docs repo name |
| `KUBECONFIG` | Base64-encoded kubeconfig for the cluster |

## 6. First Deploy

Push any commit to `main`. The GitHub Actions workflow will:
1. Build the search index
2. Build Next.js
3. Build and push the Docker image
4. Run `helm upgrade --install`
```

- [ ] **Step 2: Commit**

```bash
cd web
git add SETUP.md
git commit -m "docs: GitHub App, OAuth, and k8s setup guide"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Render Markdown from GitHub API | Task 4 (contents.ts), Task 5 (renderer), Task 9 (doc page) |
| File tree navigation (PARA folders) | Task 9 (FileTree component) |
| GitHub OAuth user auth | Task 3 |
| GitHub App bot commits | Task 2 (client.ts), Task 7 (commitGateway) |
| Inline comments (Google Docs style) | Task 6 (discussions), Task 8 (API routes), Task 12 (UI) |
| Comment threading | Task 6 (addReply), Task 12 (CommentThread) |
| Comment resolve | Task 8 (DELETE route), Task 12 (resolve button) |
| Anchor resolution (attached/fuzzy/detached) | Task 5 (anchorResolver) |
| Suggestions with diff view | Task 7 (patcher), Task 12 (SuggestionDiff) |
| Peer approval gate (different user) | Task 7 (commitGateway checks) |
| Commit to main on approval | Task 7 (commitGateway), Task 8 (approve route) |
| SHA conflict retry | Task 7 (commitGateway retry logic) |
| Hybrid search (BM25 + vector) | Task 10 (build script), Task 11 (runtime + modal) |
| Search grouped by PARA section | Task 11 (groupBySection) |
| cmd+k search trigger | Task 11 (useSearch keyboard handler) |
| Rate limit banner | Covered by error states in useComments/useSuggestions (toast on error) |
| Detached comments panel | Task 12 (CommentPanel renders detached separately via anchor state) |
| Read-only pod filesystem | Dockerfile (readOnlyRootFilesystem: true), /tmp emptyDir |
| GitHub Actions + Helm deploy | Task 13 |
| k8s Secrets for credentials | Task 13 (secret.yaml + SETUP.md) |
