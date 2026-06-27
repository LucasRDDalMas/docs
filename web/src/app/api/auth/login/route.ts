import { NextRequest, NextResponse } from 'next/server'

export function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get('return') ?? '/docs'

  // Build state as JSON with nonce for CSRF protection
  const state = JSON.stringify({
    nonce: crypto.randomUUID(),
    return: returnTo,
  })

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    scope: 'read:user user:email',
    state: encodeURIComponent(state),
  })
  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params}`,
  )
}
