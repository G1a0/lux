// src/types/champion.ts

export interface ChampionMeta {
  champions: Record<string, { name: string; enName: string; positions: string[] }>
  positionOrder: string[]
  positionLabels: Record<string, string>
  damageTypes: Record<string, string>
}
