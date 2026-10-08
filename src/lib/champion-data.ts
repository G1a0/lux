// src/lib/champion-data.ts
// 英雄元数据运行时加载：名字来自客户端 champion-summary，伤害类型懒加载自 champion 详情
// 数据都在客户端本地（/lol-game-data/assets），不走外网

import type { DamageType, ChampionMetaEntry } from '@/types/champion'
import type { InternalPosition } from '@/lib/positions'
import { mapWithConcurrency } from '@/lib/utils'

const SUMMARY_PATH = '/lol-game-data/assets/v1/champion-summary.json'
const SUMMARY_CACHE_KEY = 'lux.championSummary'
const SUMMARY_TTL_MS = 24 * 60 * 60 * 1000
const DAMAGE_TYPES_KEY = 'lux.damageTypes'
const DETAIL_CONCURRENCY = 8

let summaryCache: Map<number, ChampionMetaEntry> | null = null
let damageTypesCache: Map<number, DamageType> | null = null
let positionsCache: Map<number, InternalPosition[]> = new Map()

export function resetChampionDataForTest() {
  summaryCache = null
  damageTypesCache = null
  positionsCache = new Map()
}

function dataStoreGet<T>(key: string): T | undefined {
  try {
    return typeof DataStore === 'undefined' ? undefined : DataStore.get<T>(key)
  } catch {
    return undefined
  }
}

function dataStoreSet(key: string, value: unknown) {
  try {
    if (typeof DataStore !== 'undefined') DataStore.set(key, value)
  } catch {
    // 持久化失败不影响本次会话
  }
}

export function toDamageType(raw: unknown): DamageType | null {
  if (raw === 'kDamageTypeMagic') return 'ap'
  if (raw === 'kDamageTypePhysical') return 'ad'
  if (raw === 'kDamageTypeMixed') return 'mixed'
  return null
}

export async function ensureChampionSummary(): Promise<void> {
  if (summaryCache) return

  const cached = dataStoreGet<{ ts?: number; champions?: Record<string, ChampionMetaEntry> }>(SUMMARY_CACHE_KEY)
  if (cached && typeof cached.ts === 'number' && Date.now() - cached.ts < SUMMARY_TTL_MS && cached.champions) {
    summaryCache = new Map(Object.entries(cached.champions).map(([id, entry]) => [Number(id), entry]))
    return
  }

  const res = await fetch(SUMMARY_PATH, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`champion-summary responded ${res.status}`)
  const data = await res.json() as Array<{ id: number; name: string; alias: string }>

  const champions: Record<string, ChampionMetaEntry> = {}
  for (const champ of data) {
    if (champ.id > 0 && champ.name) champions[String(champ.id)] = { name: champ.name, alias: champ.alias ?? '' }
  }

  summaryCache = new Map(Object.entries(champions).map(([id, entry]) => [Number(id), entry]))
  dataStoreSet(SUMMARY_CACHE_KEY, { ts: Date.now(), champions })
}

export function getChampionName(id: number): string {
  return summaryCache?.get(id)?.name ?? `英雄 #${id}`
}

function loadStoredDamageTypes(): Map<number, DamageType> {
  const stored = dataStoreGet<Record<string, DamageType>>(DAMAGE_TYPES_KEY) ?? {}
  return new Map(Object.entries(stored).map(([id, type]) => [Number(id), type]))
}

export async function ensureDamageTypes(ids: number[]): Promise<void> {
  if (!damageTypesCache) damageTypesCache = loadStoredDamageTypes()

  const missing = ids.filter(id => !damageTypesCache!.has(id))
  if (missing.length === 0) return

  let added = false
  await mapWithConcurrency(missing, DETAIL_CONCURRENCY, async id => {
    try {
      const res = await fetch(`/lol-game-data/assets/v1/champions/${id}.json`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) return
      const detail = await res.json() as { tacticalInfo?: { damageType?: string } }
      const type = toDamageType(detail.tacticalInfo?.damageType)
      if (type) {
        damageTypesCache!.set(id, type)
        added = true
      }
    } catch {
      // 单个英雄失败不影响整体
    }
  })

  if (added) {
    dataStoreSet(DAMAGE_TYPES_KEY, Object.fromEntries(damageTypesCache))
  }
}

export function getDamageType(id: number): DamageType | undefined {
  return damageTypesCache?.get(id)
}

export function getDamageTypeMap(ids: number[]): Map<number, DamageType> {
  const map = new Map<number, DamageType>()
  for (const id of ids) {
    const type = damageTypesCache?.get(id)
    if (type) map.set(id, type)
  }
  return map
}

export function setChampionPositions(map: Map<number, InternalPosition[]>) {
  positionsCache = map
}

export function getChampionPositions(id: number): InternalPosition[] {
  return positionsCache.get(id) ?? []
}
