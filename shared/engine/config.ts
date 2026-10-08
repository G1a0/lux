// 引擎调参集中在此文件（初始值为设计文档 2026-10-08 §5.2/§5.3 的给定值）。
import type { FactorKey, QueueId } from './types'

export type FactorWeights = Partial<Record<FactorKey, number>>

export const WEIGHTS_BY_QUEUE: Record<QueueId, FactorWeights> = {
  420: { matchup: 30, strength: 25, composition: 20, synergy: 15, beginner: 10 },
  440: { matchup: 30, strength: 25, composition: 20, synergy: 15, beginner: 10 },
  400: { matchup: 30, strength: 25, composition: 20, synergy: 15, beginner: 10 },
  430: { strength: 35, composition: 45, beginner: 20 },
  450: { strength: 40, composition: 35, beginner: 25 },
}

/** 整仓未就绪时的规则模式权重（仅保留两项） */
export const RULE_MODE_WEIGHTS: FactorWeights = { composition: 70, beginner: 30 }

export const NEUTRAL_SCORE = 50

/** 对位/协同折算：score = 50 + (winRate - 0.5) * MATCHUP_SCALE，截断 0-100 */
export const MATCHUP_SCALE = 250

/** 大乱斗强度折算（绝对）：score = 50 + (winRate - 0.5) * ARAM_WINRATE_SCALE */
export const ARAM_WINRATE_SCALE = 500

/** 阵容契合规则的加减分 */
export const COMPOSITION_DELTAS = {
  fillsMissingAP: 15,
  fillsMissingAD: 15,
  fillsMissingFrontline: 15,
  extraFrontline: -5,
  tankyVsAssassins: 10,
  squishyVsAssassins: -10,
} as const

/** 大乱斗换/留阈值（设计 §5.3） */
export const ARAM_SWAP_GAP = 8
export const ARAM_WEAK_SCORE = 55

/** 推荐展示数量：主推 1 + 备选 2 */
export const ALTERNATE_COUNT = 2
