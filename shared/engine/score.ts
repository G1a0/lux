import { toQq101Lane, type Qq101Lane } from '../positions'
import type { ChampionMeta } from '../champions/meta'
import { isFrontline } from '../champions/meta'
import { buildReason } from './reasons'
import { COMPOSITION_DELTAS, MATCHUP_SCALE, NEUTRAL_SCORE, WEIGHTS_BY_QUEUE, type FactorWeights } from './config'
import type { EngineData } from './data'
import type {
  ChampPick,
  ChampionRecommendation,
  DraftContext,
  FactorKey,
  FactorResult,
  QueueId,
  ReasonDetail,
} from './types'

const clamp = (n: number): number => Math.max(0, Math.min(100, n))
const round1 = (n: number): number => Math.round(n * 10) / 10

export interface FactorOutcome {
  score: number | null
  detail?: ReasonDetail
}

function percentile(values: number[], mine: number): number {
  if (values.length === 0) return 0.5
  return values.filter(v => v <= mine).length / values.length
}

export function scoreStrength(championId: number, lane: Qq101Lane | 'ALL', data: EngineData): FactorOutcome {
  const tierList = data.tierList(lane)
  const record = tierList?.champions.find(c => c.championId === championId)
  if (!tierList || !record || record.winRate === null) return { score: null }

  const winRates = tierList.champions.map(c => c.winRate).filter((v): v is number => v !== null)
  const pickRates = tierList.champions.map(c => c.pickRate).filter((v): v is number => v !== null)
  const winPct = percentile(winRates, record.winRate)
  const pickPct = record.pickRate === null ? 0.5 : percentile(pickRates, record.pickRate)

  return {
    score: round1(clamp(100 * (0.7 * winPct + 0.3 * pickPct))),
    detail: { kind: 'strength', winRate: record.winRate, tier: record.strengthTier },
  }
}

function matchupTargets(ctx: DraftContext): ChampPick[] {
  const atPosition = ctx.enemies.filter(e => e.position && e.position === ctx.myPosition)
  return atPosition.length > 0 ? atPosition : ctx.enemies
}

export function scoreMatchup(
  championId: number,
  lane: Qq101Lane,
  enemies: ChampPick[],
  data: EngineData,
): FactorOutcome {
  const rows = data.matchups(lane, championId)
  if (!rows) return { score: null }
  if (enemies.length === 0) return { score: NEUTRAL_SCORE }

  let best: { championId: number; winRate: number; score: number } | null = null
  let sum = 0
  for (const enemy of enemies) {
    const entry = rows.find(r => r.championId === enemy.championId)
    const score = entry && entry.winRate !== null
      ? clamp(NEUTRAL_SCORE + (entry.winRate - 0.5) * MATCHUP_SCALE)
      : NEUTRAL_SCORE
    sum += score
    if (
      entry && entry.winRate !== null &&
      (!best || Math.abs(score - NEUTRAL_SCORE) > Math.abs(best.score - NEUTRAL_SCORE))
    ) {
      best = { championId: entry.championId, winRate: entry.winRate, score }
    }
  }

  const detail: ReasonDetail | undefined = best && best.score !== NEUTRAL_SCORE
    ? { kind: 'matchup', enemyChampionId: best.championId, winRate: best.winRate }
    : undefined
  return { score: clamp(sum / enemies.length), detail }
}

export function scoreSynergy(
  championId: number,
  lane: Qq101Lane,
  allies: ChampPick[],
  data: EngineData,
): FactorOutcome {
  const rows = data.synergies(lane, championId)
  if (!rows) return { score: null }
  if (allies.length === 0) return { score: NEUTRAL_SCORE }

  let best: { championId: number; winRate: number } | null = null
  let sum = 0
  for (const ally of allies) {
    const entry = rows.find(r => r.championId === ally.championId)
    const score = entry && entry.winRate !== null
      ? clamp(NEUTRAL_SCORE + (entry.winRate - 0.5) * MATCHUP_SCALE)
      : NEUTRAL_SCORE
    sum += score
    if (entry && entry.winRate !== null && (!best || entry.winRate > best.winRate)) {
      best = { championId: entry.championId, winRate: entry.winRate }
    }
  }

  const detail: ReasonDetail | undefined = best && best.winRate > 0.5
    ? { kind: 'synergy', allyChampionId: best.championId, winRate: best.winRate }
    : undefined
  return { score: round1(clamp(sum / allies.length)), detail }
}

export function scoreComposition(championId: number, ctx: DraftContext, data: EngineData): FactorOutcome {
  const meta = data.champion(championId)
  if (!meta) return { score: null }

  const allyMetas = ctx.allies
    .map(a => data.champion(a.championId))
    .filter((m): m is ChampionMeta => m !== null)
  const enemyMetas = ctx.enemies
    .map(e => data.champion(e.championId))
    .filter((m): m is ChampionMeta => m !== null)

  const deltas: Array<{ delta: number; text: string }> = []
  const d = COMPOSITION_DELTAS

  if (allyMetas.length > 0) {
    const apCount = allyMetas.filter(m => m.damageType === 'ap').length
    const adCount = allyMetas.filter(m => m.damageType === 'ad').length
    const frontlineCount = allyMetas.filter(m => isFrontline(m)).length

    if (apCount === 0 && meta.damageType === 'ap') {
      deltas.push({ delta: d.fillsMissingAP, text: `你们缺法术伤害，${meta.name}正好补上` })
    }
    if (adCount === 0 && meta.damageType === 'ad') {
      deltas.push({ delta: d.fillsMissingAD, text: `你们缺物理伤害，${meta.name}正好补上` })
    }
    if (frontlineCount === 0 && isFrontline(meta)) {
      deltas.push({ delta: d.fillsMissingFrontline, text: `你们缺前排，${meta.name}正好补上` })
    }
    if (frontlineCount >= 2 && isFrontline(meta)) {
      deltas.push({ delta: d.extraFrontline, text: '' })
    }
  }

  const enemyAssassins = enemyMetas.filter(m => m.roles.includes('assassin')).length
  if (enemyAssassins >= 2) {
    if (isFrontline(meta)) {
      deltas.push({ delta: d.tankyVsAssassins, text: `对面刺客多，${meta.name}扛得住` })
    } else if (meta.difficulty >= 7) {
      deltas.push({ delta: d.squishyVsAssassins, text: '' })
    }
  }

  const total = deltas.reduce((acc, item) => acc + item.delta, 0)
  const bestText = deltas
    .filter(item => item.delta > 0 && item.text)
    .sort((a, b) => b.delta - a.delta)[0]?.text

  return {
    score: clamp(NEUTRAL_SCORE + total),
    detail: bestText ? { kind: 'composition', text: bestText } : undefined,
  }
}

export function scoreBeginner(
  championId: number,
  proficiency: Record<number, number> | undefined,
  data: EngineData,
): FactorOutcome {
  const meta = data.champion(championId)
  if (!meta) return { score: null }

  const difficultyScore = clamp(100 - (meta.difficulty - 1) * 7)
  const prof = proficiency?.[championId]
  const score = prof === undefined ? difficultyScore : 0.6 * difficultyScore + 0.4 * clamp(prof)

  return { score: round1(score), detail: { kind: 'beginner', difficulty: meta.difficulty } }
}

export interface ScoreOptions {
  modeLabel: string
  weights?: FactorWeights
  /** 强度来源（'ALL' 用于盲选；null 用于规则模式/大乱斗） */
  strengthLane?: Qq101Lane | 'ALL' | null
  /** 对位/协同来源（null = 不计这两个因素） */
  pairLane?: Qq101Lane | null
  /** 覆盖强度因素（大乱斗由 aram.ts 提供） */
  strengthOverride?: FactorOutcome | null
}

export function scoreChampion(
  championId: number,
  ctx: DraftContext,
  data: EngineData,
  options: ScoreOptions,
): ChampionRecommendation {
  const weights = options.weights ?? WEIGHTS_BY_QUEUE[ctx.queueId as QueueId] ?? {}
  const defaultLane = toQq101Lane(ctx.myPosition ?? '')
  const strengthLane = options.strengthLane === undefined ? defaultLane : options.strengthLane
  const pairLane = options.pairLane === undefined ? defaultLane : options.pairLane

  const outcomes: Record<FactorKey, FactorOutcome> = {
    strength: options.strengthOverride
      ?? (strengthLane ? scoreStrength(championId, strengthLane, data) : { score: null }),
    matchup: pairLane ? scoreMatchup(championId, pairLane, matchupTargets(ctx), data) : { score: null },
    synergy: pairLane ? scoreSynergy(championId, pairLane, ctx.allies, data) : { score: null },
    composition: scoreComposition(championId, ctx, data),
    beginner: scoreBeginner(championId, ctx.proficiency, data),
  }

  const factors: FactorResult[] = (Object.keys(outcomes) as FactorKey[])
    .filter(key => (weights[key] ?? 0) > 0)
    .map(key => {
      const weight = weights[key]!
      const score = outcomes[key].score
      return {
        key,
        score,
        weight,
        contribution: round1(((score ?? NEUTRAL_SCORE) / 100) * weight),
        detail: outcomes[key].detail,
      }
    })

  const weightSum = factors.reduce((acc, f) => acc + f.weight, 0)
  const total = weightSum === 0
    ? NEUTRAL_SCORE
    : clamp(factors.reduce((acc, f) => acc + (f.score ?? NEUTRAL_SCORE) * f.weight, 0) / weightSum)

  const dominant = [...factors]
    .filter(f => f.score !== null)
    .sort((a, b) => b.contribution - a.contribution)[0]
  const dominantFactor = dominant && dominant.score !== NEUTRAL_SCORE ? dominant.key : null

  return {
    championId,
    score: round1(total),
    factors,
    dominantFactor,
    reason: buildReason(
      dominantFactor ? dominant : null,
      data,
      options.modeLabel,
    ),
    partialData: factors.some(f => f.score === null),
  }
}

export function scoreAll(
  championIds: number[],
  ctx: DraftContext,
  data: EngineData,
  options: ScoreOptions,
): ChampionRecommendation[] {
  return championIds
    .map(id => scoreChampion(id, ctx, data, options))
    .sort((a, b) => b.score - a.score)
}
