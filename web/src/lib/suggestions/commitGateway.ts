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
  const {
    file,
    original,
    proposed,
    discussionId,
    discussionNumber,
    authorLogin,
    approverToken,
    approverLogin,
  } = input

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
      // SHA conflict — retry once with a fresh fetch
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
