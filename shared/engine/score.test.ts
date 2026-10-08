import { describe, expect, it } from 'vitest'
import { scoreBeginner, scoreChampion, scoreComposition, scoreMatchup, scoreStrength, scoreSynergy } from './score'
import type { EngineData } from './data'
import type { DraftContext } from './types'
import type { Qq101TierList } from '../qq101/types'
import { createChampionIndex } from '../champions/meta'

const INDEX = createChampionIndex([
  { id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 },
  { id: 112, name: '维克托', damageType: 'ap', roles: ['mage'], difficulty: 5 },
  { id: 57, name: '茂凯', damageType: 'ap', roles: ['tank'], difficulty: 3 },
  { id: 81, name: '伊泽瑞尔', damageType: 'ad', roles: ['marksman'], difficulty: 5 },
  { id: 122, name: '德莱厄斯', damageType: 'ad', roles: ['fighter'], difficulty: 6 },
  { id: 86, name: '盖伦', damageType: 'ad', roles: ['fighter', 'tank'], difficulty: 3 },
  { id: 105, name: '菲兹', damageType: 'ap', roles: ['assassin'], difficulty: 6 },
])

const TIER: Qq101TierList = {
  date: 'x',
  champions: [
    { rank: 1, championId: 84, strengthTier: 'T1', position: 'mid', winRate: 0.53, pickRate: 0.10, banRate: 0.05, counterChampionIds: [] },
    { rank: 2, championId: 112, strengthTier: 'T1', position: 'mid', winRate: 0.51, pickRate: 0.08, banRate: 0.05, counterChampionIds: [] },
    { rank: 3, championId: 711, strengthTier: 'T2', position: 'mid', winRate: 0.49, pickRate: 0.06, banRate: 0.05, counterChampionIds: [] },
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
    champion: id => INDEX.get(id),
    ...overrides,
  }
}

const BASE_CTX: DraftContext = { queueId: 420, myPosition: 'mid', allies: [], enemies: [] }

describe('scoreStrength', () => {
  it('按胜率/出场率百分位计分（最高胜率 = 100，唯一最低 = 33.3）', () => {
    const data = makeData({ tierList: () => TIER })
    const r = scoreStrength(84, 'MIDDLE', data)
    expect(r.score).toBe(100)
    expect(r.detail).toEqual({ kind: 'strength', winRate: 0.53, tier: 'T1' })
    expect(scoreStrength(112, 'MIDDLE', data).score).toBe(66.7)
    expect(scoreStrength(711, 'MIDDLE', data).score).toBe(33.3)
    expect(scoreStrength(9999, 'MIDDLE', data).score).toBeNull()
  })
})

describe('scoreMatchup', () => {
  it('好打/难打/未覆盖', () => {
    const data = makeData({
      matchups: (_lane, id) =>
        id === 84
          ? [
              { championId: 69, winRate: 0.5646, favorable: true },
              { championId: 711, winRate: 0.431, favorable: false },
            ]
          : null,
    })
    const good = scoreMatchup(84, 'MIDDLE', [{ championId: 69, position: 'mid' }], data)
    expect(good.score).toBeCloseTo(66.15, 2)
    expect(good.detail).toEqual({ kind: 'matchup', enemyChampionId: 69, winRate: 0.5646 })

    const bad = scoreMatchup(84, 'MIDDLE', [{ championId: 711, position: 'mid' }], data)
    expect(bad.score).toBeCloseTo(32.75, 2)

    const uncovered = scoreMatchup(84, 'MIDDLE', [{ championId: 999, position: 'mid' }], data)
    expect(uncovered.score).toBe(50)
    expect(uncovered.detail).toBeUndefined()
  })

  it('敌方位置未知时对所有敌人取平均', () => {
    const data = makeData({
      matchups: () => [
        { championId: 69, winRate: 0.56, favorable: true },
        { championId: 711, winRate: 0.44, favorable: false },
      ],
    })
    const r = scoreMatchup(84, 'MIDDLE', [{ championId: 69 }, { championId: 711 }], data)
    expect(r.score).toBeCloseTo(50, 1)
  })

  it('对位表缺数据 → null', () => {
    expect(scoreMatchup(84, 'MIDDLE', [{ championId: 69 }], makeData()).score).toBeNull()
  })
})

describe('scoreSynergy', () => {
  it('队友在协同表 → 按胜率折算；未覆盖 → 50；缺表 → null', () => {
    const data = makeData({
      synergies: () => [{ championId: 876, winRate: 0.58, games: 100 }],
    })
    const r = scoreSynergy(84, 'MIDDLE', [{ championId: 876 }], data)
    expect(r.score).toBeCloseTo(70, 1)
    expect(r.detail).toEqual({ kind: 'synergy', allyChampionId: 876, winRate: 0.58 })
    expect(scoreSynergy(84, 'MIDDLE', [{ championId: 999 }], data).score).toBe(50)
    expect(scoreSynergy(84, 'MIDDLE', [{ championId: 876 }], makeData()).score).toBeNull()
  })
})

describe('scoreComposition', () => {
  const data = makeData()

  it('缺法术伤害时法师加分', () => {
    const r = scoreComposition(112, { ...BASE_CTX, allies: [{ championId: 81 }] }, data)
    expect(r.score).toBe(65)
    expect(r.detail).toEqual({ kind: 'composition', text: '你们缺法术伤害，维克托正好补上' })
  })

  it('队友已有法师且自身也是法师 → 中性', () => {
    const r = scoreComposition(112, { ...BASE_CTX, allies: [{ championId: 84 }] }, data)
    expect(r.score).toBe(50)
  })

  it('缺前排时坦克加分；前排已两人时再选前排减分', () => {
    const r1 = scoreComposition(57, { ...BASE_CTX, myPosition: 'top', allies: [{ championId: 122 }] }, data)
    expect(r1.score).toBe(65) // +15 缺法术（队友德莱厄斯是 AD）
    const r2 = scoreComposition(57, { ...BASE_CTX, myPosition: 'top', allies: [{ championId: 122 }, { championId: 86 }] }, data)
    expect(r2.score).toBe(60) // +15 缺法术 -5 前排过剩
  })

  it('对面刺客 ≥2：前排坦克加分', () => {
    const enemies = [{ championId: 84 }, { championId: 105 }]
    const r = scoreComposition(57, { ...BASE_CTX, myPosition: 'top', enemies }, data)
    expect(r.score).toBe(60) // +10 扛刺客（队友为空不触发缺口规则）
  })

  it('字典缺 profile → null', () => {
    expect(scoreComposition(9999, BASE_CTX, data).score).toBeNull()
  })
})

describe('scoreBeginner', () => {
  it('按难度折算；提供熟练度时加权', () => {
    const data = makeData()
    expect(scoreBeginner(84, undefined, data).score).toBe(58)
    expect(scoreBeginner(84, { 84: 80 }, data).score).toBeCloseTo(66.8, 1)
    expect(scoreBeginner(9999, undefined, data).score).toBeNull()
  })
})

describe('scoreChampion', () => {
  it('缺数据的因素按 50 计并标记 partialData；主导因素取贡献最大', () => {
    const data = makeData({
      tierList: () => TIER,
      matchups: () => [{ championId: 69, winRate: 0.5646, favorable: true }],
    })
    const rec = scoreChampion(84, { ...BASE_CTX, enemies: [{ championId: 69, position: 'mid' }] }, data, { modeLabel: '排位' })
    expect(rec.partialData).toBe(true) // synergy/runes 未提供 → synergy null
    expect(rec.score).toBeGreaterThan(50)
    const keys = rec.factors.map(f => f.key).sort()
    expect(keys).toEqual(['beginner', 'composition', 'matchup', 'strength', 'synergy'])
    expect(rec.dominantFactor).toBe('strength') // 25 > matchup 19.5
  })
})
