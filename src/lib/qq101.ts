// src/lib/qq101.ts
// 101.qq.com(腾讯官方) 数据源。响应外层: {code, data: {result: "<JSON字符串">}}
// 记录格式: '#' 分隔记录、'_' 分隔字段、百分比为 0-100 数值

import { fromQq101Position, type InternalPosition, type Qq101Lane } from '@/lib/positions'

export interface Qq101TierRecord {
  rank: number | null
  championId: number
  strengthTier: string
  position: InternalPosition | ''
  winRate: number | null
  pickRate: number | null
  banRate: number | null
  counterChampionIds: number[]
}

export interface Qq101TierList {
  date: string
  champions: Qq101TierRecord[]
}

export interface Qq101Matchup {
  championId: number
  winRate: number | null
  favorable: boolean
}

export interface Qq101Synergy {
  championId: number
  winRate: number | null
  games: number | null
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function percentToRatio(value: string | undefined): number | null {
  const n = toNumber(value)
  return n === null ? null : n / 100
}

function splitRecords(value: string | undefined): string[] {
  return (value ?? '').split('#').filter(Boolean)
}

export function extractQq101Inner(response: unknown): string | null {
  if (typeof response !== 'object' || response === null) return null
  const envelope = response as { code?: unknown; data?: unknown }
  if (envelope.code !== 0) return null

  const { data } = envelope
  if (typeof data === 'string') return data || null
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (typeof record.result === 'string' && record.result) return record.result
    const fields = record._fieldValues
    if (typeof fields === 'object' && fields !== null) {
      const first = Object.values(fields as Record<string, unknown>)[0]
      if (typeof first === 'string' && first) return first
    }
  }
  return null
}

function parseInner<T>(response: unknown): T | null {
  const inner = extractQq101Inner(response)
  if (!inner) return null
  try {
    return JSON.parse(inner) as T
  } catch {
    return null
  }
}

export function parseQq101Versions(response: unknown): string[] {
  const envelope = response as { code?: unknown; data?: unknown } | null
  if (!envelope || envelope.code !== 0 || !Array.isArray(envelope.data)) return []
  return envelope.data.flatMap(item => {
    const name = (item as { name?: unknown } | null)?.name
    return typeof name === 'string' && name ? [name] : []
  })
}

export function parseQq101TierList(response: unknown): Qq101TierList {
  const payload = parseInner<{ dtstatdate?: string; datadetails?: string }>(response)
  if (!payload) return { date: '', champions: [] }

  const champions = splitRecords(payload.datadetails).flatMap(record => {
    const fields = record.split('_')
    const championId = toNumber(fields[1])
    if (championId === null) return []
    return [{
      rank: toNumber(fields[0]),
      championId,
      strengthTier: fields[2] ?? '',
      position: fromQq101Position(fields[3] ?? ''),
      winRate: percentToRatio(fields[4]),
      pickRate: percentToRatio(fields[5]),
      banRate: percentToRatio(fields[6]),
      counterChampionIds: (fields[7] ?? '')
        .split(',')
        .map(id => toNumber(id))
        .filter((id): id is number => id !== null),
    }]
  })

  return { date: payload.dtstatdate ?? '', champions }
}

export function parseQq101Matchups(response: unknown): Qq101Matchup[] {
  const payload = parseInner<{ high_op_details?: string; low_op_details?: string }>(response)
  if (!payload) return []

  const parseList = (value: string | undefined, favorable: boolean) =>
    splitRecords(value).flatMap(record => {
      const fields = record.split('_')
      const championId = toNumber(fields[1])
      if (championId === null) return []
      return [{ championId, winRate: percentToRatio(fields[2]), favorable }]
    })

  return [
    ...parseList(payload.high_op_details, true),
    ...parseList(payload.low_op_details, false),
  ]
}

export function parseQq101Synergies(response: unknown): Qq101Synergy[] {
  const payload = parseInner<{ data_details?: string }>(response)
  if (!payload) return []

  return splitRecords(payload.data_details).flatMap(record => {
    const fields = record.split('_')
    const championId = toNumber(fields[1])
    if (championId === null) return []
    return [{
      championId,
      winRate: percentToRatio(fields[2]),
      games: toNumber(fields[3]),
    }]
  })
}

// ---------- 请求客户端 ----------

const QQ101_ORIGIN = 'https://mlol.qt.qq.com'
const RIFT_PATH = '/go/battle_info/odp_proxy/lol_101strategy'
const ALL_TIERS = 255
const REQUEST_TIMEOUT_MS = 3000
const PATCH_CACHE_KEY = 'lux.qq101.patch'
const PATCH_CACHE_TTL_MS = 12 * 60 * 60 * 1000

let memoryPatch: string | null = null

export function resetPatchCacheForTest() {
  memoryPatch = null
}

function readStoredPatch(): string | null {
  try {
    if (typeof DataStore === 'undefined') return null
    const entry = DataStore.get<{ name?: unknown; ts?: unknown }>(PATCH_CACHE_KEY)
    if (!entry || typeof entry.name !== 'string' || typeof entry.ts !== 'number') return null
    return Date.now() - entry.ts < PATCH_CACHE_TTL_MS ? entry.name : null
  } catch {
    return null
  }
}

function writeStoredPatch(name: string) {
  try {
    if (typeof DataStore === 'undefined') return
    DataStore.set(PATCH_CACHE_KEY, { name, ts: Date.now() })
  } catch {
    // 持久化失败不影响本次会话
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`QQ101 responded ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function riftUrl(path: string, patch: string, lane: Qq101Lane | 'ALL', championId?: number): string {
  const params = new URLSearchParams({
    itier: String(ALL_TIERS),
    version_id: patch,
    lane,
    ...(championId === undefined ? {} : { championid: String(championId) }),
  })
  return `${QQ101_ORIGIN}${path}?${params.toString()}`
}

export async function getPatch(): Promise<string | null> {
  if (memoryPatch) return memoryPatch
  const stored = readStoredPatch()
  if (stored) {
    memoryPatch = stored
    return stored
  }
  try {
    const versions = parseQq101Versions(await fetchJson(`${QQ101_ORIGIN}/go/database/versionlist?zone=lol&from=h5`))
    const patch = versions[0] ?? null
    if (patch) {
      memoryPatch = patch
      writeStoredPatch(patch)
    }
    return patch
  } catch {
    return null
  }
}

export async function getTierList(patch: string): Promise<Qq101TierList | null> {
  try {
    return parseQq101TierList(await fetchJson(riftUrl(RIFT_PATH, patch, 'ALL')))
  } catch {
    return null
  }
}

export async function getMatchups(
  patch: string,
  lane: Qq101Lane,
  championId: number,
): Promise<Qq101Matchup[] | null> {
  try {
    return parseQq101Matchups(await fetchJson(riftUrl(`${RIFT_PATH}_confront`, patch, lane, championId)))
  } catch {
    return null
  }
}

export async function getSynergies(
  patch: string,
  lane: Qq101Lane,
  championId: number,
): Promise<Qq101Synergy[] | null> {
  try {
    return parseQq101Synergies(await fetchJson(riftUrl(`${RIFT_PATH}_partner`, patch, lane, championId)))
  } catch {
    return null
  }
}
