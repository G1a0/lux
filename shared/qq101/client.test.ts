import { describe, expect, it, vi } from 'vitest'
import { ApiTimeBlockedError, createQq101Client } from './client'
import tierlistFixture from './fixtures/tierlist-all.json'
import confrontFixture from './fixtures/confront-84-middle.json'
import partnerFixture from './fixtures/partner-84-middle.json'
import versionlistFixture from './fixtures/versionlist.json'

function okFetch(payload: unknown, calls: string[]) {
  return vi.fn(async (input: Parameters<typeof fetch>[0]) => {
    calls.push(String(input))
    return { ok: true, json: async () => payload } as Response
  }) as unknown as typeof fetch
}

describe('createQq101Client', () => {
  it('getPatch 解析版本并缓存（两次调用只发一次请求）', async () => {
    const calls: string[] = []
    const client = createQq101Client({ fetchImpl: okFetch(versionlistFixture, calls) })
    expect(await client.getPatch()).toBe('16.19')
    expect(await client.getPatch()).toBe('16.19')
    expect(calls).toHaveLength(1)
  })

  it('getTierList 请求参数包含 lane 与版本', async () => {
    const calls: string[] = []
    const client = createQq101Client({ fetchImpl: okFetch(tierlistFixture, calls) })
    const tier = await client.getTierList('16.19', 'ALL')
    expect(tier).not.toBeNull()
    expect(tier!.champions.length).toBeGreaterThan(100)
    expect(calls[0]).toContain('lane=ALL')
    expect(calls[0]).toContain('version_id=16.19')
  })

  it('getMatchups / getSynergies 构造 championid 参数', async () => {
    const callsA: string[] = []
    const a = createQq101Client({ fetchImpl: okFetch(confrontFixture, callsA) })
    const matchups = await a.getMatchups('16.19', 'MIDDLE', 84)
    expect(matchups!.some(m => m.championId === 711)).toBe(true)
    expect(callsA[0]).toContain('lol_101strategy_confront')
    expect(callsA[0]).toContain('championid=84')

    const callsB: string[] = []
    const b = createQq101Client({ fetchImpl: okFetch(partnerFixture, callsB) })
    const synergies = await b.getSynergies('16.19', 'MIDDLE', 84)
    expect(synergies!.some(s => s.championId === 876)).toBe(true)
    expect(callsB[0]).toContain('lol_101strategy_partner')
  })

  it('禁窗内调用抛 ApiTimeBlockedError', async () => {
    const client = createQq101Client({
      fetchImpl: okFetch(versionlistFixture, []),
      isAllowed: () => false,
      now: () => new Date(2026, 9, 5, 10, 0),
    })
    await expect(client.getTierList('16.19', 'ALL')).rejects.toBeInstanceOf(ApiTimeBlockedError)
  })

  it('请求失败返回 null', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('offline') }) as unknown as typeof fetch
    const client = createQq101Client({ fetchImpl })
    expect(await client.getTierList('16.19', 'ALL')).toBeNull()
  })

  it('minIntervalMs 控制相邻请求间隔', async () => {
    vi.useFakeTimers()
    try {
      const calls: string[] = []
      const client = createQq101Client({
        fetchImpl: okFetch(tierlistFixture, calls),
        minIntervalMs: 100,
      })
      const p1 = client.getTierList('16.19', 'ALL')
      await vi.advanceTimersByTimeAsync(0)
      expect(calls).toHaveLength(1)
      const p2 = client.getTierList('16.19', 'TOP')
      await vi.advanceTimersByTimeAsync(99)
      expect(calls).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(1)
      expect(calls).toHaveLength(2)
      await Promise.all([p1, p2])
    } finally {
      vi.useRealTimers()
    }
  })
})
