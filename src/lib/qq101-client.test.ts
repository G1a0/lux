import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getPatch,
  getTierList,
  getMatchups,
  getSynergies,
  resetPatchCacheForTest,
} from '@/lib/qq101'
import tierlistFixture from '@/test/fixtures/qq101/tierlist-all.json'
import confrontFixture from '@/test/fixtures/qq101/confront-84-middle.json'
import partnerFixture from '@/test/fixtures/qq101/partner-84-middle.json'
import versionlistFixture from '@/test/fixtures/qq101/versionlist.json'

const storeStub = new Map<string, unknown>()

beforeEach(() => {
  storeStub.clear()
  resetPatchCacheForTest()
  ;(globalThis as Record<string, unknown>).DataStore = {
    get: (key: string) => storeStub.get(key),
    set: (key: string, value: unknown) => { storeStub.set(key, value); return true },
    has: (key: string) => storeStub.has(key),
    remove: (key: string) => storeStub.delete(key),
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

function mockFetchOnce(payload: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok: true,
    json: async () => payload,
  } as Response)
}

function lastFetchUrl(): string {
  const spy = globalThis.fetch as unknown as { mock: { calls: Array<[unknown, ...unknown[]]> } }
  return String(spy.mock.calls[0][0])
}

describe('getPatch', () => {
  it('fetches and caches the latest patch', async () => {
    const spy = mockFetchOnce(versionlistFixture)
    expect(await getPatch()).toBe('16.19')
    expect(await getPatch()).toBe('16.19')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('returns null when the request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'))
    expect(await getPatch()).toBeNull()
  })
})

describe('getTierList', () => {
  it('parses a successful response', async () => {
    mockFetchOnce(tierlistFixture)
    const result = await getTierList('16.19')
    expect(result).not.toBeNull()
    expect(result!.champions.length).toBeGreaterThan(100)
    const url = lastFetchUrl()
    expect(url).toContain('lane=ALL')
    expect(url).toContain('version_id=16.19')
  })

  it('returns null on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('boom'))
    expect(await getTierList('16.19')).toBeNull()
  })
})

describe('getMatchups / getSynergies', () => {
  it('builds lane and champion params for matchups', async () => {
    mockFetchOnce(confrontFixture)
    const matchups = await getMatchups('16.19', 'MIDDLE', 84)
    expect(matchups).not.toBeNull()
    expect(matchups!.some(m => m.championId === 711)).toBe(true)
    const url = lastFetchUrl()
    expect(url).toContain('lol_101strategy_confront')
    expect(url).toContain('lane=MIDDLE')
    expect(url).toContain('championid=84')
  })

  it('builds params for synergies', async () => {
    mockFetchOnce(partnerFixture)
    const synergies = await getSynergies('16.19', 'MIDDLE', 84)
    expect(synergies).not.toBeNull()
    expect(synergies!.some(s => s.championId === 876)).toBe(true)
    const url = lastFetchUrl()
    expect(url).toContain('lol_101strategy_partner')
    expect(url).toContain('championid=84')
  })
})
