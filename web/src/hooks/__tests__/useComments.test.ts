import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('useComments', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('fetches comments for a file', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        threads: [{ id: '1', title: 'test', replies: [], closed: false }],
      }),
    })
    const { listComments } = await import('../useComments')
    const result = await listComments('doc/test.md')
    expect(result).toHaveLength(1)
    expect(global.fetch).toHaveBeenCalledWith('/api/comments?file=doc%2Ftest.md')
  })

  it('returns empty array when threads is missing', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const { listComments } = await import('../useComments')
    const result = await listComments('doc/missing.md')
    expect(result).toEqual([])
  })

  it('encodes special characters in file path', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ threads: [] }),
    })
    const { listComments } = await import('../useComments')
    await listComments('doc/path with spaces/file.md')
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/comments?file=doc%2Fpath%20with%20spaces%2Ffile.md',
    )
  })
})
