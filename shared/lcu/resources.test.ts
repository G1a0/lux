import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockLcu, type MockLcu } from './mock/server'
import { createLcuHttp } from './http'
import { buildChampionIndex } from './resources'

const CERT_DIR = join(__dirname, 'fixtures', 'test-certs')
const fixture = (name: string) => JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf-8')) as unknown

let mock: MockLcu
beforeEach(async () => {
  mock = await createMockLcu({
    certDir: CERT_DIR,
    routes: {
      '/lol-game-data/assets/v1/champion-summary.json': { json: fixture('champion-summary.json') },
      '/lol-game-data/assets/v1/champions/84.json': { json: fixture('champion-detail-84.json') },
      '/lol-game-data/assets/v1/champions/112.json': { json: fixture('champion-detail-112.json') },
    },
  })
})
afterEach(async () => { await mock.stop() })

describe('buildChampionIndex', () => {
  it('名称/定位来自 summary；伤害与难度来自 detail；缺失走兜底', async () => {
    const index = await buildChampionIndex(createLcuHttp({ port: mock.port, password: mock.password }))

    expect(index.get(84)).toEqual({ id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 })
    expect(index.get(112)?.difficulty).toBe(7) // 70 → 7
    expect(index.get(57)).toEqual({ id: 57, name: '茂凯', damageType: 'mixed', roles: ['tank', 'support'], difficulty: 5 })
    expect(index.get(22)?.roles).toEqual(['marksman', 'support'])
    expect(index.get(9999)).toBeNull()
    expect(index.all().length).toBe(5)
  })

  it('详情资源全部失败 → 兜底索引 + 一次告警', async () => {
    await mock.stop()
    mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: { '/lol-game-data/assets/v1/champion-summary.json': { json: fixture('champion-summary.json') } },
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const index = await buildChampionIndex(createLcuHttp({ port: mock.port, password: mock.password }))
      expect(index.all()).toHaveLength(5)
      expect(index.get(84)?.damageType).toBe('mixed')
      expect(warn).toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })
})
