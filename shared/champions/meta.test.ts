import { describe, expect, it } from 'vitest'
import { createChampionIndex, isFrontline, type ChampionMeta } from './meta'

const SAMPLE: ChampionMeta[] = [
  { id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 },
  { id: 57, name: '茂凯', damageType: 'ap', roles: ['tank'], difficulty: 3 },
  { id: 99, name: '拉克丝', damageType: 'ap', roles: ['mage', 'support'], difficulty: 4 },
]

describe('createChampionIndex', () => {
  it('按 id 查询与遍历', () => {
    const index = createChampionIndex(SAMPLE)
    expect(index.get(57)?.name).toBe('茂凯')
    expect(index.get(9999)).toBeNull()
    expect(index.all().map(c => c.id)).toEqual([84, 57, 99])
  })
})

describe('isFrontline', () => {
  it('坦克与战士视为前排；空值返回 false', () => {
    expect(isFrontline(SAMPLE[1])).toBe(true)
    expect(isFrontline(SAMPLE[0])).toBe(false)
    expect(isFrontline({ id: 1, name: 'x', damageType: 'ad', roles: ['fighter'], difficulty: 5 })).toBe(true)
    expect(isFrontline(null)).toBe(false)
  })
})
