// 应用核心（无 Electron 依赖，可无头测试）：
// 会话→（模式开关）→引擎计算→快照广播；配置读写；一键应用；数据同步（手动/定时）。
import type { ChampSelectSession } from '../../shared/lcu/types'
import { benchChampionIds, mapAramInput, mapRiftContext, proficiencyFromMastery } from '../../shared/lcu/map-session'
import { applyRunePage, carrySpells } from '../../shared/lcu/writers'
import { LcuHttpError, type LcuHttp } from '../../shared/lcu/http'
import type { LcuReaders } from '../../shared/lcu/readers'
import type { AramJudgeResult, RiftAdvice } from '../../shared/engine/types'
import type { AppConfig, ConfigStore } from './config'
import type { AdvicePayload, ManifestInfo, SyncOutcome } from '../ipc-types'

/** queueId → 模式中文名（符文页命名/界面标题用）；未知队列回退 '对局' */
const MODE_LABELS: Record<number, string> = {
  400: '征召',
  420: '排位',
  430: '匹配',
  440: '排位',
  450: '大乱斗',
}

export interface AdviceSource {
  start(): void
  stop(): void
  onAdvice(handler: (snapshot: { session: ChampSelectSession }) => void): () => void
  onStatus(handler: (status: string) => void): () => void
  http(): LcuHttp | null
  readers(): LcuReaders | null
}

export interface SyncRunnerResult {
  status: string
  patch?: string | null
  blockedUntil?: string
}
export type SyncRunner = (onProgress?: (done: number, total: number) => void) => Promise<SyncRunnerResult>

export interface ServiceDeps {
  source: AdviceSource
  config: ConfigStore
  computeRift: (session: ChampSelectSession, config: AppConfig, caches: RosterCaches) => RiftAdvice
  computeAram: (session: ChampSelectSession, config: AppConfig) => AramJudgeResult
  syncRunner: SyncRunner
  dataRoot: string
  manifestReader?: () => ManifestInfo | null
  /** 英雄名称查询（renderer 展示用）；缺省则快照不带 names */
  championName?: (id: number) => string | null
}

export interface RosterCaches {
  owned: number[]
  proficiency: Record<number, number>
}

export interface CompanionService {
  start(): void
  stop(): void
  handleSession(session: ChampSelectSession): void
  onSnapshot(handler: (payload: AdvicePayload) => void): () => void
  onStatus(handler: (status: string) => void): () => void
  onSyncProgress(handler: (done: number, total: number) => void): () => void
  applyRunes(): Promise<{ ok: boolean; reason?: string }>
  applySpells(): Promise<boolean>
  /** 英雄头像（LCU 本地资源 → data URL）；不可用时 null（界面降级为纯文本） */
  getChampionIcon(championId: number): Promise<string | null>
  getConfig(): AppConfig
  setConfig(patch: Partial<AppConfig>): AppConfig
  getManifest(): ManifestInfo | null
  syncNow(): Promise<SyncOutcome>
}

export function createCompanionService(deps: ServiceDeps): CompanionService {
  const snapshotHandlers = new Set<(payload: AdvicePayload) => void>()
  const statusHandlers = new Set<(status: string) => void>()
  const progressHandlers = new Set<(done: number, total: number) => void>()

  let lastPayload: AdvicePayload = { kind: 'none' }
  let lastKey = ''
  let lastSession: ChampSelectSession | null = null
  const caches: RosterCaches = { owned: [], proficiency: {} }
  /** 头像缓存：成功存 data URL，LCU 404 存 null（图标不存在，重试无意义）；其他错误不缓存 */
  const iconCache = new Map<number, string | null>()
  let rosterTimer: ReturnType<typeof setInterval> | null = null
  let syncTimer: ReturnType<typeof setInterval> | null = null
  let syncInFlight: Promise<SyncOutcome> | null = null
  let offAdvice: (() => void) | null = null
  let offStatus: (() => void) | null = null
  let running = false

  const emit = (payload: AdvicePayload): void => {
    lastPayload = payload
    snapshotHandlers.forEach(h => h(payload))
  }

  const namesFor = (ids: number[]): Record<number, string> | undefined => {
    if (!deps.championName) return undefined
    const out: Record<number, string> = {}
    for (const id of [...new Set(ids)]) {
      const name = deps.championName(id)
      if (name) out[id] = name
    }
    return Object.keys(out).length > 0 ? out : undefined
  }

  async function refreshRoster(): Promise<void> {
    const readers = deps.source.readers()
    if (!readers) return
    try {
      const [owned, free, mastery] = await Promise.all([
        readers.getOwnedChampionIds(),
        readers.getFreeRotationIds(),
        readers.getChampionMasteryPoints(),
      ])
      caches.owned = [...new Set([...owned, ...free])]
      caches.proficiency = Object.fromEntries(
        Object.entries(mastery).map(([id, points]) => [Number(id), proficiencyFromMastery(points)]),
      )
    } catch {
      // 客户端暂不可用：保留旧缓存
    }
  }

  const service: CompanionService = {
    start() {
      if (running) return
      running = true
      offAdvice = deps.source.onAdvice(snapshot => service.handleSession(snapshot.session))
      offStatus = deps.source.onStatus(status => {
        statusHandlers.forEach(h => h(status))
        if (status !== 'in-champ-select') {
          lastKey = '' // 允许重新进入时重发
          emit({ kind: 'none' })
        }
      })
      deps.source.start()
      void refreshRoster()
      rosterTimer = setInterval(() => {
        if (running) void refreshRoster()
      }, 60_000)
      // 启动即尝试一次同步 + 每 3 小时检查（应用内随时可同步；时段门禁仅存在于开发工具）
      void this.syncNow()
      syncTimer = setInterval(() => {
        if (running) void this.syncNow()
      }, 3 * 60 * 60 * 1000)
    },
    stop() {
      running = false
      if (rosterTimer) clearInterval(rosterTimer)
      if (syncTimer) clearInterval(syncTimer)
      offAdvice?.()
      offStatus?.()
      offAdvice = null
      offStatus = null
      deps.source.stop()
    },
    handleSession(session) {
      lastSession = session
      const config = deps.config.get()
      const key = `${session.queueId}|${session.myTeam.map(p => p.championId).join(',')}|${session.myTeam.map(p => p.assignedPosition).join(',')}|${session.theirTeam.map(p => p.championId).join(',')}|${benchChampionIds(session).join(',')}|${session.rerollsRemaining}|${session.bans.myTeamBans.join(',')}|${session.bans.theirTeamBans.join(',')}`
      if (key === lastKey) return
      lastKey = key

      const aramInput = mapAramInput(session)
      const isAram = session.queueId === 450
      // 大乱斗尚未分配到英雄：等待态，勿误报"不支持"（reason 供界面区分"已进入选人但还没英雄可推荐"）
      if (isAram && !aramInput) return emit({ kind: 'none', reason: 'aram-pre-pick' })
      // 支持判定走真实映射（与下游 compute 同源）；两者皆 null 才视为不支持
      const supported = aramInput !== null || mapRiftContext(session) !== null

      if (isAram && aramInput) {
        if (!config.modes.aram) return emit({ kind: 'none', reason: 'mode-off' })
        try {
          const aram = deps.computeAram(session, config)
          return emit({
            kind: 'aram',
            queueId: session.queueId,
            aram,
            names: namesFor([
              aram.current.championId,
              ...(aram.swapTo ? [aram.swapTo.championId] : []),
              ...aram.bench.map(b => b.championId),
            ]),
          })
        } catch (error) {
          console.warn('[service] ARAM 计算失败：', error)
          return emit({ kind: 'none', reason: 'compute-error' })
        }
      }
      if (!supported) return emit({ kind: 'unsupported', queueId: session.queueId })
      if (!config.modes.rift) return emit({ kind: 'none', reason: 'mode-off' })
      try {
        const advice = deps.computeRift(session, config, caches)
        emit({
          kind: 'rift',
          queueId: session.queueId,
          advice,
          names: namesFor([advice.primary.championId, ...advice.alternates.map(a => a.championId)]),
        })
      } catch (error) {
        console.warn('[service] 推荐计算失败：', error)
        emit({ kind: 'none', reason: 'compute-error' })
      }
    },
    onSnapshot(handler) {
      snapshotHandlers.add(handler)
      return () => snapshotHandlers.delete(handler)
    },
    onStatus(handler) {
      statusHandlers.add(handler)
      return () => statusHandlers.delete(handler)
    },
    onSyncProgress(handler) {
      progressHandlers.add(handler)
      return () => progressHandlers.delete(handler)
    },
    async applyRunes() {
      const http = deps.source.http()
      if (!http) return { ok: false, reason: '未连接客户端' }
      const runes =
        lastPayload.kind === 'rift'
          ? lastPayload.advice.runes
          : lastPayload.kind === 'aram'
            ? lastPayload.aram.runes
            : null
      if (!runes) return { ok: false, reason: '当前没有可应用的符文' }
      const queueId = lastPayload.kind === 'rift' || lastPayload.kind === 'aram' ? lastPayload.queueId : 0
      return applyRunePage(http, {
        name: MODE_LABELS[queueId] ?? '对局',
        keystoneId: runes.keystoneId,
        subStyleCode: runes.subStyleCode ?? 'jj',
        runeIds: runes.runeIds,
      })
    },
    async applySpells() {
      const http = deps.source.http()
      if (!http) return false
      const spells =
        lastPayload.kind === 'rift'
          ? lastPayload.advice.spells
          : lastPayload.kind === 'aram'
            ? lastPayload.aram.spells
            : null
      if (!spells) return false
      return carrySpells(http, spells.spellIds)
    },
    async getChampionIcon(championId) {
      const http = deps.source.http()
      if (!http) return null
      if (iconCache.has(championId)) return iconCache.get(championId) ?? null
      try {
        const buf = await http.getBuffer(`/lol-game-data/assets/v1/champion-icons/${championId}.png`)
        if (!buf) return null // 2xx 空体：异常响应，不缓存
        const url = `data:image/png;base64,${buf.toString('base64')}`
        iconCache.set(championId, url)
        return url
      } catch (error) {
        // 404 = 该英雄无图标，缓存 null 避免反复请求；其余错误（超时/断连）留给下次重试
        if (error instanceof LcuHttpError && error.status === 404) iconCache.set(championId, null)
        return null
      }
    },
    getConfig: () => deps.config.get(),
    setConfig(patch) {
      const next = deps.config.set(patch)
      // 开关切换需即时反映：清 key 后按最近一次会话重算并重发快照
      if (lastSession && (patch.modes !== undefined || patch.ownedFilter !== undefined)) {
        lastKey = ''
        service.handleSession(lastSession)
      }
      return next
    },
    getManifest: () => deps.manifestReader?.() ?? null,
    syncNow() {
      // 单飞：定时器/手动/启动三路触发只保留一个进行中的同步（避免重复打向 101/WAF）
      if (syncInFlight) return syncInFlight
      syncInFlight = (async (): Promise<SyncOutcome> => {
        try {
          const result = await deps.syncRunner((done, total) => progressHandlers.forEach(h => h(done, total)))
          return { status: result.status, patch: result.patch ?? null, blockedUntil: result.blockedUntil }
        } catch {
          return { status: 'failed', patch: null }
        } finally {
          syncInFlight = null
        }
      })()
      return syncInFlight
    },
  }
  return service
}
