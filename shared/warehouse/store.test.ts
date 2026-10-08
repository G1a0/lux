import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createWarehouse, type WarehouseManifest } from './store'
import type { Qq101TierList } from '../qq101/types'

function tmpRoot(): string {
  return mkdtempSync(join(tmpdir(), 'lux-wh-'))
}

const sampleTier: Qq101TierList = {
  date: '2026-10-08',
  champions: [{ rank: 1, championId: 84, strengthTier: 'T1', position: 'mid', winRate: 0.52, pickRate: 0.1, banRate: 0.05, counterChampionIds: [711] }],
}

describe('warehouse', () => {
  let root: string
  beforeEach(() => { root = tmpRoot() })

  it('manifest 往返', () => {
    const wh = createWarehouse(root)
    expect(wh.readManifest()).toBeNull()
    const m: WarehouseManifest = { patch: '16.19', dataDate: '2026-10-08', updatedAt: '2026-10-08T12:00:00.000Z' }
    wh.writeManifest(m)
    expect(wh.readManifest()).toEqual(m)
  })

  it('tier 保存/读取/存在性', () => {
    const wh = createWarehouse(root)
    expect(wh.hasTier('16.19', 'MIDDLE')).toBe(false)
    expect(wh.loadTier('16.19', 'MIDDLE')).toBeNull()
    wh.saveTier('16.19', 'MIDDLE', sampleTier)
    expect(wh.hasTier('16.19', 'MIDDLE')).toBe(true)
    expect(wh.loadTier('16.19', 'MIDDLE')).toEqual(sampleTier)
    // 不同版本互不影响
    expect(wh.loadTier('16.18', 'MIDDLE')).toBeNull()
  })

  it('matchups/synergies 按 版本+位置+英雄 存取', () => {
    const wh = createWarehouse(root)
    const matchups = [{ championId: 711, winRate: 0.55, favorable: true }]
    const synergies = [{ championId: 876, winRate: 0.58, games: 1200 }]
    expect(wh.hasMatchups('16.19', 'MIDDLE', 84)).toBe(false)
    wh.saveMatchups('16.19', 'MIDDLE', 84, matchups)
    wh.saveSynergies('16.19', 'MIDDLE', 84, synergies)
    expect(wh.loadMatchups('16.19', 'MIDDLE', 84)).toEqual(matchups)
    expect(wh.loadSynergies('16.19', 'MIDDLE', 84)).toEqual(synergies)
    expect(wh.loadMatchups('16.19', 'TOP', 84)).toBeNull()
  })

  it('文件损坏时读取返回 null', () => {
    const wh = createWarehouse(root)
    wh.saveTier('16.19', 'MIDDLE', sampleTier)
    const file = join(root, 'qq101', '16.19', 'tier-MIDDLE.json')
    writeFileSync(file, 'not-json')
    expect(wh.loadTier('16.19', 'MIDDLE')).toBeNull()
  })
})
