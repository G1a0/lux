import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createMockLcu, type MockLcu } from './mock/server'
import { createLcuEventSocket } from './events'
import type { LcuEventMessage } from './types'

const CERT_DIR = join(__dirname, 'fixtures', 'test-certs')
let servers: MockLcu[] = []
afterEach(async () => {
  for (const s of servers.splice(0)) await s.stop()
})

function waitMessage(socket: ReturnType<typeof createLcuEventSocket>, predicate: (m: LcuEventMessage) => boolean, timeoutMs = 3000): Promise<LcuEventMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('等待事件超时')), timeoutMs)
    const off = socket.onMessage(msg => {
      if (predicate(msg)) {
        clearTimeout(timer)
        off()
        resolve(msg)
      }
    })
  })
}

describe('LcuEventSocket', () => {
  it('订阅后收到 mock 推送的事件', async () => {
    const mock = await createMockLcu({ certDir: CERT_DIR, routes: {} })
    servers.push(mock)
    const socket = createLcuEventSocket({ port: mock.port, password: mock.password })
    const ready = new Promise<void>(resolve => socket.onStatus(s => { if (s === 'open') resolve() }))
    socket.connect()
    await ready
    await new Promise(r => setTimeout(r, 50)) // 等 mock 收到 [5,"OnJsonApiEvent"] 订阅帧
    const pending = waitMessage(socket, m => m.uri === '/lol-champ-select/v1/session')
    mock.pushEvent('/lol-champ-select/v1/session', 'Update', { queueId: 420 })
    const msg = await pending
    expect(msg.eventType).toBe('Update')
    expect(msg.data).toEqual({ queueId: 420 })
    socket.close()
  })

  it('断线后自动重连（同一实例，mock 短暂重启）', async () => {
    const mock = await createMockLcu({ certDir: CERT_DIR, routes: {} })
    servers.push(mock)
    const socket = createLcuEventSocket({ port: mock.port, password: mock.password, backoffMs: [50, 100] })
    const statuses: string[] = []
    socket.onStatus(s => statuses.push(s))
    socket.connect()
    await new Promise(r => setTimeout(r, 150))
    mock.closeClients() // 服务端断开所有连接但监听保留
    await new Promise(r => setTimeout(r, 300))
    expect(statuses.filter(s => s === 'open').length).toBeGreaterThanOrEqual(2)
    socket.close()
  })
})
