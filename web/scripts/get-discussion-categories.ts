/**
 * Prints GitHub Discussion category node IDs needed for .env.local.
 * Run: tsx scripts/get-discussion-categories.ts
 * Requires GITHUB_TOKEN (a personal access token with repo scope) in env.
 */
import { graphql } from '@octokit/graphql'

const OWNER = process.env.GITHUB_REPO_OWNER!
const REPO = process.env.GITHUB_REPO_NAME!
const TOKEN = process.env.GITHUB_TOKEN

if (!TOKEN) {
  console.error('Set GITHUB_TOKEN=ghp_... in your environment or .env.local')
  process.exit(1)
}

const client = graphql.defaults({ headers: { authorization: `token ${TOKEN}` } })

const { repository } = await client<{
  repository: { discussionCategories: { nodes: { id: string; name: string }[] } }
}>(`
  query($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      discussionCategories(first: 20) {
        nodes { id name }
      }
    }
  }
`, { owner: OWNER, repo: REPO })

console.log(`\nDiscussion categories for ${OWNER}/${REPO}:`)
for (const cat of repository.discussionCategories.nodes) {
  console.log(`  ${cat.name.padEnd(20)} ${cat.id}`)
}
console.log('\nAdd to .env.local:')
console.log('  DISCUSSIONS_COMMENTS_CATEGORY_ID=<id of your Comments category>')
console.log('  DISCUSSIONS_SUGGESTIONS_CATEGORY_ID=<id of your Suggestions category>')
