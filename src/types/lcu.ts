// src/types/lcu.ts

/** 英雄选择阶段玩家信息 */
export interface ChampSelectPlayer {
  assignedPosition: string
  cellId: number
  championId: number
  championPickIntent: number
  gameName: string
  summonerId: number
  puuid: string
  team: 1 | 2 | number
  spell1Id: number
  spell2Id: number
}

/** 英雄选择操作 */
export interface ChampSelectAction {
  actorCellId: number
  championId: number
  completed: boolean
  id: number
  isAllyAction: boolean
  isInProgress: boolean
  type: 'pick' | 'ban' | 'ten_bans_reveal' | (string & {})
}

/** 英雄选择会话 */
export interface ChampSelectSession {
  actions: ChampSelectAction[][]
  allowBattleBoost: boolean
  allowRerolling: boolean
  allowSkinSelection: boolean
  benchChampions: { championId: number; isPriority: boolean }[]
  benchEnabled: boolean
  counter: number
  gameId: number
  id: string
  isCustomGame: boolean
  isSpectating: boolean
  localPlayerCellId: number
  lockedEventIndex: number
  myTeam: ChampSelectPlayer[]
  theirTeam: ChampSelectPlayer[]
  queueId: number
  rerollsRemaining: number
  timer: {
    adjustedTimeLeftInPhase: number
    internalNowInEpochMs: number
    isInfinite: boolean
    phase: 'PLANNING' | 'BAN_PICK' | 'FINALIZATION' | 'GAME_STARTING' | (string & {})
    totalTimeInPhase: number
  }
  trades: { cellId: number; id: number; state: 'AVAILABLE' | 'BUSY' | 'RECEIVED' | 'SENT' | (string & {}) }[]
  bans: {
    myTeamBans: number[]
    theirTeamBans: number[]
    numBans: number
  }
}

/** LCU WebSocket 事件消息 */
export interface LCUEventMessage {
  data: unknown
  eventType: 'Create' | 'Update' | 'Delete'
  uri: string
}

/** 游戏流程阶段 */
export type GameflowPhase = 'None' | 'Lobby' | 'Matchmaking' | 'ReadyCheck' | 'ChampSelect' | 'GameStart' | 'InProgress' | 'WaitingForStats' | 'PreEndOfGame' | 'EndOfGame' | (string & {})

/** LCU WebSocket 事件 URI 常量 */
export const LcuEventUri = {
  GAMEFLOW_PHASE_CHANGE: '/lol-gameflow/v1/gameflow-phase',
  CHAMP_SELECT_SESSION: '/lol-champ-select/v1/session',
} as const

/** 召唤师信息 */
export interface SummonerInfo {
  summonerId: number
  displayName: string
  internalName: string
  puuid: string
  accountId: number
  summonerLevel: number
  profileIconId: number
}
