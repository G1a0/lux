// src/lib/candidates.ts
// 纯函数：会话 → 对局状态；tier 榜 → 候选列表/位置表；QQ101 原始数据 → 评分输入

import type { ChampSelectSession } from '@/types/lcu'
import type { GameState, CounterStat, SynergyStat, ChampionTier } from '@/lib/scorer'
import type { Qq101TierRecord, Qq101Matchup, Qq101Synergy } from '@/lib/qq101'
import { normalizeLcuPosition, type InternalPosition } from '@/lib/positions'

export const SR_QUEUE_IDS = new Set([400, 420, 430, 440, 480])

export function extractGameState(session: ChampSelectSession, availableIds: number[]): GameState {
  const allyPicks = session.myTeam.filter(p => p.championId > 0).map(p => p.championId)
  const enemyPicks = session.theirTeam.filter(p => p.championId > 0).map(p => p.championId)
  const allyBans = session.bans?.myTeamBans ?? []
  const enemyBans = session.bans?.theirTeamBans ?? []
  const myPlayer = session.myTeam.find(p => p.cellId === session.localPlayerCellId)
  const bannedIds = [...new Set([...allyBans, ...enemyBans])]

  return {
    allyPicks,
    enemyPicks,
    allyBans,
    enemyBans,
    bannedIds,
    availableIds: availableIds.filter(
      id => !allyPicks.includes(id) && !enemyPicks.includes(id) && !bannedIds.includes(id),
    ),
    assignedPosition: normalizeLcuPosition(myPlayer?.assignedPosition),
    queueId: session.queueId,
  }
}

export function pickCandidates(
  availableIds: number[],
  tierChampions: Qq101TierRecord[],
  position: InternalPosition | '',
  limit = 20,
): number[] {
  const available = new Set(availableIds)
  const ordered = [...tierChampions].sort(
    (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER),
  )

  const picked: number[] = []
  const seen = new Set<number>()
  for (const record of ordered) {
    if (!available.has(record.championId) || seen.has(record.championId)) continue
    if (position && record.position !== position) continue
    seen.add(record.championId)
    picked.push(record.championId)
    if (picked.length >= limit) break
  }
  return picked
}

export function findBestTierRecord(
  tierChampions: Qq101TierRecord[],
  championId: number,
  position: InternalPosition | '',
): Qq101TierRecord | null {
  let best: Qq101TierRecord | null = null
  for (const record of tierChampions) {
    if (record.championId !== championId) continue
    if (position && record.position !== position) continue
    if (!best || (record.rank ?? Number.MAX_SAFE_INTEGER) < (best.rank ?? Number.MAX_SAFE_INTEGER)) {
      best = record
    }
  }
  return best
}

export function buildPositionsMap(tierChampions: Qq101TierRecord[]): Map<number, InternalPosition[]> {
  const map = new Map<number, InternalPosition[]>()
  for (const record of tierChampions) {
    if (!record.position) continue
    const list = map.get(record.championId) ?? []
    if (!list.includes(record.position)) list.push(record.position)
    map.set(record.championId, list)
  }
  return map
}

export function toChampionTier(record: Qq101TierRecord): ChampionTier {
  return { championId: record.championId, tier: record.strengthTier, winRate: record.winRate }
}

export function toCounterStats(matchups: Qq101Matchup[]): CounterStat[] {
  return matchups.flatMap(m =>
    m.winRate === null ? [] : [{ opponentChampionId: m.championId, winRate: m.winRate }],
  )
}

export function toSynergyStats(synergies: Qq101Synergy[]): SynergyStat[] {
  return synergies.flatMap(s =>
    s.winRate === null ? [] : [{ allyChampionId: s.championId, winRate: s.winRate }],
  )
}
