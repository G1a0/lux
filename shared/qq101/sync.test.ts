import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { ApiTimeBlockedError, type Qq101Client } from './client'
import { syncRiftData } from './sync'
import type { Qq101AramHero, Qq101Matchup, Qq101RunePage, Qq101SpellCombo, Qq101Synergy, Qq101TierList } from './types'
import { createWarehouse, type Warehouse } from '../warehouse/store'
import type { Qq101Lane } from '../positions'

// 三个英雄的小型样本，便于断言
const CHAMPS = [84, 711, 876]

interface FakeCall {
  kind: 'patch' | 'tier' | 'matchups' | 'synergies' | 'runes' | 'spells' | 'aram'
  lane: Qq101Lane | 'ALL' | null
  championId?: number
}

function fakeTier(championIds: number[], date = '2026-10-08'): Qq101TierList {
  return {
    date,
    champions: championIds.map((id, i) => ({
      rank: i + 1, championId: id, strengthTier: 'T1', position: 'mid',
      winRate: 0.52, pickRate: 0.1, banRate: 0.05, counterChampionIds: [],
    })),
  }
}

function createFakeClient(opts: {
  failChampions?: number[]
  blockAfter?: number
  emptyTier?: boolean
  failPairs?: boolean
  failTierLane?: Qq101Lane | 'ALL'
  blockAram?: boolean
  champsByLane?: Partial<Record<Qq101Lane, number[]>>
} = {}) {
  const calls: FakeCall[] = []
  let remaining = opts.blockAfter ?? Infinity
  const client: Qq101Client = {
    async getPatch() { calls.push({ kind: 'patch', lane: null }); return '16.19' },
    async getTierList(_patch, lane) {
      calls.push({ kind: 'tier', lane })
      if (opts.emptyTier) return { date: '', champions: [] }
      if (opts.failTierLane === lane) return { date: '', champions: [] }
      return fakeTier(opts.champsByLane?.[lane as Qq101Lane] ?? CHAMPS)
    },
    async getMatchups(_patch, lane, championId): Promise<Qq101Matchup[] | null> {
      if (remaining-- <= 0) throw new ApiTimeBlockedError(new Date())
      calls.push({ kind: 'matchups', lane, championId })
      if (opts.failPairs || opts.failChampions?.includes(championId)) return null
      return [{ championId: 999, winRate: 0.55, favorable: true }]
    },
    async getSynergies(_patch, lane, championId): Promise<Qq101Synergy[] | null> {
      if (remaining-- <= 0) throw new ApiTimeBlockedError(new Date())
      calls.push({ kind: 'synergies', lane, championId })
      if (opts.failPairs || opts.failChampions?.includes(championId)) return null
      return [{ championId: 998, winRate: 0.58, games: 100 }]
    },
    async getRunePages(_patch, lane, championId): Promise<Qq101RunePage[] | null> {
      if (remaining-- <= 0) throw new ApiTimeBlockedError(new Date())
      calls.push({ kind: 'runes', lane, championId })
      if (opts.failPairs || opts.failChampions?.includes(championId)) return null
      return [{ rank: 1, keystoneId: 8112, subStyleCode: 'jj', runeIds: [8112], pickRate: 0.4, winRate: 0.5, games: 100 }]
    },
    async getSpellCombos(_patch, lane, championId): Promise<Qq101SpellCombo[] | null> {
      if (remaining-- <= 0) throw new ApiTimeBlockedError(new Date())
      calls.push({ kind: 'spells', lane, championId })
      if (opts.failPairs || opts.failChampions?.includes(championId)) return null
      return [{ spellIds: [4, 14], winRate: 0.48, pickRate: 0.9 }]
    },
    async getAramOverview(_dtstatdate): Promise<Qq101AramHero[] | null> {
      calls.push({ kind: 'aram', lane: null })
      if (opts.blockAram) throw new ApiTimeBlockedError(new Date())
      if (opts.failPairs) return null
      return [{
        championId: 22, rank: 1, rankChange: '未变化', winRate: 0.5456, pickRate: 0.1539,
        bestPartners: [], avgDeathTime: 233, avgParticipation: 0.66, avgDamageRatio: 0.21, avgTankRatio: 0.16,
      }]
    },
  }
  return { client, calls }
}

describe('syncRiftData', () => {
  let root: string
  let wh: Warehouse
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'lux-sync-')); wh = createWarehouse(root) })

  it('禁窗时不发任何请求，返回 blocked + 下个允许时间', async () => {
    const { client, calls } = createFakeClient()
    const result = await syncRiftData({
      client, warehouse: wh,
      isAllowed: () => false,
      now: () => new Date(2026, 9, 5, 10, 0), // 周一 10:00
    })
    expect(result.status).toBe('blocked')
    expect(result.blockedUntil).toBe(new Date(2026, 9, 5, 12, 0).toISOString())
    expect(calls).toHaveLength(0)
  })

  it('首次同步：拉 tier + 每英雄对位/协同，写仓并记 manifest', async () => {
    const { client, calls } = createFakeClient()
    const result = await syncRiftData({ client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    expect(result.status).toBe('synced')
    expect(result.patch).toBe('16.19')
    expect(calls.filter(c => c.kind === 'tier')).toHaveLength(2)
    expect(calls.filter(c => c.kind === 'matchups')).toHaveLength(3)
    expect(calls.filter(c => c.kind === 'synergies')).toHaveLength(3)
    expect(calls.filter(c => c.kind === 'runes')).toHaveLength(3)
    expect(calls.filter(c => c.kind === 'spells')).toHaveLength(3)
    expect(wh.hasTier('16.19', 'MIDDLE')).toBe(true)
    expect(wh.hasTier('16.19', 'ALL')).toBe(true)
    expect(wh.hasMatchups('16.19', 'MIDDLE', 84)).toBe(true)
    expect(wh.hasRunes('16.19', 'MIDDLE', 84)).toBe(true)
    expect(wh.hasSpells('16.19', 'MIDDLE', 711)).toBe(true)
    expect(result.runes).toMatchObject({ fetched: 3, failed: 0 })
    expect(result.spells).toMatchObject({ fetched: 3, failed: 0 })
    expect(wh.readManifest()).toMatchObject({ patch: '16.19', dataDate: '2026-10-08' })
  })

  it('二次同步：已存在且版本未变 → up-to-date，不再拉英雄数据（tier 会重刷）', async () => {
    const first = createFakeClient()
    await syncRiftData({ client: first.client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    const second = createFakeClient()
    const result = await syncRiftData({ client: second.client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    expect(result.status).toBe('up-to-date')
    expect(second.calls.filter(c => c.kind !== 'tier' && c.kind !== 'aram' && c.kind !== 'patch')).toHaveLength(0)
  })

  it('个别英雄失败 → partial，计数正确；重跑会补齐', async () => {
    const bad = createFakeClient({ failChampions: [711] })
    const r1 = await syncRiftData({ client: bad.client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    expect(r1.status).toBe('partial')
    expect(r1.matchups).toMatchObject({ fetched: 2, failed: 1 })
    expect(wh.hasMatchups('16.19', 'MIDDLE', 711)).toBe(false)

    const good = createFakeClient()
    const r2 = await syncRiftData({ client: good.client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    expect(r2.status).toBe('synced')
    expect(good.calls.filter(c => c.kind === 'matchups')).toHaveLength(1) // 只补缺失的 711
  })

  it('同步中途进入禁窗 → blocked（保留已写入部分）', async () => {
    const { client } = createFakeClient({ blockAfter: 1 })
    const result = await syncRiftData({ client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    expect(result.status).toBe('blocked')
    expect(wh.readManifest()).toBeNull() // 未完成不写 manifest
  })

  it('上游 tier 为空（如缺必填参数）→ partial，且不写 manifest', async () => {
    const { client } = createFakeClient({ emptyTier: true })
    const result = await syncRiftData({ client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    expect(result.status).toBe('partial')
    expect(wh.readManifest()).toBeNull()
  })

  it('仅 ALL 榜为空 → partial，各位置照常同步', async () => {
    const { client, calls } = createFakeClient({ failTierLane: 'ALL' })
    const result = await syncRiftData({ client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    expect(result.status).toBe('partial')
    expect(wh.hasTier('16.19', 'ALL')).toBe(false)
    expect(wh.hasTier('16.19', 'MIDDLE')).toBe(true)
    expect(calls.filter(c => c.kind === 'matchups')).toHaveLength(3)
  })

  it('对位/协同只按各位置自己的榜单英雄取数', async () => {
    const { client, calls } = createFakeClient({ champsByLane: { MIDDLE: [84, 711], TOP: [122] } })
    await syncRiftData({ client, warehouse: wh, isAllowed: () => true, lanes: ['TOP', 'MIDDLE'] })
    const pairCalls = calls.filter(c => c.kind === 'matchups' || c.kind === 'synergies')
    const topCalls = pairCalls.filter(c => c.lane === 'TOP').map(c => c.championId).sort((a, b) => a! - b!)
    const midCalls = pairCalls.filter(c => c.lane === 'MIDDLE').map(c => c.championId).sort((a, b) => a! - b!)
    expect(topCalls).toEqual([122, 122]) // 只发 122 的对位+协同，不发 MIDDLE 英雄的 TOP 数据
    expect(midCalls).toEqual([84, 84, 711, 711])
  })

  it('连续失败达到阈值 → 熔断，不再发后续请求', async () => {
    const { client, calls } = createFakeClient({ failPairs: true })
    const result = await syncRiftData({
      client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'],
      abortAfterConsecutiveFailures: 1,
    })
    expect(result.status).toBe('partial')
    expect(result.aram).toBe('failed')
    // 首轮 3 个 worker 各发出 1 个 matchups 后即熔断，符文/技能不再发出
    expect(calls.filter(c => c.kind !== 'tier' && c.kind !== 'aram' && c.kind !== 'patch')).toHaveLength(3)
  })

  it('大乱斗总览单发一次并写 manifest.aramDate', async () => {
    const { client, calls } = createFakeClient()
    const result = await syncRiftData({
      client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'],
      now: () => new Date(2026, 9, 8, 13, 0),
    })
    expect(result.aram).toBe('synced')
    expect(calls.filter(c => c.kind === 'aram')).toHaveLength(1)
    expect(wh.hasAram('20261007')).toBe(true)
    expect(wh.readManifest()?.aramDate).toBe('20261007')
  })

  it('大乱斗总览已是最新日期则跳过', async () => {
    wh.writeManifest({ patch: '16.19', dataDate: '2026-10-08', updatedAt: 'x', aramDate: '20261007' })
    wh.saveAram('20261007', [])
    const { client, calls } = createFakeClient()
    const result = await syncRiftData({
      client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'],
      now: () => new Date(2026, 9, 8, 13, 0),
    })
    expect(result.aram).toBe('skipped')
    expect(calls.filter(c => c.kind === 'aram')).toHaveLength(0)
    expect(wh.readManifest()?.aramDate).toBe('20261007')
  })

  it('大乱斗总览遇禁窗 → blocked 且不写 manifest', async () => {
    const { client } = createFakeClient({ blockAram: true })
    const result = await syncRiftData({ client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    expect(result.status).toBe('blocked')
    expect(wh.readManifest()).toBeNull()
  })

  it('patchOverride 固定版本：跳过版本查询、按指定版本抓取', async () => {
    const { client, calls } = createFakeClient()
    const result = await syncRiftData({
      client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'],
      patchOverride: '16.88',
    })
    expect(calls.filter(c => c.kind === 'patch')).toHaveLength(0)
    expect(result.patch).toBe('16.88')
    expect(wh.hasTier('16.88', 'MIDDLE')).toBe(true)
    expect(wh.readManifest()?.patch).toBe('16.88')
  })
})
