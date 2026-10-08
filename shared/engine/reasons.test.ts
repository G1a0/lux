import { describe, expect, it } from 'vitest'
import { buildReason } from './reasons'
import { createChampionIndex } from '../champions/meta'
import type { EngineData } from './data'
import type { FactorResult } from './types'

const INDEX = createChampionIndex([
  { id: 69, name: '卡西奥佩娅', damageType: 'ap', roles: ['mage'], difficulty: 5 },
  { id: 876, name: '莉莉娅', damageType: 'ap', roles: ['fighter'], difficulty: 6 },
])

const data: EngineData = {
  tierList: () => null, matchups: () => null, synergies: () => null,
  runes: () => null, spells: () => null, aramOverview: () => null,
  champion: id => INDEX.get(id),
}

function factor(overrides: Partial<FactorResult>): FactorResult {
  return { key: 'strength', score: 60, weight: 25, contribution: 15, ...overrides }
}

describe('buildReason', () => {
  it('对位好打模板', () => {
    const r = buildReason(factor({ key: 'matchup', detail: { kind: 'matchup', enemyChampionId: 69, winRate: 0.5646 } }), data, '排位')
    expect(r).toBe('对线好打：对 卡西奥佩娅 胜率 56.5%')
  })

  it('对位劣势模板', () => {
    const r = buildReason(factor({ key: 'matchup', detail: { kind: 'matchup', enemyChampionId: 69, winRate: 0.431 } }), data, '排位')
    expect(r).toBe('对线有压力：对 卡西奥佩娅 胜率 43.1%')
  })

  it('协同模板', () => {
    const r = buildReason(factor({ key: 'synergy', detail: { kind: 'synergy', allyChampionId: 876, winRate: 0.58 } }), data, '排位')
    expect(r).toBe('和队友 莉莉娅 是黄金搭档（胜率 58.0%）')
  })

  it('强度模板：有 T 级带括号，无 T 级（大乱斗）不带', () => {
    const r1 = buildReason(factor({ key: 'strength', detail: { kind: 'strength', winRate: 0.52, tier: 'T1' } }), data, '排位')
    expect(r1).toBe('版本强势：排位胜率 52.0%（T1）')
    const r2 = buildReason(factor({ key: 'strength', detail: { kind: 'strength', winRate: 0.546, tier: '' } }), data, '大乱斗')
    expect(r2).toBe('版本强势：大乱斗胜率 54.6%')
  })

  it('阵容模板与新手模板', () => {
    const r1 = buildReason(factor({ key: 'composition', detail: { kind: 'composition', text: '你们缺前排，阿卡丽正好补上' } }), data, '排位')
    expect(r1).toBe('你们缺前排，阿卡丽正好补上')
    const r2 = buildReason(factor({ key: 'beginner', detail: { kind: 'beginner', difficulty: 3 } }), data, '排位')
    expect(r2).toBe('操作上手简单，适合新手')
  })

  it('主导因素为空 → 兜底文案', () => {
    expect(buildReason(null, data, '排位')).toBe('适合当前阵容')
  })

  it('英雄名缺失用兜底命名', () => {
    const r = buildReason(factor({ key: 'matchup', detail: { kind: 'matchup', enemyChampionId: 12345, winRate: 0.6 } }), data, '排位')
    expect(r).toBe('对线好打：对 英雄12345 胜率 60.0%')
  })
})
