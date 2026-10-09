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

function fakeSource(): AdviceSource & {
  emit(session: unknown): void
  emitStatus(status: string): void
  stopSpy: ReturnType<typeof vi.fn>
} {
  const adviceHandlers = new Set<(snapshot: { session: ChampSelectSession }) => void>()
  const statusHandlers = new Set<(status: string) => void>()
  const stopSpy = vi.fn()
  return {
    start: () => {},
    stop: stopSpy,
    onAdvice: h => {
      adviceHandlers.add(h)
      return () => adviceHandlers.delete(h)
    },
    onStatus: h => {
      statusHandlers.add(h)
      return () => statusHandlers.delete(h)
    },
    http: () => null,
    readers: () => null,
    emit: session => adviceHandlers.forEach(h => h({ session: session as ChampSelectSession })),
    emitStatus: status => statusHandlers.forEach(h => h(status)),
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

function makeService(
  overrides: {
    computeRift?: unknown
    computeAram?: unknown
    championName?: (id: number) => string | null
  } = {},
) {
  const events: unknown[] = []
  const source = fakeSource()
  const service = createCompanionService({
    source,
    config: fakeConfig(),
    championName: overrides.championName,
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
  return { service, events, source }
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

  it('注入 championName 时 rift 快照携带 names', () => {
    const { service, events } = makeService({ championName: id => `英雄名${id}` })
    service.handleSession(SESSION_RIFT)
    const snap = events[0] as { kind: string; names?: Record<number, string> }
    expect(snap.kind).toBe('rift')
    expect(snap.names).toEqual({ 1: '英雄名1' }) // 默认桩：主推 championId=1、无备选
  })

  it('未注入 championName 时不产生 names 字段', () => {
    const { service, events } = makeService()
    service.handleSession(SESSION_RIFT)
    expect((events[0] as { names?: unknown }).names).toBeUndefined()
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

  it('syncNow 并发调用单飞（不重复发起）', async () => {
    let calls = 0
    const service = createCompanionService({
      source: fakeSource(),
      config: fakeConfig(),
      computeRift: () => ({ kind: 'none' }) as never,
      computeAram: () => ({ kind: 'none' }) as never,
      syncRunner: async () => {
        calls += 1
        await new Promise(r => setTimeout(r, 20))
        return { status: 'synced' }
      },
      dataRoot: '/tmp/lux-data',
    })
    const [a, b] = await Promise.all([service.syncNow(), service.syncNow()])
    expect(calls).toBe(1)
    expect(a.status).toBe('synced')
    expect(b.status).toBe('synced')
  })

  it('位置变化（英雄不变）触发重算', () => {
    const { service } = makeService()
    const seen: unknown[] = []
    service.onSnapshot(s => seen.push(s))
    service.handleSession(SESSION_RIFT)
    const moved = {
      ...SESSION_BASE,
      myTeam: SESSION_BASE.myTeam.map(p => ({ ...p, assignedPosition: 'top' })),
    } as never
    service.handleSession(moved)
    expect(seen).toHaveLength(2)
  })

  it('仅 Ban 变化也触发重发（去重键含 Ban）', () => {
    const { service, events } = makeService()
    service.handleSession(SESSION_RIFT)
    const banned = { ...SESSION_BASE, bans: { myTeamBans: [1], theirTeamBans: [], numBans: 1 } } as never
    service.handleSession(banned)
    expect(events).toHaveLength(2)
  })

  it('离开选人（状态非 in-champ-select）→ 发终态 none，重进可重发', () => {
    const { service, events, source } = makeService()
    service.start()
    service.handleSession(SESSION_RIFT)
    source.emitStatus('connected')
    expect((events[events.length - 1] as { kind: string }).kind).toBe('none')
    // 离开时清空去重键：同一会话再次进入应重发（而非被去重吞掉）
    service.handleSession(SESSION_RIFT)
    expect((events[events.length - 1] as { kind: string }).kind).toBe('rift')
    service.stop()
    expect(source.stopSpy).toHaveBeenCalled()
  })
})
