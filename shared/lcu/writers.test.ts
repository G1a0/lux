import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMockLcu, type MockLcu } from './mock/server'
import { createLcuHttp } from './http'
import { subStyleCodeToStyleId, applyRunePage, carrySpells } from './writers'

const CERT_DIR = join(__dirname, 'fixtures', 'test-certs')
let mock: MockLcu
beforeEach(async () => {
  mock = await createMockLcu({
    certDir: CERT_DIR,
    routes: {
      '/lol-perks/v1/pages': {
        handler: (body, req) => {
          if (req.method === 'POST') return { json: { id: 9001 } }
          return { json: [{ id: 100, current: true, isDeletable: true, name: '旧页' }] }
        },
      },
      '/lol-perks/v1/currentpage': { status: 200, json: {} },
      '/lol-champ-select/v1/session/my-selection': { status: 204 },
    },
  })
})
afterEach(async () => { await mock.stop() })

describe('subStyleCodeToStyleId', () => {
  it('映射 101 副系 code → 符文系 id', () => {
    expect(subStyleCodeToStyleId('jm')).toBe(8000)
    expect(subStyleCodeToStyleId('zj')).toBe(8100)
    expect(subStyleCodeToStyleId('ws')).toBe(8200)
    expect(subStyleCodeToStyleId('jj')).toBe(8400)
    expect(subStyleCodeToStyleId('qd')).toBe(8300)
    expect(subStyleCodeToStyleId('??')).toBeNull()
  })
})

describe('applyRunePage', () => {
  it('常规：POST 创建当前页', async () => {
    const http = createLcuHttp({ port: mock.port, password: mock.password })
    const ok = await applyRunePage(http, {
      name: 'Lux·阿卡丽',
      keystoneId: 8112,
      subStyleCode: 'jj',
      runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
    })
    expect(ok.ok).toBe(true)
    const post = mock.received.find(r => r.method === 'POST' && r.url === '/lol-perks/v1/pages')
    expect(post?.body).toMatchObject({
      name: 'Lux·阿卡丽',
      primaryStyleId: 8100, // 基石 8112（主宰）推导
      subStyleId: 8400,
      selectedPerkIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
      current: true,
    })
  })

  it('页数满（POST 失败）：删除当前可删页后重试成功', async () => {
    await mock.stop()
    let firstPost = true
    mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: {
        '/lol-perks/v1/pages': {
          handler: (_body, req) => {
            if (req.method === 'POST') {
              if (firstPost) { firstPost = false; return { status: 500 } }
              return { json: { id: 9002 } }
            }
            return { json: [{ id: 100, current: true, isDeletable: true, name: '旧页' }] }
          },
        },
        '/lol-perks/v1/pages/100': { status: 204 },
      },
    })
    const http = createLcuHttp({ port: mock.port, password: mock.password })
    const ok = await applyRunePage(http, {
      name: 'Lux·测试', keystoneId: 8112, subStyleCode: 'jj',
      runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
    })
    expect(ok.ok).toBe(true)
    expect(mock.received.some(r => r.method === 'DELETE' && r.url === '/lol-perks/v1/pages/100')).toBe(true)
  })

  it('副系未知 → 失败并带原因', async () => {
    const http = createLcuHttp({ port: mock.port, password: mock.password })
    const result = await applyRunePage(http, {
      name: 'Lux·测试', keystoneId: 8112, subStyleCode: 'xx', runeIds: [8112],
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('副系')
  })
})

describe('carrySpells', () => {
  it('PATCH my-selection 携带技能', async () => {
    const http = createLcuHttp({ port: mock.port, password: mock.password })
    expect(await carrySpells(http, [4, 32])).toBe(true)
    expect(mock.received).toContainEqual({
      method: 'PATCH',
      url: '/lol-champ-select/v1/session/my-selection',
      body: { spell1Id: 4, spell2Id: 32 },
    })
  })
})
