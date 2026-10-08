import type { InternalPosition } from '../positions'

export interface Qq101TierRecord {
  rank: number | null
  championId: number
  strengthTier: string
  position: InternalPosition | ''
  winRate: number | null
  pickRate: number | null
  banRate: number | null
  counterChampionIds: number[]
}

export interface Qq101TierList {
  date: string
  champions: Qq101TierRecord[]
}

export interface Qq101Matchup {
  championId: number
  winRate: number | null
  favorable: boolean
}

export interface Qq101Synergy {
  championId: number
  winRate: number | null
  games: number | null
}
