import { describe, expect, it } from 'vitest'
import { extractGameState, pickCandidates, buildPositionsMap, toCounterStats, toSynergyStats } from '@/lib/candidates'
import type { ChampSelectSession } from '@/types/lcu'
import type { Qq101TierRecord } from '@/lib/qq101'

function makeSession(overrides: Partial<ChampSelectSession> = {}): ChampSelectSession {
  return {
    id: 'session-1',
    localPlayerCellId: 0,
    myTeam: [
      { assignedPosition: 'middle', cellId: 0, championId: 0, championPickIntent: 0, gameName: 'me', summonerId: 1, puuid: 'p1', team: 1, spell1Id: 4, spell2Id: 14 },
      { assignedPosition: 'jungle', cellId: 1, championId: 64, championPickIntent: 0, gameName: 'jg', summonerId: 2, puuid: 'p2', team: 1, spell1Id: 4, spell2Id: 11 },
    ],
    theirTeam: [
      { assignedPosition: 'middle', cellId: 5, championId: 103, championPickIntent: 0, gameName: 'enemy', summonerId: 3, puuid: 'p3', team: 2, spell1Id: 4, spell2Id: 14 },
    ],
    bans: { myTeamBans: [1], theirTeamBans: [2], numBans: 10 },
    queueId: 420,
    timer: { adjustedTimeLeftInPhase: 20000, internalNowInEpochMs: 0, isInfinite: false, phase: 'BAN_PICK', totalTimeInPhase: 30000 },
    ...overrides,
  } as ChampSelectSession
}

describe('extractGameState', () => {
  it('normalizes position and extracts picks/bans', () => {
    const state = extractGameState(makeSession(), [5, 6, 7, 64, 103, 1])
    expect(state.assignedPosition).toBe('mid')
    expect(state.allyPicks).toEqual([64])
    expect(state.enemyPicks).toEqual([103])
    expect(state.bannedIds).toEqual([1, 2])
    expect(state.availableIds).toEqual([5, 6, 7])
    expect(state.queueId).toBe(420)
  })

  it('handles unknown assigned position', () => {
    const session = makeSession({
      myTeam: [
        { assignedPosition: '', cellId: 0, championId: 0, championPickIntent: 0, gameName: 'me', summonerId: 1, puuid: 'p1', team: 1, spell1Id: 4, spell2Id: 14 },
      ],
    } as Partial<ChampSelectSession>)
    expect(extractGameState(session, []).assignedPosition).toBe('')
  })
})

describe('pickCandidates', () => {
  const records: Qq101TierRecord[] = [
    { rank: 3, championId: 10, strengthTier: 'T1', position: 'mid', winRate: 0.52, pickRate: 0.08, banRate: 0.1, counterChampionIds: [] },
    { rank: 1, championId: 11, strengthTier: 'T0', position: 'mid', winRate: 0.54, pickRate: 0.09, banRate: 0.2, counterChampionIds: [] },
    { rank: 2, championId: 12, strengthTier: 'T1', position: 'top', winRate: 0.53, pickRate: 0.07, banRate: 0.05, counterChampionIds: [] },
  ]

  it('filters by position and orders by rank', () => {
    expect(pickCandidates([10, 11, 12], records, 'mid')).toEqual([11, 10])
  })

  it('includes all positions when position unknown', () => {
    expect(pickCandidates([10, 11, 12], records, '')).toEqual([11, 12, 10])
  })

  it('only returns pickable champions and respects limit', () => {
    expect(pickCandidates([10, 11], records, 'mid', 1)).toEqual([11])
    expect(pickCandidates([12], records, 'mid')).toEqual([])
  })
})

describe('buildPositionsMap', () => {
  it('collects distinct positions per champion', () => {
    const records: Qq101TierRecord[] = [
      { rank: 1, championId: 84, strengthTier: 'T1', position: 'mid', winRate: null, pickRate: null, banRate: null, counterChampionIds: [] },
      { rank: 2, championId: 84, strengthTier: 'T2', position: 'top', winRate: null, pickRate: null, banRate: null, counterChampionIds: [] },
    ]
    expect(buildPositionsMap(records).get(84)).toEqual(['mid', 'top'])
  })
})

describe('stat conversions', () => {
  it('toCounterStats keeps only entries with winRate', () => {
    expect(toCounterStats([
      { championId: 711, winRate: 0.431, favorable: false },
      { championId: 1, winRate: null, favorable: true },
    ])).toEqual([{ opponentChampionId: 711, winRate: 0.431 }])
  })

  it('toSynergyStats keeps only entries with winRate', () => {
    expect(toSynergyStats([
      { championId: 876, winRate: 0.5413, games: 6285 },
      { championId: 2, winRate: null, games: null },
    ])).toEqual([{ allyChampionId: 876, winRate: 0.5413 }])
  })
})
