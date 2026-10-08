import type { InternalPosition } from '../positions'

export type QueueId = 420 | 440 | 400 | 430 | 450

export interface ChampPick {
  championId: number
  position?: InternalPosition
}

export interface DraftContext {
  queueId: QueueId
  myPosition?: InternalPosition
  allies: ChampPick[]
  enemies: ChampPick[]
  bans?: number[]
  /** 已拥有英雄（设置开启时用于候选池过滤）；缺省 = 不过滤 */
  ownedChampionIds?: number[]
  /** 熟练度 0-100（Phase 3 由 LCU 提供）；缺省 = 无 */
  proficiency?: Record<number, number>
}

export type FactorKey = 'matchup' | 'strength' | 'composition' | 'synergy' | 'beginner'

export type ReasonDetail =
  | { kind: 'matchup'; enemyChampionId: number; winRate: number }
  | { kind: 'synergy'; allyChampionId: number; winRate: number }
  | { kind: 'strength'; winRate: number | null; tier: string }
  | { kind: 'composition'; text: string }
  | { kind: 'beginner'; difficulty: number }

export interface FactorResult {
  key: FactorKey
  /** null = 缺数据（计分按 50 中性） */
  score: number | null
  weight: number
  contribution: number
  detail?: ReasonDetail
}

export interface ChampionRecommendation {
  championId: number
  score: number
  factors: FactorResult[]
  dominantFactor: FactorKey | null
  reason: string
  /** 有任一激活因素缺数据时为 true */
  partialData: boolean
}

export interface RuneAdvice {
  keystoneId: number
  runeIds: number[]
  source: 'qq101' | 'builtin'
}

export interface SpellAdvice {
  spellIds: [number, number]
  source: 'qq101' | 'builtin'
}

export interface RiftAdvice {
  primary: ChampionRecommendation
  alternates: ChampionRecommendation[]
  runes: RuneAdvice | null
  spells: SpellAdvice | null
  /** 整仓未就绪时为 true（规则模式：仅阵容契合 + 新手友好参与评分） */
  ruleMode: boolean
}

export interface AramJudgeInput {
  current: number
  bench: number[]
  diceLeft: number
}

export interface AramJudgeResult {
  action: 'keep' | 'swap' | 'reroll'
  current: ChampionRecommendation
  bench: ChampionRecommendation[]
  swapTo: ChampionRecommendation | null
  reason: string
  /** 给「留下或换到」的那名英雄的内置大乱斗符文/技能 */
  runes: RuneAdvice | null
  spells: SpellAdvice | null
}
