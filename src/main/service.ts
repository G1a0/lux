// 应用核心（无 Electron 依赖，可无头测试）：
// 会话→（模式开关）→引擎计算→快照广播；配置读写；一键应用；数据同步（手动/定时）。
import type { ChampSelectSession } from '../../shared/lcu/types'
import { mapAramInput, mapRiftContext, proficiencyFromMastery } from '../../shared/lcu/map-session'
import { applyRunePage, carrySpells } from '../../shared/lcu/writers'
import type { LcuHttp } from '../../shared/lcu/http'
import type { LcuReaders } from '../../shared/lcu/readers'
import type { AramJudgeResult, RiftAdvice } from '../../shared/engine/types'
import type { AppConfig, ConfigStore } from './config'
import type { AdvicePayload, ManifestInfo, SyncOutcome } from '../ipc-types'

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
  let rosterTimer: ReturnType<typeof setInterval> | null = null
  let syncTimer: ReturnType<typeof setInterval> | null = null
  let running = false

  const emit = (payload: AdvicePayload): void => {
    lastPayload = payload
    snapshotHandlers.forEach(h => h(payload))
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
      running = true
      deps.source.onAdvice(snapshot => service.handleSession(snapshot.session))
      deps.source.onStatus(status => statusHandlers.forEach(h => h(status)))
      deps.source.start()
      void refreshRoster()
      rosterTimer = setInterval(() => {
        if (running) void refreshRoster()
      }, 60_000)
      // 启动即尝试一次同步 + 每 3 小时检查（同步器内部处理时段门控）
      void this.syncNow()
      syncTimer = setInterval(() => {
        if (running) void this.syncNow()
      }, 3 * 60 * 60 * 1000)
    },
    stop() {
      running = false
      if (rosterTimer) clearInterval(rosterTimer)
      if (syncTimer) clearInterval(syncTimer)
      deps.source.stop()
    },
    handleSession(session) {
      lastSession = session
      const config = deps.config.get()
      const key = `${session.queueId}|${session.myTeam.map(p => p.championId).join(',')}|${session.theirTeam.map(p => p.championId).join(',')}|${session.benchChampions.map(b => b.championId).join(',')}|${session.rerollsRemaining}`
      if (key === lastKey) return
      lastKey = key

      const aramInput = mapAramInput(session)
      const isAram = session.queueId === 450
      if (isAram && !aramInput) return emit({ kind: 'none' }) // 大乱斗尚未分配到英雄：等待态，勿误报"不支持"
      // 支持判定走真实映射（与下游 compute 同源）；两者皆 null 才视为不支持
      const supported = aramInput !== null || mapRiftContext(session) !== null

      if (isAram && aramInput) {
        if (!config.modes.aram) return emit({ kind: 'none' })
        try {
          return emit({ kind: 'aram', queueId: session.queueId, aram: deps.computeAram(session, config) })
        } catch (error) {
          console.warn('[service] ARAM 计算失败：', error)
          return emit({ kind: 'none' })
        }
      }
      if (!supported) return emit({ kind: 'unsupported', queueId: session.queueId })
      if (!config.modes.rift) return emit({ kind: 'none' })
      try {
        emit({ kind: 'rift', queueId: session.queueId, advice: deps.computeRift(session, config, caches) })
      } catch (error) {
        console.warn('[service] 推荐计算失败：', error)
        emit({ kind: 'none' })
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
      return applyRunePage(http, {
        name: lastPayload.kind === 'aram' ? '大乱斗' : '排位',
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
    async syncNow() {
      try {
        const result = await deps.syncRunner((done, total) => progressHandlers.forEach(h => h(done, total)))
        return { status: result.status, patch: result.patch ?? null, blockedUntil: result.blockedUntil }
      } catch {
        return { status: 'failed', patch: null }
      }
    },
  }
  return service
}
