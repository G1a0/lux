// LCU REST 读取层：会话/召唤师/英雄拥有/周免/熟练度。只读，无副作用。
import { LcuHttpError, type LcuHttp } from './http'
import type {
  ChampionOwnershipEntry,
  ChampSelectSession,
  FreeRotationInfo,
  SummonerInfo,
} from './types'

export interface LcuReaders {
  getChampSelectSession(): Promise<ChampSelectSession | null>
  getSummoner(): Promise<SummonerInfo | null>
  getOwnedChampionIds(): Promise<number[]>
  getFreeRotationIds(): Promise<number[]>
  /** 熟练度积分 { championId: championPoints }；端点缺失/无数据 → {} */
  getChampionMasteryPoints(): Promise<Record<number, number>>
}

export function createLcuReaders(http: LcuHttp): LcuReaders {
  let cachedSummonerId: number | null = null

  return {
    getChampSelectSession: async () => {
      try {
        return await http.get<ChampSelectSession>('/lol-champ-select/v1/session')
      } catch (error) {
        if (error instanceof LcuHttpError && error.status === 404) return null
        throw error
      }
    },

    getSummoner: async () => {
      const info = await http.get<SummonerInfo>('/lol-summoner/v1/current-summoner')
      if (info) cachedSummonerId = info.summonerId
      return info
    },

    getOwnedChampionIds: async () => {
      if (cachedSummonerId === null) {
        const info = await http.get<SummonerInfo>('/lol-summoner/v1/current-summoner')
        cachedSummonerId = info?.summonerId ?? null
      }
      if (cachedSummonerId === null) return []
      const entries = await http.get<ChampionOwnershipEntry[]>(
        `/lol-champions/v1/inventories/${cachedSummonerId}/champions`,
      )
      return (entries ?? []).filter(e => e.ownership?.owned).map(e => e.id)
    },

    getFreeRotationIds: async () => {
      try {
        const info = await http.get<FreeRotationInfo>('/lol-champions/v1/free-rotation')
        if (!info) return []
        return [...(info.freeChampionIds ?? []), ...(info.freeChampionIdsForNewPlayers ?? [])]
      } catch {
        return [] // 端点不存在（旧客户端）视作无周免
      }
    },

    getChampionMasteryPoints: async () => {
      try {
        const rows = await http.get<{ championId: number; championPoints?: number }[]>(
          '/lol-champion-mastery/v1/local-player/champion-mastery',
        )
        const result: Record<number, number> = {}
        for (const row of rows ?? []) {
          if (typeof row.championId === 'number' && typeof row.championPoints === 'number') {
            result[row.championId] = row.championPoints
          }
        }
        return result
      } catch {
        return {} // 端点缺失/无数据：按无熟练度处理
      }
    },
  }
}
