// 本地数据仓：JSON 快照文件（按版本目录）+ 原子写入，不引入数据库。
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Qq101Lane } from '../positions'
import type { Qq101AramHero, Qq101Matchup, Qq101RunePage, Qq101SpellCombo, Qq101Synergy, Qq101TierList } from '../qq101/types'

export type LaneKey = Qq101Lane | 'ALL'

export interface WarehouseManifest {
  patch: string
  dataDate: string
  updatedAt: string
  /** 大乱斗总览的数据日期（YYYYMMDD），未同步过则缺省 */
  aramDate?: string
}

export interface Warehouse {
  readManifest(): WarehouseManifest | null
  writeManifest(manifest: WarehouseManifest): void
  hasTier(patch: string, lane: LaneKey): boolean
  loadTier(patch: string, lane: LaneKey): Qq101TierList | null
  saveTier(patch: string, lane: LaneKey, data: Qq101TierList): void
  hasMatchups(patch: string, lane: Qq101Lane, championId: number): boolean
  loadMatchups(patch: string, lane: Qq101Lane, championId: number): Qq101Matchup[] | null
  saveMatchups(patch: string, lane: Qq101Lane, championId: number, rows: Qq101Matchup[]): void
  hasSynergies(patch: string, lane: Qq101Lane, championId: number): boolean
  loadSynergies(patch: string, lane: Qq101Lane, championId: number): Qq101Synergy[] | null
  saveSynergies(patch: string, lane: Qq101Lane, championId: number, rows: Qq101Synergy[]): void
  hasRunes(patch: string, lane: Qq101Lane, championId: number): boolean
  loadRunes(patch: string, lane: Qq101Lane, championId: number): Qq101RunePage[] | null
  saveRunes(patch: string, lane: Qq101Lane, championId: number, rows: Qq101RunePage[]): void
  hasSpells(patch: string, lane: Qq101Lane, championId: number): boolean
  loadSpells(patch: string, lane: Qq101Lane, championId: number): Qq101SpellCombo[] | null
  saveSpells(patch: string, lane: Qq101Lane, championId: number, rows: Qq101SpellCombo[]): void
  hasAram(date: string): boolean
  loadAram(date: string): Qq101AramHero[] | null
  saveAram(date: string, rows: Qq101AramHero[]): void
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as T
  } catch {
    return null
  }
}

function writeJsonAtomic(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(value))
  renameSync(tmp, file)
}

export function createWarehouse(rootDir: string): Warehouse {
  const base = join(rootDir, 'qq101')
  const patchDir = (patch: string) => join(base, patch)
  const tierFile = (patch: string, lane: LaneKey) => join(patchDir(patch), `tier-${lane}.json`)
  const matchupsFile = (patch: string, lane: Qq101Lane, id: number) => join(patchDir(patch), `matchups-${lane}-${id}.json`)
  const synergiesFile = (patch: string, lane: Qq101Lane, id: number) => join(patchDir(patch), `synergies-${lane}-${id}.json`)
  const runesFile = (patch: string, lane: Qq101Lane, id: number) => join(patchDir(patch), `runes-${lane}-${id}.json`)
  const spellsFile = (patch: string, lane: Qq101Lane, id: number) => join(patchDir(patch), `spells-${lane}-${id}.json`)
  const aramFile = (date: string) => join(base, `aram-${date}.json`)
  const manifestFile = join(base, 'manifest.json')

  return {
    readManifest: () => readJson<WarehouseManifest>(manifestFile),
    writeManifest: m => writeJsonAtomic(manifestFile, m),
    hasTier: (patch, lane) => existsSync(tierFile(patch, lane)),
    loadTier: (patch, lane) => readJson<Qq101TierList>(tierFile(patch, lane)),
    saveTier: (patch, lane, data) => writeJsonAtomic(tierFile(patch, lane), data),
    hasMatchups: (patch, lane, id) => existsSync(matchupsFile(patch, lane, id)),
    loadMatchups: (patch, lane, id) => readJson<Qq101Matchup[]>(matchupsFile(patch, lane, id)),
    saveMatchups: (patch, lane, id, rows) => writeJsonAtomic(matchupsFile(patch, lane, id), rows),
    hasSynergies: (patch, lane, id) => existsSync(synergiesFile(patch, lane, id)),
    loadSynergies: (patch, lane, id) => readJson<Qq101Synergy[]>(synergiesFile(patch, lane, id)),
    saveSynergies: (patch, lane, id, rows) => writeJsonAtomic(synergiesFile(patch, lane, id), rows),
    hasRunes: (patch, lane, id) => existsSync(runesFile(patch, lane, id)),
    loadRunes: (patch, lane, id) => readJson<Qq101RunePage[]>(runesFile(patch, lane, id)),
    saveRunes: (patch, lane, id, rows) => writeJsonAtomic(runesFile(patch, lane, id), rows),
    hasSpells: (patch, lane, id) => existsSync(spellsFile(patch, lane, id)),
    loadSpells: (patch, lane, id) => readJson<Qq101SpellCombo[]>(spellsFile(patch, lane, id)),
    saveSpells: (patch, lane, id, rows) => writeJsonAtomic(spellsFile(patch, lane, id), rows),
    hasAram: date => existsSync(aramFile(date)),
    loadAram: date => readJson<Qq101AramHero[]>(aramFile(date)),
    saveAram: (date, rows) => writeJsonAtomic(aramFile(date), rows),
  }
}
