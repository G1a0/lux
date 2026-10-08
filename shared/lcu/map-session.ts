import { normalizeLcuPosition } from '../positions'
import type { AramJudgeInput, DraftContext } from '../engine/types'
import type { ChampSelectSession } from './types'
import { SUPPORTED_QUEUE_IDS } from './types'

function myCell(session: ChampSelectSession) {
  return session.myTeam.find(p => p.cellId === session.localPlayerCellId) ?? null
}

/** 熟练度积分 → 0-100（35000 分封顶）；引擎的新手友好因素使用 */
export function proficiencyFromMastery(championPoints: number): number {
  return Math.max(0, Math.min(100, Math.round(championPoints / 350)))
}

export interface MapExtras {
  /** 熟练度（0-100，championId → 值） */
  proficiency?: Record<number, number>
}

/** 征召/盲选/排位（400/420/430/440）→ DraftContext；其它模式或数据不足 → null */
export function mapRiftContext(session: ChampSelectSession, extras: MapExtras = {}): DraftContext | null {
  if (!SUPPORTED_QUEUE_IDS.includes(session.queueId) || session.queueId === 450) return null
  const me = myCell(session)
  if (!me) return null

  const myPosition = normalizeLcuPosition(me.assignedPosition)
  const allies = session.myTeam
    .filter(p => p.cellId !== session.localPlayerCellId && p.championId > 0)
    .map(p => ({ championId: p.championId, position: normalizeLcuPosition(p.assignedPosition) || undefined }))
  const enemies = session.theirTeam
    .filter(p => p.championId > 0)
    .map(p => ({ championId: p.championId }))
  const bans = [...session.bans.myTeamBans, ...session.bans.theirTeamBans].filter(id => id > 0)

  return {
    queueId: session.queueId as DraftContext['queueId'],
    // 我已锁定/已选中的英雄：引擎候选池必须排除，避免"推荐我已选的英雄"并对其误写符文
    myChampionId: me.championId > 0 ? me.championId : undefined,
    myPosition: myPosition || undefined,
    allies,
    enemies,
    bans,
    ...(extras.proficiency ? { proficiency: extras.proficiency } : {}),
  }
}

/** 大乱斗（450）→ 换/留判定输入；当前英雄未就绪 → null */
export function mapAramInput(session: ChampSelectSession): AramJudgeInput | null {
  if (session.queueId !== 450) return null
  const me = myCell(session)
  if (!me || me.championId <= 0) return null

  return {
    current: me.championId,
    bench: session.benchEnabled
      ? session.benchChampions.map(b => b.championId).filter(id => id > 0 && id !== me.championId)
      : [],
    diceLeft: session.rerollsRemaining,
    allies: session.myTeam.filter(p => p.cellId !== session.localPlayerCellId && p.championId > 0).map(p => p.championId),
    enemies: session.theirTeam.filter(p => p.championId > 0).map(p => p.championId),
  }
}
