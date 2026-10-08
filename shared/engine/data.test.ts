import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEngineData } from './data'
import { createWarehouse, type Warehouse } from '../warehouse/store'
import { createChampionIndex } from '../champions/meta'
import type { Qq101TierList } from '../qq101/types'

const INDEX = createChampionIndex([
  { id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 },
])

const TIER: Qq101TierList = {
  date: '20261007',
  champions: [{ rank: 1, championId: 84, strengthTier: 'T1', position: 'mid', winRate: 0.52, pickRate: 0.1, banRate: 0.05, counterChampionIds: [] }],
}

describe('createEngineData', () => {
  let root: string
  let wh: Warehouse
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'lux-engine-')); wh = createWarehouse(root) })

  it('未同步（无 manifest）时一切返回 null', () => {
    const data = createEngineData(wh, INDEX)
    expect(data.tierList('MIDDLE')).toBeNull()
    expect(data.tierList('ALL')).toBeNull()
    expect(data.matchups('MIDDLE', 84)).toBeNull()
    expect(data.aramOverview()).toBeNull()
  })

  it('有 manifest 时按版本读取各类数据', () => {
    wh.writeManifest({ patch: '16.19', dataDate: '20261007', updatedAt: 'x', aramDate: '20261007' })
    wh.saveTier('16.19', 'MIDDLE', TIER)
    wh.saveMatchups('16.19', 'MIDDLE', 84, [{ championId: 711, winRate: 0.55, favorable: true }])
    wh.saveRunes('16.19', 'MIDDLE', 84, [{ rank: 1, keystoneId: 8112, subStyleCode: 'jj', runeIds: [8112], pickRate: 0.4, winRate: 0.5, games: 100 }])
    wh.saveSpells('16.19', 'MIDDLE', 84, [{ spellIds: [14, 4], winRate: 0.48, pickRate: 0.9 }])
    wh.saveAram('20261007', [])

    const data = createEngineData(wh, INDEX)
    expect(data.tierList('MIDDLE')?.champions).toHaveLength(1)
    expect(data.matchups('MIDDLE', 84)).toHaveLength(1)
    expect(data.runes('MIDDLE', 84)?.[0].keystoneId).toBe(8112)
    expect(data.spells('MIDDLE', 84)?.[0].spellIds).toEqual([14, 4])
    expect(data.synergies('MIDDLE', 84)).toBeNull()
    expect(data.aramOverview()).toEqual([])
    expect(data.champion(84)?.name).toBe('阿卡丽')
    expect(data.champion(999)).toBeNull()
  })
})
