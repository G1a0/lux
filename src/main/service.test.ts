import { describe, expect, it, vi } from 'vitest'
import { createCompanionService, type AdviceSource } from './service'
import type { AppConfig, ConfigStore } from './config'
import { DEFAULT_CONFIG } from './config'
import type { AramJudgeResult, RiftAdvice } from '../../shared/engine/types'
import type { ChampSelectSession } from '../../shared/lcu/types'

function fakeConfig(initial: Partial<AppConfig> = {}): ConfigStore {
  let current: AppConfig = { ...DEFAULT_CONFIG, ...initial }
  return {
    get: () => current,
    set: patch => {
      current = { ...current, ...patch }
      return current
    },
  }
}

function fakeSource(): AdviceSource & { emit(session: unknown): void; stopSpy: ReturnType<typeof vi.fn> } {
  const adviceHandlers = new Set<(snapshot: { session: ChampSelectSession }) => void>()
  const stopSpy = vi.fn()
  return {
    start: () => {},
    stop: stopSpy,
    onAdvice: h => {
      adviceHandlers.add(h)
      return () => adviceHandlers.delete(h)
    },
    onStatus: () => () => {},
    http: () => null,
    readers: () => null,
    emit: session => adviceHandlers.forEach(h => h({ session: session as ChampSelectSession })),
    stopSpy,
  }
}

// 会话夹具故意不完整（仅冒烟）；`as never` 沿用计划。
// 注意：handleSession 的支持判定走真实 mapAramInput/mapRiftContext——
// 大乱斗需已分配英雄才会产生建议，故 SESSION_ARAM 给本地玩家一个 championId。
const SESSION_BASE = {
  queueId: 420,
  localPlayerCellId: 1,
  myTeam: [
    {
      cellId: 1,
      championId: 0,
      assignedPosition: 'middle',
      summonerId: 1,
      puuid: 'p',
      championPickIntent: 0,
      team: 1,
      spell1Id: 0,
      spell2Id: 0,
    },
  ],
  theirTeam: [],
  bans: { myTeamBans: [], theirTeamBans: [], numBans: 0 },
  benchChampions: [],
  benchEnabled: false,
  rerollsRemaining: 0,
  timer: { phase: 'BAN_PICK', adjustedTimeLeftInPhase: 1000, totalTimeInPhase: 1000 },
  actions: [],
}

const SESSION_RIFT = SESSION_BASE as never
const SESSION_ARAM = {
  ...SESSION_BASE,
  queueId: 450,
  myTeam: [{ ...SESSION_BASE.myTeam[0], championId: 15 }],
} as never

function makeService(overrides: { computeRift?: unknown; computeAram?: unknown } = {}) {
  const events: unknown[] = []
  const service = createCompanionService({
    source: fakeSource(),
    config: fakeConfig(),
    computeRift: () =>
      (overrides.computeRift ?? {
        primary: {
          championId: 1,
          reason: 'x',
          score: 50,
          factors: [],
          dominantFactor: null,
          partialData: false,
        },
        alternates: [],
        runes: null,
        spells: null,
        ruleMode: false,
      }) as RiftAdvice,
    computeAram: () =>
      (overrides.computeAram ?? {
        action: 'keep',
        reason: 'y',
        current: { championId: 1 },
        bench: [],
        swapTo: null,
        runes: null,
        spells: null,
      }) as AramJudgeResult,
    syncRunner: async () => ({ status: 'synced', patch: '16.19' }),
    dataRoot: '/tmp/lux-data',
  })
  service.onSnapshot(s => events.push(s))
  return { service, events }
}

describe('CompanionService', () => {
  it('rift 会话 → 快照含 advice；再次同会话不重复', () => {
    const { service } = makeService()
    const seen: unknown[] = []
    service.onSnapshot(s => seen.push(s))
    service.handleSession(SESSION_RIFT)
    service.handleSession(SESSION_RIFT)
    expect(seen).toHaveLength(1)
    expect((seen[0] as { kind: string }).kind).toBe('rift')
  })

  it('aram 会话 → kind aram；队列不支持 → unsupported', () => {
    const { service } = makeService()
    const seen: { kind: string }[] = []
    service.onSnapshot(s => seen.push(s as { kind: string }))
    service.handleSession(SESSION_ARAM)
    service.handleSession({ ...SESSION_BASE, queueId: 1700 } as never)
    expect(seen.map(s => s.kind)).toEqual(['aram', 'unsupported'])
  })

  it('模式开关关闭 → 快照 none', () => {
    const cfg = fakeConfig({ modes: { rift: false, aram: true } })
    const service = createCompanionService({
      source: fakeSource(),
      config: cfg,
      computeRift: () => {
        throw new Error('不应被调用')
      },
      computeAram: () => {
        throw new Error('不应被调用')
      },
      syncRunner: async () => ({ status: 'synced' }),
      dataRoot: '/tmp/lux-data',
    })
    const seen: { kind: string }[] = []
    service.onSnapshot(s => seen.push(s as { kind: string }))
    service.handleSession(SESSION_RIFT)
    expect(seen[0].kind).toBe('none')
  })

  it('syncNow 透传 runner 结果并广播进度', async () => {
    const progress: number[][] = []
    const service = createCompanionService({
      source: fakeSource(),
      config: fakeConfig(),
      computeRift: () => ({ kind: 'none' }) as never,
      computeAram: () => ({ kind: 'none' }) as never,
      syncRunner: async onProgress => {
        onProgress?.(1, 2)
        onProgress?.(2, 2)
        return { status: 'synced', patch: '16.19' }
      },
      dataRoot: '/tmp/lux-data',
    })
    service.onSyncProgress((d, t) => progress.push([d, t]))
    const outcome = await service.syncNow()
    expect(outcome.status).toBe('synced')
    expect(progress).toEqual([
      [1, 2],
      [2, 2],
    ])
  })

  it('大乱斗未分配英雄（championId 0）→ 等待态 none，而非 unsupported', () => {
    const { service } = makeService()
    const seen: { kind: string }[] = []
    service.onSnapshot(s => seen.push(s as { kind: string }))
    service.handleSession({ ...SESSION_BASE, queueId: 450 } as never) // SESSION_BASE 本地玩家 championId 为 0
    expect(seen[0].kind).toBe('none')
  })

  it('切换模式开关立即重发快照', () => {
    const service = createCompanionService({
      source: fakeSource(),
      config: fakeConfig(),
      computeRift: () => ({
        primary: {
          championId: 1,
          reason: 'x',
          score: 50,
          factors: [],
          dominantFactor: null,
          partialData: false,
        },
        alternates: [],
        runes: null,
        spells: null,
        ruleMode: false,
      }),
      computeAram: () => ({
        action: 'keep',
        reason: 'y',
        // makeService 的桩经 as 断言省字段；此处直接写全以满足强类型 AramJudgeResult
        current: { championId: 1, score: 50, reason: '', factors: [], dominantFactor: null, partialData: false },
        bench: [],
        swapTo: null,
        runes: null,
        spells: null,
      }),
      syncRunner: async () => ({ status: 'synced' }),
      dataRoot: '/tmp/lux-data',
    })
    const seen: { kind: string }[] = []
    service.onSnapshot(s => seen.push(s as { kind: string }))
    service.handleSession(SESSION_RIFT)
    service.setConfig({ modes: { rift: false, aram: true } })
    expect(seen.map(s => s.kind)).toEqual(['rift', 'none'])
  })
})
