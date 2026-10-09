import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createMockLcu, type MockLcu } from './mock/server'
import { LcuHttpError, createLcuHttp } from './http'

const CERT_DIR = join(__dirname, 'fixtures', 'test-certs')
let servers: MockLcu[] = []
afterEach(async () => {
  for (const s of servers.splice(0)) await s.stop()
})

function mock(
  late: () => { json?: unknown; status?: number },
  // 计划原文仅注册 summoner 路由，PUT 目标会被 mock 404 拒绝；补一个可选路由表。
  extraRoutes: Record<string, { json?: unknown; status?: number; raw?: Buffer }> = {},
): Promise<MockLcu> {
  return createMockLcu({
    certDir: CERT_DIR,
    routes: {
      '/lol-summoner/v1/current-summoner': { handler: () => late() },
      ...extraRoutes,
    },
  })
}

describe('createLcuHttp', () => {
  it('GET 返回 JSON', async () => {
    const m = await mock(() => ({ json: { summonerId: 7, displayName: 'x' } }))
    servers.push(m)
    const http = createLcuHttp({ port: m.port, password: m.password })
    expect(await http.get('/lol-summoner/v1/current-summoner')).toEqual({ summonerId: 7, displayName: 'x' })
  })

  it('204 返回 null；非 2xx 抛 LcuHttpError（带状态码）', async () => {
    const m = await mock(() => ({ status: 204 }))
    servers.push(m)
    const http = createLcuHttp({ port: m.port, password: m.password })
    expect(await http.get('/lol-summoner/v1/current-summoner')).toBeNull()
    await expect(http.get('/nope')).rejects.toMatchObject({ name: 'LcuHttpError', status: 404 })
    expect(new LcuHttpError(404, '/x').status).toBe(404)
  })

  it('PUT 发送 JSON 体', async () => {
    const m = await mock(() => ({ json: { ok: true } }), { '/lol-perks/v1/currentpage': { json: { ok: true } } })
    servers.push(m)
    const http = createLcuHttp({ port: m.port, password: m.password })
    await http.put('/lol-perks/v1/currentpage', { name: 'x' })
    expect(m.received).toContainEqual({ method: 'PUT', url: '/lol-perks/v1/currentpage', body: { name: 'x' } })
  })

  it('连接失败抛错（端口无人监听）', async () => {
    const http = createLcuHttp({ port: 1, password: 'x', timeoutMs: 500 })
    await expect(http.get('/x')).rejects.toThrow()
  })

  it('getBuffer 返回原始二进制体（英雄头像）', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0x10])
    const m = await mock(() => ({ status: 404 }), {
      '/lol-game-data/assets/v1/champion-icons/22.png': { raw: png },
    })
    servers.push(m)
    const http = createLcuHttp({ port: m.port, password: m.password })
    const buf = await http.getBuffer('/lol-game-data/assets/v1/champion-icons/22.png')
    expect(buf?.equals(png)).toBe(true)
  })

  it('getBuffer 非 2xx 抛 LcuHttpError（带状态码）', async () => {
    const m = await mock(() => ({ json: {} }))
    servers.push(m)
    const http = createLcuHttp({ port: m.port, password: m.password })
    await expect(http.getBuffer('/lol-game-data/assets/v1/champion-icons/9999.png')).rejects.toMatchObject({
      name: 'LcuHttpError',
      status: 404,
    })
  })
})
