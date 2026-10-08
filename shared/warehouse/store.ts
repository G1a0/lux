// 本地数据仓：JSON 快照文件（按版本目录）+ 原子写入，不引入数据库。
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Qq101Lane } from '../positions'
import type { Qq101Matchup, Qq101Synergy, Qq101TierList } from '../qq101/types'

export interface WarehouseManifest {
  patch: string
  dataDate: string
  updatedAt: string
}

export interface Warehouse {
  readManifest(): WarehouseManifest | null
  writeManifest(manifest: WarehouseManifest): void
  hasTier(patch: string, lane: Qq101Lane): boolean
  loadTier(patch: string, lane: Qq101Lane): Qq101TierList | null
  saveTier(patch: string, lane: Qq101Lane, data: Qq101TierList): void
  hasMatchups(patch: string, lane: Qq101Lane, championId: number): boolean
  loadMatchups(patch: string, lane: Qq101Lane, championId: number): Qq101Matchup[] | null
  saveMatchups(patch: string, lane: Qq101Lane, championId: number, rows: Qq101Matchup[]): void
  hasSynergies(patch: string, lane: Qq101Lane, championId: number): boolean
  loadSynergies(patch: string, lane: Qq101Lane, championId: number): Qq101Synergy[] | null
  saveSynergies(patch: string, lane: Qq101Lane, championId: number, rows: Qq101Synergy[]): void
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
  const tierFile = (patch: string, lane: Qq101Lane) => join(patchDir(patch), `tier-${lane}.json`)
  const matchupsFile = (patch: string, lane: Qq101Lane, id: number) => join(patchDir(patch), `matchups-${lane}-${id}.json`)
  const synergiesFile = (patch: string, lane: Qq101Lane, id: number) => join(patchDir(patch), `synergies-${lane}-${id}.json`)
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
  }
}
