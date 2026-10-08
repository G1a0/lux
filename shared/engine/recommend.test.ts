import { describe, expect, it } from 'vitest'
import { recommendRift } from './recommend'
import { createChampionIndex } from '../champions/meta'
import type { EngineData } from './data'
import type { DraftContext } from './types'
import type { Qq101TierList } from '../qq101/types'

const INDEX = createChampionIndex([
  { id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 },
  { id: 112, name: '维克托', damageType: 'ap', roles: ['mage'], difficulty: 5 },
  { id: 711, name: '薇克丝', damageType: 'ap', roles: ['mage'], difficulty: 4 },
  { id: 101, name: '泽拉斯', damageType: 'ap', roles: ['mage'], difficulty: 5 },
])

const TIER: Qq101TierList = {
  date: '20261007',
  champions: [
    { rank: 1, championId: 84, strengthTier: 'T1', position: 'mid', winRate: 0.53, pickRate: 0.10, banRate: 0.05, counterChampionIds: [] },
    { rank: 2, championId: 112, strengthTier: 'T1', position: 'mid', winRate: 0.51, pickRate: 0.08, banRate: 0.05, counterChampionIds: [] },
    { rank: 3, championId: 711, strengthTier: 'T2', position: 'mid', winRate: 0.47, pickRate: 0.06, banRate: 0.05, counterChampionIds: [] },
  ],
}

function makeData(overrides: Partial<EngineData> = {}): EngineData {
  return {
    tierList: lane => (lane === 'MIDDLE' ? TIER : null),
    matchups: (_lane, id) => (id === 84 ? [{ championId: 711, winRate: 0.56, favorable: true }] : null),
    synergies: () => null,
    runes: (_lane, id) => (id === 84 ? [{ rank: 1, keystoneId: 8112, subStyleCode: 'jj', runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001], pickRate: 0.44, winRate: 0.48, games: 100 }] : null),
    spells: (_lane, id) => (id === 84 ? [{ spellIds: [14, 4], winRate: 0.49, pickRate: 0.9 }] : null),
    aramOverview: () => null,
    champion: id => INDEX.get(id),
    ...overrides,
  }
}

const CTX: DraftContext = {
  queueId: 420,
  myPosition: 'mid',
  allies: [{ championId: 101, position: 'utility' }],
  enemies: [{ championId: 711, position: 'mid' }],
}

describe('recommendRift', () => {
  it('排位：主推 + 备选排序，附着符文与技能', () => {
    const advice = recommendRift(CTX, makeData())
    expect(advice.ruleMode).toBe(false)
    expect(advice.primary.championId).toBe(84)
    expect(advice.primary.reason).toContain('版本强势')
    expect(advice.alternates.length).toBeLessThanOrEqual(2)
    expect(advice.runes).toEqual({
      keystoneId: 8112,
      runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
      source: 'qq101',
    })
    expect(advice.spells).toEqual({ spellIds: [14, 4], source: 'qq101' })
    expect(advice.primary.partialData).toBe(true) // 协同表缺失
  })

  it('无任何榜单数据 → 规则模式（仅阵容+新手），候选来自英雄字典', () => {
    const data = makeData({ tierList: () => null, matchups: () => null, runes: () => null, spells: () => null })
    const advice = recommendRift(CTX, data)
    expect(advice.ruleMode).toBe(true)
    expect(advice.primary.championId).toBeDefined()
    expect(advice.runes).toBeNull()
    expect(advice.primary.factors.every(f => f.key === 'composition' || f.key === 'beginner')).toBe(true)
  })

  it('盲选：用 ALL 榜，不附着符文技能', () => {
    const data = makeData({ tierList: lane => (lane === 'ALL' ? TIER : null) })
    const advice = recommendRift({ queueId: 430, allies: [], enemies: [] }, data)
    expect(advice.ruleMode).toBe(false)
    expect(advice.runes).toBeNull()
    expect(advice.spells).toBeNull()
    expect(advice.primary).toBeDefined()
  })
})
