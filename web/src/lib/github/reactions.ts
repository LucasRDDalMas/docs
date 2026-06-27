import { graphql } from '@octokit/graphql'

const OWNER = process.env.GITHUB_REPO_OWNER!
const REPO = process.env.GITHUB_REPO_NAME!

const LIST_THUMBS_UP = `
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      discussion(number: $number) {
        reactions(first: 50, content: THUMBS_UP) {
          nodes {
            user { login }
          }
        }
      }
    }
  }
`

export async function listThumbsUpReactions(
  token: string,
  discussionNumber: number,
): Promise<Array<{ login: string }>> {
  const client = graphql.defaults({
    headers: { authorization: `token ${token}` },
  })

  const data = await client<{
    repository: {
      discussion: {
        reactions: { nodes: Array<{ user: { login: string } }> }
      }
    }
  }>(LIST_THUMBS_UP, { owner: OWNER, repo: REPO, number: discussionNumber })

  return data.repository.discussion.reactions.nodes.map((n) => ({
    login: n.user.login,
  }))
}

const LIST_ALL_REACTIONS = `
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      discussion(number: $number) {
        reactions(first: 50) {
          nodes {
            content
            user { login }
          }
        }
      }
    }
  }
`

export async function listReactions(
  token: string,
  discussionNumber: number,
): Promise<Array<{ login: string; content: string }>> {
  const client = graphql.defaults({
    headers: { authorization: `token ${token}` },
  })

  const data = await client<{
    repository: {
      discussion: {
        reactions: { nodes: Array<{ content: string; user: { login: string } }> }
      }
    }
  }>(LIST_ALL_REACTIONS, { owner: OWNER, repo: REPO, number: discussionNumber })

  return data.repository.discussion.reactions.nodes.map((n) => ({
    login: n.user.login,
    content: n.content,
  }))
}
