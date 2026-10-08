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

export interface Qq101RunePage {
  /** 榜单序号（1 = 使用最多） */
  rank: number
  keystoneId: number
  /** 副系 code：jm=精密 zj/zz=主宰 ws=巫术 jj=坚决 qd=启迪 */
  subStyleCode: string
  /** 9 个符文 id：主系 4 + 副系 2 + 属性碎片 3 */
  runeIds: number[]
  pickRate: number | null
  winRate: number | null
  games: number | null
}

export interface Qq101SpellCombo {
  spellIds: [number, number]
  winRate: number | null
  pickRate: number | null
}

export interface Qq101AramPartner {
  championId: number
  pickRate: number | null
  winRate: number | null
  rank: number | null
}

export interface Qq101AramHero {
  championId: number
  rank: number | null
  rankChange: string
  winRate: number | null
  pickRate: number | null
  bestPartners: Qq101AramPartner[]
  avgDeathTime: number | null
  avgParticipation: number | null
  avgDamageRatio: number | null
  avgTankRatio: number | null
}
