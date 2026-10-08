import type { Qq101Lane } from '../positions'
import { ALTERNATE_COUNT, RULE_MODE_WEIGHTS, WEIGHTS_BY_QUEUE } from './config'
import { buildCandidatePool, toQq101Lane } from './candidates'
import type { EngineData } from './data'
import { scoreAll } from './score'
import type {
  DraftContext,
  QueueId,
  RiftAdvice,
  RuneAdvice,
  SpellAdvice,
} from './types'

const MODE_LABELS: Record<QueueId, string> = {
  420: '排位', 440: '排位', 400: '征召', 430: '匹配', 450: '大乱斗',
}

export function recommendRift(ctx: DraftContext, data: EngineData): RiftAdvice {
  const isBlind = ctx.queueId === 430
  const lane = isBlind ? null : toQq101Lane(ctx.myPosition)
  const strengthLane: Qq101Lane | 'ALL' = isBlind || lane === null ? 'ALL' : lane
  const ruleMode = data.tierList(strengthLane) === null

  const pool = buildCandidatePool(ctx, data)
  if (pool.length === 0) {
    throw new Error('候选池为空：请检查英雄字典与榜单数据')
  }

  const ranked = scoreAll(pool, ctx, data, {
    modeLabel: MODE_LABELS[ctx.queueId] ?? '对局',
    weights: ruleMode ? RULE_MODE_WEIGHTS : WEIGHTS_BY_QUEUE[ctx.queueId],
    strengthLane: ruleMode ? null : strengthLane,
    pairLane: ruleMode || isBlind ? null : lane,
  })

  const [primary, ...rest] = ranked

  let runes: RuneAdvice | null = null
  let spells: SpellAdvice | null = null
  if (!ruleMode && lane) {
    const pages = data.runes(lane, primary.championId)
    if (pages && pages.length > 0) {
      runes = { keystoneId: pages[0].keystoneId, runeIds: pages[0].runeIds, source: 'qq101' }
    }
    const combos = data.spells(lane, primary.championId)
    if (combos && combos.length > 0) {
      spells = { spellIds: combos[0].spellIds, source: 'qq101' }
    }
  }

  return {
    primary,
    alternates: rest.slice(0, ALTERNATE_COUNT),
    runes,
    spells,
    ruleMode,
  }
}
