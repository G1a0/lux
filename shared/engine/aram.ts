// 大乱斗换/留/掷骰子判定：对「当前 + 备战席」用大乱斗权重评分；
// 强度用大乱斗榜的绝对折算（相对百分位在这里没有意义：名次总有人第一）。
import { aramRuleFor } from '../champions/aram-rules'
import { createChampionIndex, type ChampionMeta } from '../champions/meta'
import { ARAM_SWAP_GAP, ARAM_WEAK_SCORE, ARAM_WINRATE_SCALE, WEIGHTS_BY_QUEUE } from './config'
import type { EngineData } from './data'
import { scoreChampion, type FactorOutcome } from './score'
import type { AramJudgeInput, AramJudgeResult, ChampionRecommendation, DraftContext } from './types'

const METRICS_CLAMP = (n: number): number => Math.max(0, Math.min(100, n))

export function scoreAramStrength(championId: number, data: EngineData): FactorOutcome {
  const heroes = data.aramOverview()
  if (!heroes || heroes.length === 0) return { score: null }
  const record = heroes.find(h => h.championId === championId)
  if (!record || record.winRate === null) return { score: null }
  return {
    score: Math.round(METRICS_CLAMP(50 + (record.winRate - 0.5) * ARAM_WINRATE_SCALE) * 10) / 10,
    detail: { kind: 'strength', winRate: record.winRate, tier: '' },
  }
}

export function judgeAram(input: AramJudgeInput, data: EngineData): AramJudgeResult {
  const ctx: DraftContext = {
    queueId: 450,
    allies: (input.allies ?? []).map(championId => ({ championId })),
    enemies: (input.enemies ?? []).map(championId => ({ championId })),
  }
  const weights = WEIGHTS_BY_QUEUE[450]

  const scoreOf = (championId: number): ChampionRecommendation =>
    scoreChampion(championId, ctx, data, {
      modeLabel: '大乱斗',
      weights,
      strengthLane: null,
      pairLane: null,
      strengthOverride: scoreAramStrength(championId, data),
    })

  const current = scoreOf(input.current)
  const bench = input.bench.map(scoreOf).sort((a, b) => b.score - a.score)
  const bestBench = bench[0] ?? null

  let action: AramJudgeResult['action'] = 'keep'
  let swapTo: ChampionRecommendation | null = null

  if (bestBench && bestBench.championId !== input.current && bestBench.score - current.score >= ARAM_SWAP_GAP) {
    action = 'swap'
    swapTo = bestBench
  } else if (input.diceLeft > 0 && Math.max(current.score, bestBench?.score ?? -1) < ARAM_WEAK_SCORE) {
    action = 'reroll'
  }

  const chosenId = action === 'swap' && swapTo ? swapTo.championId : input.current
  const index = createChampionIndex(
    [input.current, ...input.bench]
      .map(id => data.champion(id))
      .filter((m): m is ChampionMeta => m !== null),
  )
  const rule = aramRuleFor(chosenId, index)

  const nameOf = (id: number): string => data.champion(id)?.name ?? `英雄${id}`
  const reason =
    action === 'swap' && swapTo
      ? `建议换 ${nameOf(swapTo.championId)}：${swapTo.reason}`
      : action === 'reroll'
        ? '手里英雄都不强，建议掷骰子'
        : `留着 ${nameOf(current.championId)}：手里最好`

  return {
    action,
    current,
    bench,
    swapTo,
    reason,
    runes: { keystoneId: rule.keystoneId, runeIds: [...rule.runeIds], source: 'builtin' },
    spells: { spellIds: [...rule.spellIds] as [number, number], source: 'builtin' },
  }
}
