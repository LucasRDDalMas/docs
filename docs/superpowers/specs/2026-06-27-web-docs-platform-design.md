# Web Docs Platform — Design Spec

**Date:** 2026-06-27  
**Status:** Approved  
**Author:** Lucas  

---

## 1. Overview

Build a stateless web application that renders the Obsidian Markdown vault as a rich documentation site with:

- **Inline comments** (Google Docs-style, threaded, resolvable)
- **Inline suggestions** (GitHub PR-style diff, peer-approved before commit)
- **Hybrid search** (full-text BM25 + semantic vector, index built at deploy time)
- **GitHub Discussions** as the sole persistence layer — no database, no PVC
- **GitHub Actions + Helm** deploy pipeline triggered by accepted suggestions

The pod runs in k8s with a read-only filesystem. The application is fully stateless; all persistent state lives in GitHub.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                   GitHub                            │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │  docs repo   │    │  GitHub Discussions       │   │
│  │  (Markdown)  │◄───│  • doc-comments category  │   │
│  │  main branch │    │  • doc-suggestions cat.   │   │
│  └──────┬───────┘    └──────────────────────────┘   │
│         │ push to main                               │
│         ▼                                            │
│  GitHub Actions → helm upgrade → k8s pod            │
└──────────────────────────┬──────────────────────────┘
                           │ GraphQL API + Contents API
┌──────────────────────────┴──────────────────────────┐
│         Next.js 15 App (stateless k8s pod)          │
│                                                     │
│  Doc Renderer │ Search Engine │ Comment Engine      │
│  Suggestion Engine │ Commit Gateway                 │
│                                                     │
│  GitHub API Client (Octokit)                        │
│  Auth: GitHub OAuth (users) + GitHub App (bot)      │
└─────────────────────────────────────────────────────┘
```

### Key invariants

- The Next.js pod has a read-only filesystem — no writes to local disk
- Markdown files are fetched from the GitHub Contents API at request time (short in-memory TTL cache)
- User identity: GitHub OAuth session cookie (iron-session, stateless)
- Bot identity: GitHub App private key (env var) for committing accepted suggestions
- All comments, threads, and suggestions are GitHub Discussions — full history preserved natively

---

## 3. Components

### 3.1 Doc Renderer

- Fetches Markdown from GitHub Contents API
- Parses frontmatter with `gray-matter`
- Renders via `unified` → `remark` → `rehype` pipeline
- Injects `data-paragraph-index` attributes on every block-level element (paragraphs, headings, list items) during render — these are the comment anchor targets
- Outputs static HTML served by Next.js App Router page

### 3.2 Search Engine

**Build time (GitHub Actions):**
1. Fetch all `.md` files from repo
2. Chunk each file by heading sections
3. Generate embeddings per chunk using `@xenova/transformers` (`all-MiniLM-L6-v2`, 23 MB model, CPU-only)
4. Build Orama hybrid index (BM25 + vector)
5. Serialise index to `public/search-index.json` — bundled into the Docker image

**Runtime (browser):**
- Orama loads index from the static file on first search
- Hybrid query: BM25 + cosine similarity merged with combined score
- Results returned in < 100 ms for typical internal vault size
- Results grouped by PARA section (Projects / Areas / Resources)
- Highlighted excerpt per hit

**UI:** `cmd+k` opens full-screen search modal; keyboard-navigable.

### 3.3 Comment Engine

Backed by GitHub Discussions (`doc-comments` category).

**Create:**
1. User selects text → floating toolbar appears → clicks 💬 Comment
2. Popover opens; user types comment and submits
3. App calls GitHub GraphQL `createDiscussion` with body:

```
<!-- doc-anchor
{"file":"path/to/doc.md","paragraphIndex":4,"highlightStart":12,"highlightEnd":47,"highlightText":"the selected text"}
-->

User's comment text.
```

4. Yellow underline rendered on the selected text; thread appears in right panel

**Anchor resolution on render (per doc load):**

| State | Condition | Display |
|---|---|---|
| `attached` | `paragraphIndex` text contains `highlightText` | Inline yellow underline |
| `fuzzy` | `highlightText` found at different index | Underline at new position + ⚠ icon |
| `detached` | `highlightText` not found anywhere in doc | "Detached Comments" section in panel |

**Thread:** Replies use native GitHub Discussions replies (GraphQL `addDiscussionComment`).  
**Resolve:** Calls `markDiscussionCommentAsAnswer` / `closeDiscussion`. Resolved threads remain visible in a collapsed "Resolved" section.

### 3.4 Suggestion Engine

Backed by GitHub Discussions (`doc-suggestions` category, Announcements format — supports a single accepted answer).

**Create:**
1. User selects text → clicks ✏️ Suggest edit
2. Diff editor opens (original left, editable right)
3. On submit, app calls `createDiscussion` with body:

```
<!-- doc-suggestion
{
  "file": "path/to/doc.md",
  "paragraphIndex": 4,
  "original": "the original selected text",
  "proposed": "the user's proposed replacement",
  "status": "pending"
}
-->

**Suggested change** — `path/to/doc.md`, paragraph 4

> ~~the original selected text~~  
> the user's proposed replacement

Approve by clicking 👍 (must not be the original author).
```

**Display in doc:** Strikethrough (red) + proposed text (green underline) rendered inline. Pill shows `✏️ Pending` or `✓ Approved`.

**Approval flow:**
1. Second user clicks 👍 reaction on the Discussion
2. The Approve button in the UI calls `/api/suggestions/approve` — the server reads reactions from GitHub GraphQL at that moment (no background polling; no webhook required)
3. Suggestion Engine checks:
   - Reactor login ≠ Discussion author login
   - Discussion is still open
   - No `conflict` state
3. All pass → calls Commit Gateway

**Conflict handling:** Commit Gateway fetches file SHA before writing. On GitHub 409 (SHA mismatch), retries once with fresh fetch. Second failure → suggestion moves to `conflict` state, user prompted to re-submit.

### 3.5 Commit Gateway

Single-responsibility Next.js API route. Never called from the browser directly.

**Inputs:** `{ file: string, proposedContent: string, suggestionDiscussionId: string }`

**Steps:**
1. Fetch current file SHA from GitHub Contents API (bot identity)
2. Apply the patch to produce new file content
3. `PUT /repos/{owner}/{repo}/contents/{path}` with base64 content + SHA
4. On success: close the suggestion Discussion and mark as answered
5. On failure: return error; suggestion stays `pending`; Discussion state unchanged

Commit author: `docs-bot[bot]` (GitHub App identity) — clear audit trail in git log.

---

## 4. GitHub Discussions Setup

Two categories to create once on the repo:

| Category name | Format | Purpose |
|---|---|---|
| `doc-comments` | Open-ended discussion | Inline comment threads |
| `doc-suggestions` | Announcements | Inline suggestions (accepted answer = committed) |

The structured metadata block (`<!-- doc-anchor ... -->`) is always the first element in the discussion body. Human-readable content follows, so discussions remain legible directly in the GitHub UI.

---

## 5. Authentication

### User sessions (GitHub OAuth App)

- GitHub OAuth flow: `/api/auth/login` → GitHub → `/api/auth/callback`
- Callback exchanges code for `access_token`; stored in encrypted HttpOnly cookie via `iron-session`
- All GitHub API calls for comments/reactions use the user's own token → correct attribution in Discussions
- On 401: silent refresh; on refresh failure: redirect to `/api/auth/login?return={path}`
- No auth database; sessions are stateless

### Bot identity (GitHub App)

- GitHub App installed on the docs repo only (minimal blast radius)
- Private key stored as k8s Secret, mounted as env var
- Used exclusively by Commit Gateway for writing to `main`

### GitHub App permissions

| Permission | Level | Reason |
|---|---|---|
| `contents` | write | Commit accepted suggestions |
| `discussions` | write | Create and resolve Discussion threads |
| `metadata` | read | Required by GitHub |

---

## 6. UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [🔍 Search — cmd+k]                        [User avatar]   │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│  File tree   │   Rendered document          │  Comment /    │
│  (PARA nav)  │                              │  Suggestion   │
│              │   · Yellow underline =       │  panel        │
│              │     comment anchor           │               │
│              │   · Red/green diff =         │  Threads      │
│              │     pending suggestion       │  stacked      │
│              │                              │  vertically,  │
│              │   Selecting text shows:      │  scroll-synced│
│              │   [ 💬 Comment ] [ ✏️ Edit ] │  to doc       │
│              │                              │               │
└──────────────┴──────────────────────────────┴───────────────┘
```

- Left panel: file tree mirroring PARA folder structure; collapsible
- Centre: rendered Markdown; read-only; selection triggers toolbar
- Right panel: active threads for the current doc; resolved threads collapsed; detached comments at bottom

---

## 7. Search UX

`cmd+k` → full-screen modal:

```
┌──────────────────────────────────────────────────┐
│  🔍 Search docs...                          [esc] │
├──────────────────────────────────────────────────┤
│  Projects                                        │
│  ▸ Docs POC › Goal           "...centralised..." │
│                                                  │
│  Resources                                       │
│  ▸ PARA Method › Key Points  "...actionability..." │
│  ▸ Obsidian Tips › Linking   "...internal links..." │
│                                                  │
│  Areas                                           │
│  ▸ Engineering › Standards   "...well-tested..."  │
└──────────────────────────────────────────────────┘
```

- Results appear as user types (debounced 150 ms)
- Grouped by PARA section
- Keyboard navigation (↑↓, Enter to open)
- Highlighted excerpt shows matched terms in context

---

## 8. Deploy Pipeline

```
git push to main
      ↓
GitHub Actions: ci.yml
  1. npm ci
  2. Build search index (generate embeddings + Orama index → public/search-index.json)
  3. next build
  4. docker build + push to registry
  5. helm upgrade --install docs ./helm --set image.tag=$SHA
      ↓
k8s rolls out new pod
      ↓
New pod serves updated docs
```

Accepted suggestions commit via the bot identity and trigger this same pipeline.

---

## 9. Error Handling

| Scenario | Behaviour |
|---|---|
| GitHub API rate limit | Banner with countdown to reset; requests queued |
| Discussion creation fails | Optimistic UI rolled back; compose box preserved with error toast |
| Commit 409 (SHA conflict) | Retry once with fresh SHA; on second failure → `conflict` state |
| Anchor not found (`detached`) | Comment shown in Detached panel with original quoted text |
| Session expired | Silent token refresh; redirect to re-auth with `?return=` if refresh fails |
| Deploy race (commit mid-rollout) | Commit completes before response returns; pod restart is subsequent |

---

## 10. Tech Stack

| Layer | Library | License |
|---|---|---|
| Framework | Next.js 15 (App Router) | MIT |
| Markdown parsing | unified + remark + rehype | MIT |
| Frontmatter | gray-matter | MIT |
| Search index | Orama | Apache 2.0 |
| Embeddings (build) | @xenova/transformers (`all-MiniLM-L6-v2`) | MIT |
| GitHub API | Octokit.js | MIT |
| Session | iron-session | MIT |
| Diff engine | diff-match-patch | Apache 2.0 |
| UI primitives | Radix UI | MIT |
| Styling | CSS Modules + CSS custom properties | — |
| Containerisation | Docker + k8s + Helm | — |
| CI/CD | GitHub Actions | — |

Zero proprietary dependencies. Fully self-hostable.

---

## 11. Out of Scope

- Real-time collaborative editing (docs are read-mostly)
- RAG / LLM-powered Q&A (hybrid search covers the use case)
- Comment notifications (GitHub Discussion notifications handle this natively)
- Role-based permissions (flat model — everyone can comment, suggest, and approve)
