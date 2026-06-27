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
