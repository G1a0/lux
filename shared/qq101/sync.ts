// 同步器：只在允许时段运行；按 版本+位置+英雄 增量抓取并写本地数据仓。
// 策略：tier 每次同步都重刷（便宜，5 个请求）；对位/协同按文件存在性跳过（贵）。
import type { Qq101Lane } from '../positions'
import { nextAllowedTime } from '../timegate'
import { ApiTimeBlockedError, type Qq101Client } from './client'
import type { Warehouse } from '../warehouse/store'

export const ALL_LANES: Qq101Lane[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'SUPPORT']

export type SyncStatus = 'blocked' | 'up-to-date' | 'synced' | 'partial'

export interface SyncResult {
  status: SyncStatus
  patch: string | null
  dataDate: string
  matchups: { fetched: number; failed: number }
  synergies: { fetched: number; failed: number }
  blockedUntil?: string
}

export interface SyncOptions {
  client: Qq101Client
  warehouse: Warehouse
  isAllowed?: (now: Date) => boolean
  now?: () => Date
  lanes?: Qq101Lane[]
  championLimitPerLane?: number
  concurrency?: number
  /** 连续失败达到该数量即停发后续请求（上游限流/WAF 熔断），默认 8 */
  abortAfterConsecutiveFailures?: number
  onProgress?: (done: number, total: number) => void
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++]
      await worker(item)
    }
  })
  await Promise.all(runners)
}

export async function syncRiftData(options: SyncOptions): Promise<SyncResult> {
  const { client, warehouse } = options
  const now = options.now ?? (() => new Date())
  const allowed = options.isAllowed ?? (() => true)
  const lanes = options.lanes ?? ALL_LANES
  const limit = options.championLimitPerLane
  const concurrency = options.concurrency ?? 5
  const abortAfter = options.abortAfterConsecutiveFailures ?? 8

  const result: SyncResult = {
    status: 'synced',
    patch: null,
    dataDate: '',
    matchups: { fetched: 0, failed: 0 },
    synergies: { fetched: 0, failed: 0 },
  }

  if (!allowed(now())) {
    result.status = 'blocked'
    result.blockedUntil = nextAllowedTime(now()).toISOString()
    return result
  }

  let blocked = false
  const catchBlocked = (error: unknown): void => {
    if (error instanceof ApiTimeBlockedError) blocked = true
    else throw error
  }

  // 1) 版本
  let patch: string | null = null
  try {
    patch = await client.getPatch()
  } catch (error) {
    catchBlocked(error)
  }
  if (blocked) {
    result.status = 'blocked'
    result.blockedUntil = nextAllowedTime(now()).toISOString()
    return result
  }
  if (!patch) {
    result.status = 'partial'
    return result
  }
  result.patch = patch

  // 2) tier（每次重刷；顺带确定数据日期与各位置的英雄集合）
  const championsByLane = new Map<Qq101Lane, number[]>()
  let dataDate = ''
  let anythingFailed = false
  for (const lane of lanes) {
    try {
      const tier = await client.getTierList(patch, lane)
      if (!tier || tier.champions.length === 0) {
        anythingFailed = true
        continue
      }
      warehouse.saveTier(patch, lane, tier)
      if (!dataDate && tier.date) dataDate = tier.date
      championsByLane.set(lane, tier.champions.map(record => record.championId))
    } catch (error) {
      catchBlocked(error)
      if (blocked) break
    }
  }
  if (blocked) {
    result.status = 'blocked'
    result.blockedUntil = nextAllowedTime(now()).toISOString()
    return result
  }
  result.dataDate = dataDate

  // 3) 对位 / 协同（只取「该位置榜单里的英雄」×该位置；按存在性跳过）
  const manifest = warehouse.readManifest()
  const samePatch = manifest?.patch === patch
  const dateUnchanged = manifest?.dataDate === dataDate

  const jobs: Array<{ lane: Qq101Lane; championId: number; need: 'both' | 'matchups' | 'synergies' }> = []
  for (const lane of lanes) {
    const laneChamps = (championsByLane.get(lane) ?? []).slice(0, limit ?? Number.MAX_SAFE_INTEGER)
    for (const championId of laneChamps) {
      const needM = !(samePatch && warehouse.hasMatchups(patch, lane, championId))
      const needS = !(samePatch && warehouse.hasSynergies(patch, lane, championId))
      if (needM || needS) jobs.push({ lane, championId, need: needM && needS ? 'both' : needM ? 'matchups' : 'synergies' })
    }
  }

  let aborted = false
  let consecutiveFailures = 0
  const stopRequested = (): boolean => blocked || aborted
  const noteFailure = (): void => {
    anythingFailed = true
    if (++consecutiveFailures >= abortAfter) aborted = true
  }

  let done = 0
  const total = jobs.length
  await runPool(jobs, concurrency, async job => {
    if (stopRequested()) return
    try {
      if (job.need !== 'synergies' && !stopRequested()) {
        const rows = await client.getMatchups(patch!, job.lane, job.championId)
        if (rows && rows.length > 0) {
          warehouse.saveMatchups(patch!, job.lane, job.championId, rows)
          result.matchups.fetched++
          consecutiveFailures = 0
        } else {
          result.matchups.failed++
          noteFailure()
        }
      }
      if (job.need !== 'matchups' && !stopRequested()) {
        const rows = await client.getSynergies(patch!, job.lane, job.championId)
        if (rows && rows.length > 0) {
          warehouse.saveSynergies(patch!, job.lane, job.championId, rows)
          result.synergies.fetched++
          consecutiveFailures = 0
        } else {
          result.synergies.failed++
          noteFailure()
        }
      }
    } catch (error) {
      catchBlocked(error)
      if (blocked) anythingFailed = true
    }
    done++
    options.onProgress?.(done, total)
  })

  if (blocked) {
    result.status = 'blocked'
    result.blockedUntil = nextAllowedTime(now()).toISOString()
    return result
  }

  // 4) 完成才写 manifest；无数据日期（上游异常/全空）不写，避免误报 up-to-date
  if (dataDate) warehouse.writeManifest({ patch, dataDate, updatedAt: now().toISOString() })

  const nothingToDo = samePatch && dateUnchanged && total === 0
  result.status = anythingFailed ? 'partial' : nothingToDo ? 'up-to-date' : 'synced'
  return result
}
