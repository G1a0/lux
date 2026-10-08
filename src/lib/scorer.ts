// src/lib/scorer.ts

import type { DamageType } from '@/types/champion'
import type { InternalPosition } from '@/lib/positions'
import { getCounterScore, getSynergyScore, getMetaScore } from '@/lib/local-rules'

export interface CounterStat {
  opponentChampionId: number
  winRate: number
}

export interface SynergyStat {
  allyChampionId: number
  winRate: number
}

export interface ChampionTier {
  championId: number
  tier: string
  winRate: number | null
}

export type DataSource = 'qq101' | 'local'

export interface ChampionScore {
  championId: number
  score: number
  synergy: number
  counter: number
  meta: number
  balance: number
  tier: 'strong' | 'good' | 'neutral' | 'weak' | 'avoid'
}

export interface GameState {
  allyPicks: number[]
  enemyPicks: number[]
  allyBans: number[]
  enemyBans: number[]
  bannedIds: number[]
  availableIds: number[]
  assignedPosition: InternalPosition | ''
  queueId: number
}

const TIER_SCORES: Record<string, number> = { T0: 100, T1: 90, T2: 78, T3: 62, T4: 48 }

function damageWeight(type: DamageType | undefined): { ap: number; ad: number } {
  if (type === 'ap') return { ap: 1, ad: 0 }
  if (type === 'ad') return { ap: 0, ad: 1 }
  if (type === 'mixed') return { ap: 0.5, ad: 0.5 }
  return { ap: 0, ad: 0 }
}

function computeBalanceScore(
  championId: number,
  allyPicks: number[],
  damageTypes: Map<number, DamageType>,
): number {
  let ap = 0
  let ad = 0
  for (const pick of allyPicks) {
    const weight = damageWeight(damageTypes.get(pick))
    ap += weight.ap
    ad += weight.ad
  }
  const own = damageWeight(damageTypes.get(championId))
  ap += own.ap
  ad += own.ad

  const total = ap + ad
  if (total === 0) return 50

  const apRatio = ap / total
  if (apRatio >= 0.4 && apRatio <= 0.6) return 100
  if (apRatio === 1 || apRatio === 0) return 30
  return 65
}

function findCounterWinRate(counters: CounterStat[] | undefined, enemyId: number): number | null {
  const stat = counters?.find(c => c.opponentChampionId === enemyId)
  return stat ? stat.winRate : null
}

function findSynergyWinRate(synergies: SynergyStat[] | undefined, allyId: number): number | null {
  const stat = synergies?.find(s => s.allyChampionId === allyId)
  return stat ? stat.winRate : null
}

export function scoreAllChampions(
  state: GameState,
  counters: Map<number, CounterStat[]>,
  synergies: Map<number, SynergyStat[]>,
  tiers: Map<number, ChampionTier>,
  damageTypes: Map<number, DamageType>,
  dataSource: DataSource,
): ChampionScore[] {
  const results: ChampionScore[] = []

  for (const championId of state.availableIds) {
    if (state.allyPicks.includes(championId) || state.enemyPicks.includes(championId)) continue
    if (state.bannedIds.includes(championId)) continue

    let synergyScore = 0
    let counterScore = 0
    let metaScore = 0

    if (dataSource === 'qq101') {
      const championCounters = counters.get(championId)
      const championSynergies = synergies.get(championId)

      for (const allyId of state.allyPicks) {
        const wr = findSynergyWinRate(championSynergies, allyId)
        synergyScore += wr !== null ? wr * 100 : 50
      }
      synergyScore = state.allyPicks.length > 0 ? synergyScore / state.allyPicks.length : 50

      for (const enemyId of state.enemyPicks) {
        const wr = findCounterWinRate(championCounters, enemyId)
        counterScore += wr !== null ? wr * 100 : 50
      }
      counterScore = state.enemyPicks.length > 0 ? counterScore / state.enemyPicks.length : 50

      const tier = tiers.get(championId)
      metaScore = tier ? TIER_SCORES[tier.tier] ?? 50 : 50
    } else {
      for (const allyId of state.allyPicks) {
        synergyScore += getSynergyScore(championId, allyId)
      }
      synergyScore = state.allyPicks.length > 0 ? synergyScore / state.allyPicks.length : 50

      for (const enemyId of state.enemyPicks) {
        counterScore += getCounterScore(championId, enemyId)
      }
      counterScore = state.enemyPicks.length > 0 ? counterScore / state.enemyPicks.length : 50

      metaScore = getMetaScore(championId)
    }

    const balanceScore = computeBalanceScore(championId, state.allyPicks, damageTypes)
    const score = synergyScore * 0.35 + counterScore * 0.35 + metaScore * 0.2 + balanceScore * 0.1

    results.push({
      championId,
      score: Math.round(score),
      synergy: Math.round(synergyScore),
      counter: Math.round(counterScore),
      meta: Math.round(metaScore),
      balance: Math.round(balanceScore),
      tier: classifyScore(score),
    })
  }

  results.sort((a, b) => b.score - a.score)
  return results
}

function classifyScore(score: number): ChampionScore['tier'] {
  if (score >= 80) return 'strong'
  if (score >= 65) return 'good'
  if (score >= 45) return 'neutral'
  if (score >= 30) return 'weak'
  return 'avoid'
}
