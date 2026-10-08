import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMockLcu, type MockLcu } from './mock/server'
import { createLcuHttp } from './http'
import { createLcuReaders } from './readers'

const CERT_DIR = join(__dirname, 'fixtures', 'test-certs')
const fixture = (name: string) => JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf-8')) as unknown

let mock: MockLcu
beforeEach(async () => {
  mock = await createMockLcu({
    certDir: CERT_DIR,
    routes: {
      '/lol-summoner/v1/current-summoner': { json: { summonerId: 33, displayName: '测试' } },
      '/lol-champ-select/v1/session': { json: fixture('session-draft-mid.json') },
      '/lol-champions/v1/inventories/33/champions': { json: fixture('owned-champions.json') },
      '/lol-champions/v1/free-rotation': { json: fixture('free-rotation.json') },
      '/lol-champion-mastery/v1/local-player/champion-mastery': { json: fixture('champion-mastery.json') },
    },
  })
})
afterEach(async () => { await mock.stop() })

function readers() {
  return createLcuReaders(createLcuHttp({ port: mock.port, password: mock.password }))
}

describe('createLcuReaders', () => {
  it('读取会话/召唤师/拥有/周免/熟练度', async () => {
    const r = readers()
    expect((await r.getChampSelectSession())?.queueId).toBe(420)
    expect((await r.getSummoner())?.summonerId).toBe(33)
    expect(await r.getOwnedChampionIds()).toEqual([84, 112, 711, 22])
    expect(await r.getFreeRotationIds()).toEqual([57, 64, 99])
    expect(await r.getChampionMasteryPoints()).toEqual({ 84: 70000, 711: 8000 })
  })

  it('免费周免 404 时静默回退为空数组（旧客户端无此端点）', async () => {
    await mock.stop()
    mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: { '/lol-champions/v1/free-rotation': { status: 404 } },
    })
    expect(await readers().getFreeRotationIds()).toEqual([])
  })

  it('无会话时（404）返回 null', async () => {
    await mock.stop()
    mock = await createMockLcu({ certDir: CERT_DIR, routes: {} })
    expect(await readers().getChampSelectSession()).toBeNull()
  })

  it('熟练度端点 404 时回退为空对象', async () => {
    await mock.stop()
    mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: { '/lol-champion-mastery/v1/local-player/champion-mastery': { status: 404 } },
    })
    expect(await readers().getChampionMasteryPoints()).toEqual({})
  })
})
