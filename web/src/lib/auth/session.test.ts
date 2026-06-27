import { describe, it, expect, vi } from 'vitest'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))

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
