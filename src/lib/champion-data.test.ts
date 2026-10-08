import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  toDamageType,
  ensureChampionSummary,
  getChampionName,
  ensureDamageTypes,
  getDamageType,
  getDamageTypeMap,
  resetChampionDataForTest,
} from '@/lib/champion-data'

const storeStub = new Map<string, unknown>()

beforeEach(() => {
  storeStub.clear()
  ;(globalThis as Record<string, unknown>).DataStore = {
    get: (key: string) => storeStub.get(key),
    set: (key: string, value: unknown) => { storeStub.set(key, value); return true },
    has: (key: string) => storeStub.has(key),
    remove: (key: string) => storeStub.delete(key),
  }
  resetChampionDataForTest()
})

afterEach(() => vi.restoreAllMocks())

describe('toDamageType', () => {
  it('maps LCU damage type constants', () => {
    expect(toDamageType('kDamageTypeMagic')).toBe('ap')
    expect(toDamageType('kDamageTypePhysical')).toBe('ad')
    expect(toDamageType('kDamageTypeMixed')).toBe('mixed')
    expect(toDamageType('kDamageTypeTrue')).toBeNull()
    expect(toDamageType(undefined)).toBeNull()
  })
})

describe('ensureChampionSummary', () => {
  it('loads, caches in memory and persists', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: -1, name: '无', alias: 'None' },
        { id: 84, name: '阿卡丽', alias: 'Akali' },
      ],
    } as Response)

    await ensureChampionSummary()
    expect(getChampionName(84)).toBe('阿卡丽')
    expect(getChampionName(999)).toBe('英雄 #999')
    await ensureChampionSummary()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('throws on failure so caller can decide', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 500 } as Response)
    await expect(ensureChampionSummary()).rejects.toThrow()
  })
})

describe('ensureDamageTypes + getDamageTypeMap', () => {
  it('lazily fetches missing ids and skips cached ones', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/champions/84.json')) {
        return { ok: true, json: async () => ({ tacticalInfo: { damageType: 'kDamageTypeMagic' } }) } as Response
      }
      return { ok: false, status: 404 } as Response
    })

    await ensureDamageTypes([84, 999])
    expect(getDamageType(84)).toBe('ap')
    expect(getDamageType(999)).toBeUndefined()
    expect(spy).toHaveBeenCalledTimes(2)

    await ensureDamageTypes([84])
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('builds a map for known ids only', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/champions/84.json')) {
        return { ok: true, json: async () => ({ tacticalInfo: { damageType: 'kDamageTypeMagic' } }) } as Response
      }
      return { ok: false, status: 404 } as Response
    })
    await ensureDamageTypes([84])
    const map = getDamageTypeMap([84, 999])
    expect(map.get(84)).toBe('ap')
    expect(map.has(999)).toBe(false)
  })
})
