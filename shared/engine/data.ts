// 引擎与数据仓的解耦层：引擎只依赖本接口（测试用内存假数据，运行时用数据仓）。
import type { Qq101Lane } from '../positions'
import type {
  Qq101AramHero,
  Qq101Matchup,
  Qq101RunePage,
  Qq101SpellCombo,
  Qq101Synergy,
  Qq101TierList,
} from '../qq101/types'
import type { LaneKey, Warehouse } from '../warehouse/store'
import type { ChampionIndex, ChampionMeta } from '../champions/meta'

export interface EngineData {
  tierList(lane: LaneKey): Qq101TierList | null
  matchups(lane: Qq101Lane, championId: number): Qq101Matchup[] | null
  synergies(lane: Qq101Lane, championId: number): Qq101Synergy[] | null
  runes(lane: Qq101Lane, championId: number): Qq101RunePage[] | null
  spells(lane: Qq101Lane, championId: number): Qq101SpellCombo[] | null
  aramOverview(): Qq101AramHero[] | null
  champion(id: number): ChampionMeta | null
}

export function createEngineData(warehouse: Warehouse, index: ChampionIndex): EngineData {
  const manifest = warehouse.readManifest()
  const patch = manifest?.patch ?? null
  const aramDate = manifest?.aramDate ?? null

  return {
    tierList: lane => (patch ? warehouse.loadTier(patch, lane) : null),
    matchups: (lane, id) => (patch ? warehouse.loadMatchups(patch, lane, id) : null),
    synergies: (lane, id) => (patch ? warehouse.loadSynergies(patch, lane, id) : null),
    runes: (lane, id) => (patch ? warehouse.loadRunes(patch, lane, id) : null),
    spells: (lane, id) => (patch ? warehouse.loadSpells(patch, lane, id) : null),
    aramOverview: () => (aramDate ? warehouse.loadAram(aramDate) : null),
    champion: id => index.get(id),
  }
}
