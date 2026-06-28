import { describe, it, expect } from 'vitest'
import { buildFilePath, buildCommitMessage } from './contents'

describe('buildFilePath', () => {
  it('joins root and path without double slash', () => {
    expect(buildFilePath('docs', 'portal/dashboard/index.md'))
      .toBe('docs/portal/dashboard/index.md')
  })

  it('handles empty root', () => {
    expect(buildFilePath('', 'portal/index.md')).toBe('portal/index.md')
  })
})

describe('buildCommitMessage', () => {
  it('includes file path in commit message', () => {
    const msg = buildCommitMessage('docs/portal/dashboard/index.md')
    expect(msg).toContain('docs/portal/dashboard/index.md')
  })
})
