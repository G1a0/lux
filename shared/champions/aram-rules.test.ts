import { describe, expect, it } from 'vitest'
import { aramRuleFor, ARAM_RULES } from './aram-rules'
import { createChampionIndex, type ChampionMeta } from './meta'
import tankFixture from '../qq101/fixtures/recon-rule-tank-57-20261008.json'
import mageFixture from '../qq101/fixtures/recon-rule-mage-112-20261008.json'
import marksmanFixture from '../qq101/fixtures/recon-rule-marksman-81-20261008.json'
import supportFixture from '../qq101/fixtures/recon-rule-support-117-20261008.json'
import fighterFixture from '../qq101/fixtures/recon-rule-fighter-122-20261008.json'
import assassinFixture from '../qq101/fixtures/recon-runeinfo-84-mid-20261008.json'

const META: ChampionMeta[] = [
  { id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 },
  { id: 57, name: '茂凯', damageType: 'ap', roles: ['tank'], difficulty: 3 },
  { id: 112, name: '维克托', damageType: 'ap', roles: ['mage'], difficulty: 5 },
  { id: 99, name: '拉克丝', damageType: 'ap', roles: ['mage', 'support'], difficulty: 4 },
  { id: 122, name: '德莱厄斯', damageType: 'ad', roles: ['fighter'], difficulty: 6 },
  { id: 81, name: '伊泽瑞尔', damageType: 'ad', roles: ['marksman'], difficulty: 5 },
]
const index = createChampionIndex(META)

describe('aramRuleFor', () => {
  it('按角色归组到对应规则', () => {
    expect(aramRuleFor(84, index).key).toBe('assassin')
    expect(aramRuleFor(57, index).key).toBe('tank')
    expect(aramRuleFor(112, index).key).toBe('mage')
    expect(aramRuleFor(81, index).key).toBe('marksman')
    expect(aramRuleFor(122, index).key).toBe('fighter')
  })

  it('辅助优先于法师（多角色取 support）', () => {
    expect(aramRuleFor(99, index).key).toBe('support')
  })

  it('未知英雄回退到 fighter 规则', () => {
    expect(aramRuleFor(9999, index).key).toBe('fighter')
  })

  it('每条规则的符文页与技能结构完整', () => {
    for (const rule of Object.values(ARAM_RULES)) {
      expect(rule.runeIds).toHaveLength(9)
      expect(rule.spellIds).toEqual([4, 32]) // 闪现 + 标记
      expect(rule.keystoneId).toBeGreaterThan(0)
    }
  })
})

function topPageOf(fixture: unknown): { keystoneId: number; runeIds: number[]; subStyleCode: string } {
  const raw = fixture as { data: { _fieldValues: Record<string, string> } }
  const key = Object.keys(raw.data._fieldValues)[0]
  const inner = JSON.parse(raw.data._fieldValues[key]) as { rune_top_details: string }
  const top = inner.rune_top_details
    .split('#')
    .map(r => r.split('_'))
    .find(c => Number(c[0]) === 1)!
  return {
    keystoneId: Number(top[1]),
    runeIds: top[3].split(',').map(Number),
    subStyleCode: top[2],
  }
}

describe('规则表数值与采集样本一致（防回归）', () => {
  it.each([
    ['tank', tankFixture],
    ['mage', mageFixture],
    ['marksman', marksmanFixture],
    ['support', supportFixture],
    ['fighter', fighterFixture],
    ['assassin', assassinFixture],
  ] as const)('%s 行与 fixture 第 1 页一致', (key, fixture) => {
    const expected = topPageOf(fixture)
    expect(ARAM_RULES[key].keystoneId).toBe(expected.keystoneId)
    expect(ARAM_RULES[key].runeIds).toEqual(expected.runeIds)
    expect(ARAM_RULES[key].subStyleCode).toBe(expected.subStyleCode)
  })

  it('规则表已冻结（防共享数组被就地修改）', () => {
    expect(Object.isFrozen(ARAM_RULES)).toBe(true)
    expect(Object.isFrozen(ARAM_RULES.tank.runeIds)).toBe(true)
    expect(Object.isFrozen(ARAM_RULES.assassin.spellIds)).toBe(true)
  })
})
