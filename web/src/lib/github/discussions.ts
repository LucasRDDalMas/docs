import { graphql } from '@octokit/graphql'
import type { DiscussionThread, DiscussionReply } from '@/types'
import { parseDiscussionBody } from '@/lib/suggestions/parser'

const OWNER = process.env.GITHUB_REPO_OWNER!
const REPO = process.env.GITHUB_REPO_NAME!

interface RawAuthor {
  login: string
  avatarUrl: string
}

interface RawReply {
  id: string
  body: string
  createdAt: string
  author: RawAuthor
}

interface RawDiscussion {
  id: string
  number: number
  title: string
  body: string
  closed: boolean
  createdAt: string
  author: RawAuthor
  comments: {
    nodes: RawReply[]
  }
}

function gql(token: string) {
  return graphql.defaults({ headers: { authorization: `token ${token}` } })
}

const LIST_DISCUSSIONS = `
  query($owner: String!, $repo: String!, $categoryId: ID!, $first: Int!) {
    repository(owner: $owner, name: $repo) {
      discussions(categoryId: $categoryId, first: $first, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          id
          number
          title
          body
          closed
          createdAt
          author { login avatarUrl }
          comments(first: 20) {
            nodes {
              id
              body
              createdAt
              author { login avatarUrl }
            }
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
  const data = await client<{ repository: { discussions: { nodes: RawDiscussion[] } } }>(
    LIST_DISCUSSIONS,
    { owner: OWNER, repo: REPO, categoryId, first: 100 },
  )

  return data.repository.discussions.nodes
    .filter((d) => {
      const parsed = parseDiscussionBody(d.body)
      return parsed !== null && 'file' in parsed && parsed.file === file
    })
    .map((d): DiscussionThread => {
      const anchor = parseDiscussionBody(d.body)
      const replies: DiscussionReply[] = d.comments.nodes.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        author: c.author,
      }))

      const thread: DiscussionThread = {
        id: d.id,
        number: d.number,
        title: d.title,
        body: d.body,
        closed: d.closed,
        createdAt: d.createdAt,
        author: d.author,
        replies,
      }

      if (anchor && 'highlightText' in anchor) {
        thread.anchor = anchor
      } else if (anchor && 'original' in anchor) {
        thread.suggestion = anchor
      }

      return thread
    })
}

const CREATE_DISCUSSION = `
  mutation($repoId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
    createDiscussion(input: {
      repositoryId: $repoId
      categoryId: $categoryId
      title: $title
      body: $body
    }) {
      discussion {
        id
        number
      }
    }
  }
`

const GET_REPO_ID = `
  query($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      id
    }
  }
`

export async function createDiscussion(
  token: string,
  { categoryId, title, body }: { categoryId: string; title: string; body: string },
): Promise<{ id: string; number: number }> {
  const client = gql(token)

  const repoData = await client<{ repository: { id: string } }>(GET_REPO_ID, {
    owner: OWNER,
    repo: REPO,
  })

  const data = await client<{
    createDiscussion: { discussion: { id: string; number: number } }
  }>(CREATE_DISCUSSION, {
    repoId: repoData.repository.id,
    categoryId,
    title,
    body,
  })

  return data.createDiscussion.discussion
}

const ADD_REPLY = `
  mutation($id: ID!, $body: String!) {
    addDiscussionComment(input: { discussionId: $id, body: $body }) {
      comment { id }
    }
  }
`

export async function addReply(
  token: string,
  discussionId: string,
  body: string,
): Promise<void> {
  await gql(token)(ADD_REPLY, { id: discussionId, body })
}

const CLOSE_DISCUSSION = `
  mutation($id: ID!) {
    closeDiscussion(input: { discussionId: $id }) {
      discussion { id }
    }
  }
`

export async function closeDiscussion(
  token: string,
  discussionId: string,
): Promise<void> {
  await gql(token)(CLOSE_DISCUSSION, { id: discussionId })
}

export async function getDiscussionByNumber(
  token: string,
  discussionNumber: number,
): Promise<DiscussionThread | null> {
  const client = gql(token)
  try {
    const data = await client<{
      repository: {
        discussion: {
          id: string
          number: number
          title: string
          body: string
          closed: boolean
          createdAt: string
          author: { login: string; avatarUrl: string }
          comments: { nodes: Array<{ id: string; body: string; createdAt: string; author: { login: string; avatarUrl: string } }> }
        }
      }
    }>(
      `query($owner:String!,$repo:String!,$number:Int!){
        repository(owner:$owner,name:$repo){
          discussion(number:$number){
            id number title body closed createdAt
            author{login avatarUrl}
            comments(first:20){nodes{id body createdAt author{login avatarUrl}}}
          }
        }
      }`,
      { owner: OWNER, repo: REPO, number: discussionNumber },
    )
    const d = data.repository.discussion
    return {
      id: d.id,
      number: d.number,
      title: d.title,
      body: d.body,
      closed: d.closed,
      createdAt: d.createdAt,
      author: d.author,
      replies: d.comments.nodes.map(c => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        author: c.author,
      })),
    }
  } catch (err) {
    if (err instanceof Error && (err as { status?: number }).status === 404) return null
    throw err  // rethrow network errors, auth failures, etc.
  }
}
