// Node 版 101 客户端：可注入 fetch / 时段门控 / 请求节流。
// 时段禁止时抛 ApiTimeBlockedError（绝不静默吞掉）；其他网络错误返回 null。
import { isApiAllowed } from '../timegate'
import type { Qq101Lane } from '../positions'
import { aramOverviewUrl, RIFT_PATH, riftUrl, versionsUrl } from './endpoints'
import {
  parseQq101AramOverview,
  parseQq101Matchups,
  parseQq101RunePages,
  parseQq101SpellCombos,
  parseQq101Synergies,
  parseQq101TierList,
  parseQq101Versions,
} from './parse'
import type {
  Qq101AramHero,
  Qq101Matchup,
  Qq101RunePage,
  Qq101SpellCombo,
  Qq101Synergy,
  Qq101TierList,
} from './types'

export class ApiTimeBlockedError extends Error {
  constructor(now: Date) {
    super(`API 调用被时段限制阻止（工作日 9-12 / 14-18 禁止）：${now.toLocaleString()}`)
    this.name = 'ApiTimeBlockedError'
  }
}

export interface Qq101Client {
  getPatch(): Promise<string | null>
  getTierList(patch: string, lane: Qq101Lane | 'ALL'): Promise<Qq101TierList | null>
  getMatchups(patch: string, lane: Qq101Lane, championId: number): Promise<Qq101Matchup[] | null>
  getSynergies(patch: string, lane: Qq101Lane, championId: number): Promise<Qq101Synergy[] | null>
  getRunePages(patch: string, lane: Qq101Lane, championId: number): Promise<Qq101RunePage[] | null>
  getSpellCombos(patch: string, lane: Qq101Lane, championId: number): Promise<Qq101SpellCombo[] | null>
  getAramOverview(dtstatdate: string): Promise<Qq101AramHero[] | null>
}

export interface CreateQq101ClientOptions {
  fetchImpl?: typeof fetch
  isAllowed?: (now: Date) => boolean
  now?: () => Date
  timeoutMs?: number
  minIntervalMs?: number
}

export function createQq101Client(options: CreateQq101ClientOptions = {}): Qq101Client {
  const fetchImpl = options.fetchImpl ?? fetch
  const allowed = options.isAllowed ?? isApiAllowed
  const now = options.now ?? (() => new Date())
  const timeoutMs = options.timeoutMs ?? 3000
  const minIntervalMs = options.minIntervalMs ?? 150

  let cachedPatch: string | null = null
  let lastRequestAt = 0

  async function guard(): Promise<void> {
    const t = now()
    if (!allowed(t)) throw new ApiTimeBlockedError(t)
    const wait = lastRequestAt + minIntervalMs - Date.now()
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))
    const afterSleep = now()
    if (!allowed(afterSleep)) throw new ApiTimeBlockedError(afterSleep)
    lastRequestAt = Date.now()
  }

  async function fetchJson(url: string): Promise<unknown> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`QQ101 responded ${res.status}`)
      return await res.json()
    } finally {
      clearTimeout(timer)
    }
  }

  async function request<T>(url: string, parse: (raw: unknown) => T): Promise<T | null> {
    await guard()
    try {
      return parse(await fetchJson(url))
    } catch (error) {
      if (error instanceof ApiTimeBlockedError) throw error
      return null
    }
  }

  return {
    async getPatch(): Promise<string | null> {
      if (cachedPatch) return cachedPatch
      const versions = await request(versionsUrl(), parseQq101Versions)
      if (!versions || versions.length === 0) return null
      cachedPatch = versions[0]
      return cachedPatch
    },
    getTierList: (patch, lane) =>
      request(
        riftUrl(RIFT_PATH, patch, lane, undefined, { sort_metric: '1', sort_order: '2' }),
        parseQq101TierList,
      ),
    getMatchups: (patch, lane, championId) =>
      request(riftUrl(`${RIFT_PATH}_confront`, patch, lane, championId), parseQq101Matchups),
    getSynergies: (patch, lane, championId) =>
      request(riftUrl(`${RIFT_PATH}_partner`, patch, lane, championId), parseQq101Synergies),
    getRunePages: (patch, lane, championId) =>
      request(riftUrl(`${RIFT_PATH}_runeinfo`, patch, lane, championId), parseQq101RunePages),
    getSpellCombos: (patch, lane, championId) =>
      request(riftUrl(`${RIFT_PATH}_skill`, patch, lane, championId), parseQq101SpellCombos),
    getAramOverview: dtstatdate =>
      request(aramOverviewUrl(dtstatdate), parseQq101AramOverview),
  }
}
