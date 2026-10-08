import { describe, expect, it } from 'vitest'
import { aramRuleFor, ARAM_RULES } from './aram-rules'
import { createChampionIndex, type ChampionMeta } from './meta'

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
