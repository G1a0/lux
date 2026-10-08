// src/types/champion.ts

/** @deprecated 静态英雄表已废弃，仅过渡期保留，Task 清理时删除 */
export interface ChampionMeta {
  champions: Record<string, { name: string; enName: string; positions: string[] }>
  positionOrder: string[]
  positionLabels: Record<string, string>
  damageTypes: Record<string, string>
}

export type DamageType = 'ap' | 'ad' | 'mixed'

export interface ChampionMetaEntry {
  name: string
  alias: string
}
