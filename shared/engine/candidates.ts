import { toQq101Lane as positionToLane, type InternalPosition, type Qq101Lane } from '../positions'
import type { EngineData } from './data'
import type { DraftContext } from './types'

export function toQq101Lane(position: InternalPosition | undefined): Qq101Lane | null {
  return position ? positionToLane(position) : null
}

export function buildCandidatePool(ctx: DraftContext, data: EngineData): number[] {
  const isBlind = ctx.queueId === 430
  const lane = isBlind ? ('ALL' as const) : toQq101Lane(ctx.myPosition)
  const tierList = lane ? data.tierList(lane) : null
  const base = tierList ? [...new Set(tierList.champions.map(c => c.championId))] : allChampionIds(data)

  const exclude = new Set<number>([
    ...ctx.allies.map(p => p.championId),
    ...ctx.enemies.map(p => p.championId),
    ...(ctx.bans ?? []),
    ...(ctx.myChampionId === undefined ? [] : [ctx.myChampionId]),
  ])

  let pool = base.filter(id => !exclude.has(id))

  if (ctx.ownedChampionIds && ctx.ownedChampionIds.length > 0) {
    const owned = new Set(ctx.ownedChampionIds)
    pool = pool.filter(id => owned.has(id))
  }

  return pool
}

function allChampionIds(data: EngineData): number[] {
  // 1..999 覆盖全部现行英雄 id（最大 ≈950）；Phase 3 接入 LCU 字典时改为注入完整清单。
  const ids: number[] = []
  for (let id = 1; id <= 999; id++) {
    if (data.champion(id)) ids.push(id)
  }
  return ids
}
