// src/lib/scorer.ts

import type { OpggChampionTier, OpggCounterStats, OpggSynergyStats } from '@/lib/opgg-api'
import { getCounterScore, getSynergyScore, getMetaScore } from '@/lib/local-rules'

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
  assignedPosition: string
  queueId: number
}

function computeBalanceScore(
  championId: number,
  allyPicks: number[],
  damageTypes: Record<string, string>,
): number {
  let apCount = 0
  let adCount = 0

  for (const pick of allyPicks) {
    const type = damageTypes[String(pick)] ?? 'ad'
    if (type === 'ap') apCount++
    else adCount++
  }

  const newType = damageTypes[String(championId)] ?? 'ad'
  if (newType === 'ap') apCount++
  else adCount++

  const total = apCount + adCount
  if (total === 0) return 50

  const apRatio = apCount / total
  if (apRatio >= 0.4 && apRatio <= 0.6) return 100
  if (apRatio === 1 || apRatio === 0) return 30
  return 65
}

function findOpggCounterWinRate(counters: OpggCounterStats[], enemyId: number): number | null {
  const c = counters.find(c => c.opponentChampionId === enemyId)
  return c ? c.winRate : null
}

function findOpggSynergyWinRate(synergies: OpggSynergyStats[], allyId: number): number | null {
  const s = synergies.find(s => s.allyChampionId === allyId)
  return s ? s.winRate : null
}

export function scoreAllChampions(
  state: GameState,
  opggCounters: Map<number, OpggCounterStats[]>,
  opggSynergies: Map<number, OpggSynergyStats[]>,
  opggTiers: Map<number, OpggChampionTier>,
  damageTypes: Record<string, string>,
  useOpgg: boolean,
): ChampionScore[] {
  const results: ChampionScore[] = []

  for (const championId of state.availableIds) {
    if (state.allyPicks.includes(championId) || state.enemyPicks.includes(championId)) continue
    if (state.bannedIds.includes(championId)) continue

    let synergyScore = 0
    let counterScore = 0
    let metaScore = 0

    if (useOpgg) {
      const counters = opggCounters.get(championId)
      const synergies = opggSynergies.get(championId)
      const tier = opggTiers.get(championId)

      for (const allyId of state.allyPicks) {
        const wr = synergies ? findOpggSynergyWinRate(synergies, allyId) : null
        synergyScore += wr !== null ? wr * 100 : 50
      }
      synergyScore = state.allyPicks.length > 0
        ? synergyScore / state.allyPicks.length
        : 50

      for (const enemyId of state.enemyPicks) {
        const wr = counters ? findOpggCounterWinRate(counters, enemyId) : null
        counterScore += wr !== null ? wr * 100 : 50
      }
      counterScore = state.enemyPicks.length > 0
        ? counterScore / state.enemyPicks.length
        : 50

      if (tier) {
        const tierScores: Record<string, number> = { Tier1: 95, Tier2: 80, Tier3: 60, Tier4: 40, Tier5: 20, OP: 100 }
        metaScore = tierScores[tier.tier] ?? 50
      } else {
        metaScore = 50
      }
    } else {
      for (const allyId of state.allyPicks) {
        synergyScore += getSynergyScore(championId, allyId)
      }
      synergyScore = state.allyPicks.length > 0
        ? synergyScore / state.allyPicks.length
        : 50

      for (const enemyId of state.enemyPicks) {
        counterScore += getCounterScore(championId, enemyId)
      }
      counterScore = state.enemyPicks.length > 0
        ? counterScore / state.enemyPicks.length
        : 50

      metaScore = getMetaScore(championId)
    }

    const balanceScore = computeBalanceScore(championId, state.allyPicks, damageTypes)

    const score = synergyScore * 0.35 + counterScore * 0.35 + metaScore * 0.20 + balanceScore * 0.10

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
