import { describe, it, expect } from 'vitest'
import { buildFilePath, buildCommitMessage } from './contents'

describe('buildFilePath', () => {
  it('joins root and path without double slash', () => {
    expect(buildFilePath('doc', 'portal/dashboard/index.md'))
      .toBe('doc/portal/dashboard/index.md')
  })

  it('handles empty root', () => {
    expect(buildFilePath('', 'portal/index.md')).toBe('portal/index.md')
  })
})

describe('buildCommitMessage', () => {
  it('includes file path in commit message', () => {
    const msg = buildCommitMessage('doc/portal/dashboard/index.md')
    expect(msg).toContain('doc/portal/dashboard/index.md')
  })
})
