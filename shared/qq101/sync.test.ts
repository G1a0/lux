import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { ApiTimeBlockedError, type Qq101Client } from './client'
import { syncRiftData } from './sync'
import type { Qq101Matchup, Qq101Synergy, Qq101TierList } from './types'
import { createWarehouse, type Warehouse } from '../warehouse/store'
import type { Qq101Lane } from '../positions'

// 三个英雄的小型样本，便于断言
const CHAMPS = [84, 711, 876]

interface FakeCall { kind: 'tier' | 'matchups' | 'synergies'; lane: Qq101Lane; championId?: number }

function fakeTier(lane: Qq101Lane, date = '2026-10-08'): Qq101TierList {
  return {
    date,
    champions: CHAMPS.map((id, i) => ({
      rank: i + 1, championId: id, strengthTier: 'T1', position: 'mid',
      winRate: 0.52, pickRate: 0.1, banRate: 0.05, counterChampionIds: [],
    })),
  }
}

function createFakeClient(opts: { failChampions?: number[]; blockAfter?: number } = {}) {
  const calls: FakeCall[] = []
  let remaining = opts.blockAfter ?? Infinity
  const client: Qq101Client = {
    async getPatch() { return '16.19' },
    async getTierList(_patch, lane) {
      calls.push({ kind: 'tier', lane: lane as Qq101Lane })
      return fakeTier(lane as Qq101Lane)
    },
    async getMatchups(_patch, lane, championId): Promise<Qq101Matchup[] | null> {
      if (remaining-- <= 0) throw new ApiTimeBlockedError(new Date())
      calls.push({ kind: 'matchups', lane, championId })
      if (opts.failChampions?.includes(championId)) return null
      return [{ championId: 999, winRate: 0.55, favorable: true }]
    },
    async getSynergies(_patch, lane, championId): Promise<Qq101Synergy[] | null> {
      if (remaining-- <= 0) throw new ApiTimeBlockedError(new Date())
      calls.push({ kind: 'synergies', lane, championId })
      if (opts.failChampions?.includes(championId)) return null
      return [{ championId: 998, winRate: 0.58, games: 100 }]
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
    expect(calls.filter(c => c.kind === 'tier')).toHaveLength(1)
    expect(calls.filter(c => c.kind === 'matchups')).toHaveLength(3)
    expect(calls.filter(c => c.kind === 'synergies')).toHaveLength(3)
    expect(wh.hasTier('16.19', 'MIDDLE')).toBe(true)
    expect(wh.hasMatchups('16.19', 'MIDDLE', 84)).toBe(true)
    expect(wh.readManifest()).toMatchObject({ patch: '16.19', dataDate: '2026-10-08' })
  })

  it('二次同步：已存在且版本未变 → up-to-date，不再拉英雄数据（tier 会重刷）', async () => {
    const first = createFakeClient()
    await syncRiftData({ client: first.client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    const second = createFakeClient()
    const result = await syncRiftData({ client: second.client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    expect(result.status).toBe('up-to-date')
    expect(second.calls.filter(c => c.kind !== 'tier')).toHaveLength(0)
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
})
