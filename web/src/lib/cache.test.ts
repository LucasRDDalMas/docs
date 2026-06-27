import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getCache } from './cache'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getCache', () => {
  it('calls fetcher on first access', async () => {
    const fetcher = vi.fn().mockResolvedValue('value-1')
    const result = await getCache('key1', 5000, fetcher)
    expect(result).toBe('value-1')
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('returns cached value before TTL', async () => {
    const fetcher = vi.fn().mockResolvedValue('value-2')
    await getCache('key2', 5000, fetcher)
    vi.advanceTimersByTime(4000)
    await getCache('key2', 5000, fetcher)
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('re-fetches after TTL expires', async () => {
    const fetcher = vi.fn().mockResolvedValue('value-3')
    await getCache('key3', 5000, fetcher)
    vi.advanceTimersByTime(6000)
    await getCache('key3', 5000, fetcher)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
