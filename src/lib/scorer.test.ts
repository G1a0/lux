import { describe, expect, it } from 'vitest'
import { scoreAllChampions, type ChampionTier, type CounterStat, type SynergyStat, type GameState } from '@/lib/scorer'
import type { DamageType } from '@/types/champion'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    allyPicks: [],
    enemyPicks: [],
    allyBans: [],
    enemyBans: [],
    bannedIds: [],
    availableIds: [1, 2, 3],
    assignedPosition: '',
    queueId: 420,
    ...overrides,
  }
}

const noDamage = new Map<number, DamageType>()

describe('scoreAllChampions', () => {
  it('returns neutral scores without external data', () => {
    const scores = scoreAllChampions(makeState(), new Map(), new Map(), new Map(), noDamage, 'local')
    expect(scores).toHaveLength(3)
    for (const s of scores) {
      expect(s.synergy).toBe(50)
      expect(s.counter).toBe(50)
      expect(s.meta).toBe(50)
      expect(s.balance).toBe(50)
    }
  })

  it('uses counter stats against enemy picks', () => {
    const counters = new Map<number, CounterStat[]>([
      [1, [{ opponentChampionId: 99, winRate: 0.55 }]],
    ])
    const state = makeState({ enemyPicks: [99] })
    const scores = scoreAllChampions(state, counters, new Map(), new Map(), noDamage, 'qq101')
    const target = scores.find(s => s.championId === 1)!
    expect(target.counter).toBe(55)
  })

  it('uses synergy stats with ally picks', () => {
    const synergies = new Map<number, SynergyStat[]>([
      [1, [{ allyChampionId: 99, winRate: 0.53 }]],
    ])
    const state = makeState({ allyPicks: [99] })
    const scores = scoreAllChampions(state, new Map(), synergies, new Map(), noDamage, 'qq101')
    const target = scores.find(s => s.championId === 1)!
    expect(target.synergy).toBe(53)
  })

  it('maps strength tiers to meta scores', () => {
    const tiers = new Map<number, ChampionTier>([
      [1, { championId: 1, tier: 'T0', winRate: 0.54 }],
      [2, { championId: 2, tier: 'T3', winRate: 0.48 }],
      [3, { championId: 3, tier: 'T9', winRate: 0.5 }],
    ])
    const scores = scoreAllChampions(makeState(), new Map(), new Map(), tiers, noDamage, 'qq101')
    expect(scores.find(s => s.championId === 1)!.meta).toBe(100)
    expect(scores.find(s => s.championId === 2)!.meta).toBe(62)
    expect(scores.find(s => s.championId === 3)!.meta).toBe(50)
  })

  it('penalizes all-AP or all-AD compositions and treats mixed as half', () => {
    const types = new Map<number, DamageType>([
      [1, 'ap'],
      [2, 'ad'],
      [3, 'mixed'],
      [99, 'ap'],
    ])
    const state = makeState({ allyPicks: [99] })
    const scores = scoreAllChampions(state, new Map(), new Map(), new Map(), types, 'qq101')
    expect(scores.find(s => s.championId === 1)!.balance).toBe(30)
    expect(scores.find(s => s.championId === 3)!.balance).toBe(65)
    expect(scores.find(s => s.championId === 2)!.balance).toBe(100)
  })

  it('filters out picks and bans from candidates', () => {
    const state = makeState({ allyPicks: [1], bannedIds: [2] })
    const scores = scoreAllChampions(state, new Map(), new Map(), new Map(), noDamage, 'qq101')
    expect(scores.map(s => s.championId)).toEqual([3])
  })

  it('sorts by score descending', () => {
    const tiers = new Map<number, ChampionTier>([
      [3, { championId: 3, tier: 'T0', winRate: 0.55 }],
    ])
    const scores = scoreAllChampions(makeState(), new Map(), new Map(), tiers, noDamage, 'qq101')
    expect(scores[0].championId).toBe(3)
  })
})
