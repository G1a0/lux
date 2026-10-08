// LCU 数据契约：移植自已验证的归档实现（archive/pengu-loader-plugin:src/types/lcu.ts），
// 仅保留本阶段所需部分。

export interface ChampSelectPlayer {
  assignedPosition: string
  cellId: number
  championId: number
  championPickIntent: number
  summonerId: number
  puuid: string
  team: number
  spell1Id: number
  spell2Id: number
}

export interface ChampSelectAction {
  actorCellId: number
  championId: number
  completed: boolean
  id: number
  isAllyAction: boolean
  isInProgress: boolean
  type: string
}

export interface ChampSelectSession {
  actions: ChampSelectAction[][]
  benchChampions: { championId: number; isPriority: boolean }[]
  benchEnabled: boolean
  localPlayerCellId: number
  myTeam: ChampSelectPlayer[]
  theirTeam: ChampSelectPlayer[]
  queueId: number
  rerollsRemaining: number
  timer: {
    phase: string
    adjustedTimeLeftInPhase: number
    totalTimeInPhase: number
  }
  bans: {
    myTeamBans: number[]
    theirTeamBans: number[]
    numBans: number
  }
}

export interface SummonerInfo {
  summonerId: number
  displayName: string
}

export interface ChampionOwnershipEntry {
  id: number
  ownership: { owned: boolean }
}

export interface ChampionSummaryEntry {
  id: number
  name: string
  alias: string
  roles?: string[]
}

export interface ChampionDetail {
  id: number
  tacticalInfo?: { damageType?: string }
  playstyleInfo?: { difficulty?: number }
  roles?: string[]
}

export interface FreeRotationInfo {
  freeChampionIds?: number[]
  freeChampionIdsForNewPlayers?: number[]
  maxNewPlayerLevel?: number
}

export interface LcuEventMessage {
  data: unknown
  eventType: string
  uri: string
}

/** 本应用支持的模式（超出则不出建议） */
export const SUPPORTED_QUEUE_IDS: readonly number[] = [400, 420, 430, 440, 450]
