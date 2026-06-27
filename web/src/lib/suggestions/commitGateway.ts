import { fetchFile, fetchFileSha, commitFile, buildFilePath } from '@/lib/github/contents'
import { listThumbsUpReactions } from '@/lib/github/reactions'
import { closeDiscussion, getDiscussionByNumber } from '@/lib/github/discussions'
import { applyPatch } from './patcher'
import { parseDiscussionBody } from './parser'
import type { SuggestionAnchor } from '@/types'

const ROOT = process.env.GITHUB_DOCS_ROOT ?? 'doc'

function validateDocPath(file: string): boolean {
  // reject traversal, absolute paths, and null bytes
  return (
    file.length > 0 &&
    !file.includes('..') &&
    !file.startsWith('/') &&
    !file.startsWith('\\') &&
    !file.includes('\0')
  )
}

interface CommitSuggestionInput {
  discussionId: string
  discussionNumber: number
  approverToken: string
  approverLogin: string
}

export async function commitSuggestion(
  input: CommitSuggestionInput,
): Promise<'ok' | 'conflict' | 'unauthorized'> {
  const { discussionId, discussionNumber, approverToken, approverLogin } = input

  // Fetch the real discussion — don't trust client-supplied content
  const discussion = await getDiscussionByNumber(approverToken, discussionNumber)
  if (!discussion || discussion.closed) return 'unauthorized'

  const authorLogin = discussion.author.login

  // Block self-approval using server-fetched author
  if (approverLogin === authorLogin) return 'unauthorized'

  // Verify approver has reacted with thumbs-up
  const reactions = await listThumbsUpReactions(approverToken, discussionNumber)
  if (!reactions.some((r) => r.login === approverLogin)) return 'unauthorized'

  // Extract content from server-fetched discussion body
  const parsed = parseDiscussionBody(discussion.body)
  if (!parsed || !('original' in parsed)) return 'unauthorized'
  const anchor = parsed as SuggestionAnchor

  if (!validateDocPath(anchor.file)) return 'unauthorized'

  const fullPath = buildFilePath(ROOT, anchor.file)

  try {
    const [markdown, sha] = await Promise.all([fetchFile(fullPath), fetchFileSha(fullPath)])
    const patched = applyPatch(markdown, anchor.original, anchor.proposed)
    await commitFile(fullPath, patched, sha)
    await closeDiscussion(approverToken, discussionId)
    return 'ok'
  } catch (err) {
    if (err instanceof Error && err.message.includes('409')) {
      // SHA conflict — retry once with a fresh fetch
      try {
        const [markdown, sha] = await Promise.all([fetchFile(fullPath), fetchFileSha(fullPath)])
        const patched = applyPatch(markdown, anchor.original, anchor.proposed)
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
