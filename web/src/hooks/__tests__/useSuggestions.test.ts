import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('useSuggestions', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('fetches suggestions for a file', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        threads: [{ id: '1', title: 'Suggestion: fix', replies: [], closed: false }],
      }),
    })
    const { listSuggestions } = await import('../useSuggestions')
    const result = await listSuggestions('doc/test.md')
    expect(result).toHaveLength(1)
    expect(global.fetch).toHaveBeenCalledWith('/api/suggestions?file=doc%2Ftest.md')
  })

  it('returns empty array when threads is missing', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const { listSuggestions } = await import('../useSuggestions')
    const result = await listSuggestions('doc/empty.md')
    expect(result).toEqual([])
  })

  it('encodes special characters in file path', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ threads: [] }),
    })
    const { listSuggestions } = await import('../useSuggestions')
    await listSuggestions('doc/my file.md')
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/suggestions?file=doc%2Fmy%20file.md',
    )
  })
})
