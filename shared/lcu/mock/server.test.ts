import { readFileSync } from 'node:fs'
import https from 'node:https'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createMockLcu, type MockLcu } from './server'

let servers: MockLcu[] = []
afterEach(async () => {
  for (const s of servers.splice(0)) await s.stop()
})

const CERT_DIR = join(__dirname, '..', 'fixtures', 'test-certs')

describe('MockLcuServer', () => {
  function httpsGet(port: number, path: string, auth: string): Promise<{ status: number; body: string }> {
    return new Promise(resolve => {
      const req = https.get(
        { host: '127.0.0.1', port, path, rejectUnauthorized: false, headers: { Authorization: auth } },
        res => {
          const chunks: Buffer[] = []
          res.on('data', c => chunks.push(c as Buffer))
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf-8') }))
        },
      )
      req.on('error', () => resolve({ status: -1, body: '' }))
    })
  }

  it('启动后写出 lockfile，正确凭据可读 JSON', async () => {
    const mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: {
        '/lol-summoner/v1/current-summoner': { json: { summonerId: 42, displayName: '测试召唤师' } },
      },
    })
    servers.push(mock)

    const lock = readFileSync(join(mock.lcuDir, 'lockfile'), 'utf-8').trim().split(':')
    expect(Number(lock[2])).toBe(mock.port)

    const good = `Basic ${Buffer.from(`riot:${mock.password}`).toString('base64')}`
    const res = await httpsGet(mock.port, '/lol-summoner/v1/current-summoner', good)
    expect(res.status).toBe(200)
    expect(JSON.parse(res.body)).toEqual({ summonerId: 42, displayName: '测试召唤师' })
  })

  it('未注册路由返回 404，错误密码返回 401', async () => {
    const mock = await createMockLcu({ certDir: CERT_DIR, routes: {} })
    servers.push(mock)
    expect((await httpsGet(mock.port, '/nope', 'Basic x')).status).toBe(401)
    const good = `Basic ${Buffer.from(`riot:${mock.password}`).toString('base64')}`
    expect((await httpsGet(mock.port, '/nope', good)).status).toBe(404)
  })
})
