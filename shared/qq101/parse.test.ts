import { describe, expect, it } from 'vitest'
import {
  extractQq101Inner,
  parseQq101Versions,
  parseQq101TierList,
  parseQq101Matchups,
  parseQq101Synergies,
} from './parse'
import versionlistFixture from './fixtures/versionlist.json'
import tierlistFixture from './fixtures/tierlist-all.json'
import confrontFixture from './fixtures/confront-84-middle.json'
import partnerFixture from './fixtures/partner-84-middle.json'

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
