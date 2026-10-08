import { describe, expect, it } from 'vitest'
import { buildCandidatePool, toQq101Lane } from './candidates'
import type { DraftContext, QueueId } from './types'
import type { EngineData } from './data'
import { createChampionIndex } from '../champions/meta'
import type { Qq101TierList } from '../qq101/types'

const TIER: Qq101TierList = {
  date: 'x',
  champions: [
    { rank: 1, championId: 101, strengthTier: 'T1', position: 'mid', winRate: 0.5, pickRate: 0.1, banRate: 0.05, counterChampionIds: [] },
    { rank: 2, championId: 84, strengthTier: 'T1', position: 'mid', winRate: 0.5, pickRate: 0.1, banRate: 0.05, counterChampionIds: [] },
    { rank: 3, championId: 711, strengthTier: 'T2', position: 'mid', winRate: 0.5, pickRate: 0.1, banRate: 0.05, counterChampionIds: [] },
    { rank: 4, championId: 112, strengthTier: 'T2', position: 'mid', winRate: 0.5, pickRate: 0.1, banRate: 0.05, counterChampionIds: [] },
  ],
}

function makeData(overrides: Partial<EngineData> = {}): EngineData {
  return {
    tierList: () => null,
    matchups: () => null,
    synergies: () => null,
    runes: () => null,
    spells: () => null,
    aramOverview: () => null,
    champion: id => ({ id, name: `英雄${id}`, damageType: 'ap', roles: ['mage'], difficulty: 5 }),
    ...overrides,
  }
}

function ctx(queueId: QueueId, extra: Partial<DraftContext> = {}): DraftContext {
  return { queueId, allies: [], enemies: [], ...extra }
}

describe('toQq101Lane', () => {
  it('内部位置 → 101 lane', () => {
    expect(toQq101Lane('mid')).toBe('MIDDLE')
    expect(toQq101Lane('utility')).toBe('SUPPORT')
    expect(toQq101Lane(undefined)).toBeNull()
  })
})

describe('buildCandidatePool', () => {
  it('征召：来自该位置梯度榜，剔除双方已选与 Ban', () => {
    const data = makeData({ tierList: lane => (lane === 'MIDDLE' ? TIER : null) })
    const pool = buildCandidatePool(
      ctx(420, {
        myPosition: 'mid',
        allies: [{ championId: 101 }],
        enemies: [{ championId: 711, position: 'mid' }],
        bans: [112],
      }),
      data,
    )
    expect(pool).toEqual([84])
  })

  it('已拥有过滤：提供 ownedChampionIds 时仅保留其中', () => {
    const data = makeData({ tierList: () => TIER })
    const pool = buildCandidatePool(ctx(420, { myPosition: 'mid', ownedChampionIds: [84, 112] }), data)
    expect(pool).toEqual([84, 112])
  })

  it('盲选：用 ALL 榜且不限制位置', () => {
    const data = makeData({ tierList: lane => (lane === 'ALL' ? TIER : null) })
    const pool = buildCandidatePool(ctx(430), data)
    expect(pool).toEqual([101, 84, 711, 112])
  })

  it('无榜单数据（规则模式）：回退到英雄字典全集', () => {
    const index = createChampionIndex([
      { id: 1, name: 'a', damageType: 'ad', roles: ['tank'], difficulty: 3 },
      { id: 2, name: 'b', damageType: 'ap', roles: ['mage'], difficulty: 5 },
    ])
    const data = makeData({ champion: id => index.get(id) })
    const pool = buildCandidatePool(ctx(420, { myPosition: 'mid', allies: [{ championId: 1 }] }), data)
    expect(pool).toEqual([2])
  })
})
