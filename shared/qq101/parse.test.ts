import { describe, expect, it } from 'vitest'
import {
  extractQq101Inner,
  parseQq101Versions,
  parseQq101TierList,
  parseQq101Matchups,
  parseQq101Synergies,
  parseQq101RunePages,
  parseQq101SpellCombos,
  parseQq101AramOverview,
} from './parse'
import versionlistFixture from './fixtures/versionlist.json'
import tierlistFixture from './fixtures/tierlist-all.json'
import confrontFixture from './fixtures/confront-84-middle.json'
import partnerFixture from './fixtures/partner-84-middle.json'
import runeinfoFixture from './fixtures/recon-runeinfo-84-mid-20261008.json'
import skillFixture from './fixtures/recon-skill-84-mid-20261008.json'
import aramFixture from './fixtures/recon-aram-hero-overview-20261008.json'

describe('extractQq101Inner', () => {
  it('extracts the inner JSON string from data.result', () => {
    const response = { code: 0, data: { result: '{"a":1}' } }
    expect(extractQq101Inner(response)).toBe('{"a":1}')
  })

  it('falls back to _fieldValues', () => {
    const response = { code: 0, data: { _fieldValues: { R17968: '{"b":2}' } } }
    expect(extractQq101Inner(response)).toBe('{"b":2}')
  })

  it('returns null on non-zero code or missing payload', () => {
    expect(extractQq101Inner({ code: 1, data: { result: '{}' } })).toBeNull()
    expect(extractQq101Inner({ code: 0, data: { result: '' } })).toBeNull()
    expect(extractQq101Inner(null)).toBeNull()
    expect(extractQq101Inner('nope')).toBeNull()
  })
})

describe('parseQq101Versions', () => {
  it('parses patch names from fixture', () => {
    const versions = parseQq101Versions(versionlistFixture)
    expect(versions[0]).toBe('16.19')
    expect(versions.length).toBeGreaterThan(5)
  })

  it('returns empty array on malformed input', () => {
    expect(parseQq101Versions({ code: 0, data: 'nope' })).toEqual([])
  })
})

describe('parseQq101TierList', () => {
  it('parses fixture records', () => {
    const { date, champions } = parseQq101TierList(tierlistFixture)
    expect(date).toBe('20261007')
    expect(champions.length).toBeGreaterThan(100)
  })

  it('parses champion 112 (Viktor) record precisely', () => {
    const { champions } = parseQq101TierList(tierlistFixture)
    const viktor = champions.find(c => c.championId === 112)
    expect(viktor).toBeDefined()
    expect(viktor!.strengthTier).toBe('T1')
    expect(viktor!.position).toBe('mid')
    expect(viktor!.winRate).toBeCloseTo(0.5233, 4)
    expect(viktor!.pickRate).toBeCloseTo(0.0853, 4)
    expect(viktor!.counterChampionIds).toEqual([101, 84, 805])
  })

  it('returns empty result on malformed input', () => {
    expect(parseQq101TierList({ code: 1 })).toEqual({ date: '', champions: [] })
    expect(parseQq101TierList({ code: 0, data: { result: 'not json' } })).toEqual({ date: '', champions: [] })
  })
})

describe('parseQq101Matchups', () => {
  it('parses favorable and unfavorable matchups from fixture', () => {
    const matchups = parseQq101Matchups(confrontFixture)
    const cassio = matchups.find(m => m.championId === 69)
    expect(cassio).toBeDefined()
    expect(cassio!.favorable).toBe(true)
    expect(cassio!.winRate).toBeCloseTo(0.5646, 4)

    const vex = matchups.find(m => m.championId === 711)
    expect(vex).toBeDefined()
    expect(vex!.favorable).toBe(false)
    expect(vex!.winRate).toBeCloseTo(0.431, 4)
  })

  it('returns empty array on malformed input', () => {
    expect(parseQq101Matchups({ code: 1 })).toEqual([])
    expect(parseQq101Matchups({ code: 0, data: { result: '' } })).toEqual([])
  })
})

describe('parseQq101Synergies', () => {
  it('parses synergies from fixture', () => {
    const synergies = parseQq101Synergies(partnerFixture)
    expect(synergies.length).toBeGreaterThan(0)
    const lillia = synergies.find(s => s.championId === 876)
    expect(lillia).toBeDefined()
    expect(lillia!.winRate).toBeCloseTo(0.5413, 4)
    expect(lillia!.games).toBe(6285)
  })

  it('returns empty array on malformed input', () => {
    expect(parseQq101Synergies({ code: 1 })).toEqual([])
  })
})

describe('parseQq101RunePages', () => {
  it('解析符文页并按序号排序（fixture 响应内乱序）', () => {
    const pages = parseQq101RunePages(runeinfoFixture)
    expect(pages).toHaveLength(12)
    const top = pages[0]
    expect(top.rank).toBe(1)
    expect(top.keystoneId).toBe(8112)
    expect(top.subStyleCode).toBe('jj')
    expect(top.runeIds).toEqual([8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001])
    expect(top.pickRate).toBeCloseTo(0.4415, 4)
    expect(top.winRate).toBeCloseTo(0.4782, 4)
    expect(top.games).toBe(154640)
    const ranks = pages.map(p => p.rank)
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it('畸形输入返回空数组', () => {
    expect(parseQq101RunePages({ code: 1 })).toEqual([])
    expect(parseQq101RunePages({ code: 0, data: { result: 'not json' } })).toEqual([])
  })
})

describe('parseQq101SpellCombos', () => {
  it('解析技能组合并按登场率降序（fixture：点燃+闪现 90.6% 应在前）', () => {
    const combos = parseQq101SpellCombos(skillFixture)
    expect(combos).toHaveLength(2)
    expect(combos[0].spellIds).toEqual([14, 4])
    expect(combos[0].winRate).toBeCloseTo(0.4877, 4)
    expect(combos[0].pickRate).toBeCloseTo(0.906, 4)
    expect(combos[1].spellIds).toEqual([12, 4])
  })

  it('畸形输入返回空数组', () => {
    expect(parseQq101SpellCombos({ code: 1 })).toEqual([])
  })
})

describe('parseQq101AramOverview', () => {
  it('解析大乱斗英雄总览（fixture 173 条，首条为排名第 1）', () => {
    const heroes = parseQq101AramOverview(aramFixture)
    expect(heroes).toHaveLength(173)
    const first = heroes[0]
    expect(first.championId).toBe(22)
    expect(first.rank).toBe(1)
    expect(first.rankChange).toBe('未变化')
    expect(first.winRate).toBeCloseTo(0.5456, 4)
    expect(first.pickRate).toBeCloseTo(0.1539, 4)
    expect(first.bestPartners.length).toBeGreaterThan(10)
    expect(first.bestPartners[0]).toEqual({ championId: 25, pickRate: 0.0616, winRate: 0.5897, rank: 1 })
    expect(first.avgDeathTime).toBeCloseTo(233.001, 3)
    expect(first.avgParticipation).toBeCloseTo(0.6663, 4)
    expect(first.avgDamageRatio).toBeCloseTo(0.2108, 4)
    expect(first.avgTankRatio).toBeCloseTo(0.1654, 4)
  })

  it('畸形输入返回空数组', () => {
    expect(parseQq101AramOverview({ code: 1 })).toEqual([])
  })
})

describe('解析器健壮性（审查补充）', () => {
  it('截断记录被丢弃（长度/必填字段守卫）', () => {
    expect(parseQq101RunePages({ code: 0, data: { result: JSON.stringify({ rune_top_details: '1_8112_jj_1,2,3' }) } })).toEqual([])
    expect(parseQq101SpellCombos({ code: 0, data: { result: JSON.stringify({ data_details: '12_4_46.77' }) } })).toEqual([])
    expect(parseQq101AramOverview({ code: 0, data: { result: JSON.stringify({ listcollect: '22' }) } })).toEqual([])
  })

  it('大乱斗兼容 | 分隔与旧版 11 字段记录（只取 s0–s9）', () => {
    const eleven = '22_1_未变化_0.5_0.1_25,0.01,0.5,1_200_0.6_0.2_0.1_999,888'
    const one = parseQq101AramOverview({ code: 0, data: { result: JSON.stringify({ listcollect: eleven }) } })
    expect(one).toHaveLength(1)
    expect(one[0].championId).toBe(22)
    expect(one[0].rank).toBe(1)
    const two = parseQq101AramOverview({ code: 0, data: { result: JSON.stringify({ listcollect: `${eleven}|${eleven}` }) } })
    expect(two).toHaveLength(2)
  })
})
