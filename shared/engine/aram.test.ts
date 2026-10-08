import { describe, expect, it } from 'vitest'
import { judgeAram } from './aram'
import { createChampionIndex } from '../champions/meta'
import type { EngineData } from './data'
import type { Qq101AramHero } from '../qq101/types'

const INDEX = createChampionIndex([
  { id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 },
  { id: 112, name: '维克托', damageType: 'ap', roles: ['mage'], difficulty: 5 },
  { id: 57, name: '茂凯', damageType: 'ap', roles: ['tank'], difficulty: 3 },
  { id: 711, name: '薇克丝', damageType: 'ap', roles: ['mage'], difficulty: 4 },
])

function aramHero(championId: number, winRate: number): Qq101AramHero {
  return {
    championId, rank: 1, rankChange: '未变化', winRate, pickRate: 0.1,
    bestPartners: [], avgDeathTime: 200, avgParticipation: 0.6, avgDamageRatio: 0.2, avgTankRatio: 0.1,
  }
}

// 强度（50 + (wr-0.5)*500）：84=90, 112=70, 57=50, 711=30
const OVERVIEW = [aramHero(84, 0.58), aramHero(112, 0.54), aramHero(57, 0.50), aramHero(711, 0.46)]

function makeData(overrides: Partial<EngineData> = {}): EngineData {
  return {
    tierList: () => null,
    matchups: () => null,
    synergies: () => null,
    runes: () => null,
    spells: () => null,
    aramOverview: () => OVERVIEW,
    champion: id => INDEX.get(id),
    ...overrides,
  }
}

describe('judgeAram', () => {
  it('备战席明显更强 → 建议换，附着内置符文技能', () => {
    const r = judgeAram({ current: 711, bench: [57, 84], diceLeft: 2 }, makeData())
    expect(r.action).toBe('swap')
    expect(r.swapTo?.championId).toBe(84)
    expect(r.reason).toContain('建议换')
    expect(r.runes).toEqual({
      keystoneId: 8112,
      runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
      source: 'builtin',
    })
    expect(r.spells).toEqual({ spellIds: [4, 32], source: 'builtin' })
  })

  it('当前就是最好的 → 留着', () => {
    const r = judgeAram({ current: 84, bench: [711], diceLeft: 2 }, makeData())
    expect(r.action).toBe('keep')
    expect(r.swapTo).toBeNull()
    expect(r.reason).toContain('留着')
  })

  it('全员弱且有骰子 → 掷骰子', () => {
    const weak = makeData({
      aramOverview: () => [aramHero(84, 0.40), aramHero(711, 0.40)],
    })
    const r = judgeAram({ current: 84, bench: [711], diceLeft: 1 }, weak)
    expect(r.action).toBe('reroll')
    expect(r.reason).toContain('掷骰子')
  })

  it('全员弱但无骰子 → 留着', () => {
    const weak = makeData({
      aramOverview: () => [aramHero(84, 0.40), aramHero(711, 0.40)],
    })
    const r = judgeAram({ current: 84, bench: [711], diceLeft: 0 }, weak)
    expect(r.action).toBe('keep')
  })

  it('无大乱斗榜单数据也能工作（中性强度），符文仍来自内置规则', () => {
    const r = judgeAram({ current: 84, bench: [112], diceLeft: 0 }, makeData({ aramOverview: () => null }))
    expect(r.action).toBe('keep')
    expect(r.runes?.source).toBe('builtin')
  })
})
