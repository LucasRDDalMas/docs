import { NextRequest, NextResponse } from 'next/server'
import { setSession } from '@/lib/auth/session'
import { getUserOctokit } from '@/lib/github/client'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state') ?? ''

  // Parse state (JSON with nonce and return URL) and validate for CSRF
  let returnTo = '/docs'
  try {
    const parsed = JSON.parse(decodeURIComponent(state ?? '')) as {
      nonce?: string
      return?: string
    }
    // Only use returnTo if nonce is present (prevents trivially forged states)
    if (parsed.nonce && parsed.return?.startsWith('/')) {
      returnTo = parsed.return
    }
  } catch {
    // State was malformed or not JSON — use default return
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', req.url))
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      code,
    }),
  })
  const tokenData = (await tokenRes.json()) as {
    access_token?: string
    error?: string
  }

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
