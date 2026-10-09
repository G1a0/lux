import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ARAM_RULES } from '../champions/aram-rules'
import { parseQq101RunePages } from '../qq101/parse'
import { createMockLcu, type MockLcu } from './mock/server'
import { createLcuHttp } from './http'
import { subStyleCodeToStyleId, applyRunePage, carrySpells, keystoneToPrimaryStyleId } from './writers'

const CERT_DIR = join(__dirname, 'fixtures', 'test-certs')
let mock: MockLcu
beforeEach(async () => {
  mock = await createMockLcu({
    certDir: CERT_DIR,
    routes: {
      '/lol-perks/v1/pages': {
        handler: (_body, req) => {
          if (req.method === 'POST') return { json: { id: 9001 } }
          return { json: [{ id: 100, current: true, isDeletable: true, name: '我的自定义页' }] }
        },
      },
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
  it('无自有页：自动加 Lux· 前缀并 POST 创建当前页（不删用户页）', async () => {
    const http = createLcuHttp({ port: mock.port, password: mock.password })
    const ok = await applyRunePage(http, {
      name: '阿卡丽',
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
    expect(mock.received.filter(r => r.method === 'DELETE')).toHaveLength(0)
  })

  it('有自有页：就地 PUT 更新（不 POST、不删页，用户自建页绝不被写）', async () => {
    await mock.stop()
    mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: {
        '/lol-perks/v1/pages': {
          handler: (_body, req) => {
            if (req.method === 'POST') return { json: { id: 9002 } }
            return { json: [
              { id: 100, current: false, isDeletable: true, name: '我的自定义页' },
              { id: 200, current: true, isDeletable: false, name: 'Lux·旧符文' },
            ] }
          },
        },
        '/lol-perks/v1/pages/200': { status: 204 },
      },
    })
    const http = createLcuHttp({ port: mock.port, password: mock.password })
    const ok = await applyRunePage(http, {
      name: '阿卡丽', keystoneId: 8112, subStyleCode: 'jj',
      runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
    })
    expect(ok.ok).toBe(true)
    const put = mock.received.find(r => r.method === 'PUT' && r.url === '/lol-perks/v1/pages/200')
    expect(put?.body).toMatchObject({
      name: 'Lux·阿卡丽',
      primaryStyleId: 8100,
      subStyleId: 8400,
      selectedPerkIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
      current: true,
    })
    expect(mock.received.some(r => r.method === 'POST')).toBe(false)
    expect(mock.received.filter(r => r.method === 'DELETE')).toHaveLength(0)
    // 用户自建页（非 Lux· 前缀）绝不被写（PUT/DELETE/PATCH 均无）
    expect(mock.received.some(r => r.url === '/lol-perks/v1/pages/100')).toBe(false)
  })

  it('多个自有页：PUT 第一个（成为当前页），其余尽力 DELETE；用户页不动', async () => {
    await mock.stop()
    mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: {
        '/lol-perks/v1/pages': {
          handler: (_body, req) => {
            if (req.method === 'POST') return { json: { id: 9003 } }
            return { json: [
              { id: 100, current: false, isDeletable: true, name: '我的自定义页' },
              { id: 200, current: false, isDeletable: true, name: 'Lux·旧A' },
              { id: 201, current: true, isDeletable: true, name: 'Lux·旧B' },
            ] }
          },
        },
        '/lol-perks/v1/pages/200': { status: 204 },
        '/lol-perks/v1/pages/201': { status: 204 },
      },
    })
    const http = createLcuHttp({ port: mock.port, password: mock.password })
    const ok = await applyRunePage(http, {
      name: '测试', keystoneId: 8112, subStyleCode: 'jj',
      runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
    })
    expect(ok.ok).toBe(true)
    expect(mock.received.some(r => r.method === 'PUT' && r.url === '/lol-perks/v1/pages/200')).toBe(true)
    expect(mock.received.some(r => r.method === 'DELETE' && r.url === '/lol-perks/v1/pages/201')).toBe(true)
    expect(mock.received.some(r => r.method === 'DELETE' && r.url === '/lol-perks/v1/pages/200')).toBe(false)
    expect(mock.received.some(r => r.method === 'POST')).toBe(false)
    expect(mock.received.some(r => r.url === '/lol-perks/v1/pages/100')).toBe(false)
  })

  it('PUT 失败 → 回退 POST 创建', async () => {
    await mock.stop()
    mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: {
        '/lol-perks/v1/pages': {
          handler: (_body, req) => {
            if (req.method === 'POST') return { json: { id: 9004 } }
            return { json: [{ id: 200, current: true, isDeletable: false, name: 'Lux·旧符文' }] }
          },
        },
        '/lol-perks/v1/pages/200': { status: 500 },
      },
    })
    const http = createLcuHttp({ port: mock.port, password: mock.password })
    const ok = await applyRunePage(http, {
      name: '测试', keystoneId: 8112, subStyleCode: 'jj',
      runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
    })
    expect(ok.ok).toBe(true)
    expect(mock.received.some(r => r.method === 'POST' && r.url === '/lol-perks/v1/pages')).toBe(true)
  })

  it('POST 失败（HTTP 400）→ 原因含状态码，不删任何页', async () => {
    await mock.stop()
    mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: {
        '/lol-perks/v1/pages': {
          handler: (_body, req) =>
            req.method === 'POST'
              ? { status: 400 }
              : { json: [{ id: 100, current: true, isDeletable: true, name: '我的自定义页' }] },
        },
      },
    })
    const http = createLcuHttp({ port: mock.port, password: mock.password })
    const result = await applyRunePage(http, {
      name: '测试', keystoneId: 8112, subStyleCode: 'jj',
      runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('HTTP 400')
    expect(result.reason).toContain('已满')
    expect(mock.received.filter(r => r.method === 'DELETE')).toHaveLength(0)
  })

  it('副系未知 → 失败并带原因', async () => {
    const http = createLcuHttp({ port: mock.port, password: mock.password })
    const result = await applyRunePage(http, {
      name: '测试', keystoneId: 8112, subStyleCode: 'xx', runeIds: [8112],
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

describe('基石主系映射覆盖（防止新增基石漏映射）', () => {
  it('全部内置大乱斗规则的基石都能推导主系', () => {
    for (const rule of Object.values(ARAM_RULES)) {
      expect(keystoneToPrimaryStyleId(rule.keystoneId), `rule=${rule.key}`).not.toBeNull()
    }
  })

  it('全部 101 采集样本的第 1 页基石都能推导主系', () => {
    const dir = join(__dirname, '..', 'qq101', 'fixtures')
    const files = readdirSync(dir).filter(f => f.startsWith('recon-rule-') || f.startsWith('recon-runeinfo-'))
    expect(files.length).toBeGreaterThanOrEqual(6)
    for (const file of files) {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf-8'))
      const top = parseQq101RunePages(raw)[0]
      expect(keystoneToPrimaryStyleId(top.keystoneId), `${file} keystone=${top.keystoneId}`).not.toBeNull()
    }
  })
})
