import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createMockLcu, type MockLcu } from './mock/server'
import { createLcuAdvisor } from './advisor'
import type { AdviceSnapshot } from './advisor'

const CERT_DIR = join(__dirname, 'fixtures', 'test-certs')
const fixture = (name: string) => JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf-8')) as Record<string, unknown>

let servers: MockLcu[] = []
afterEach(async () => { for (const s of servers.splice(0)) await s.stop() })

function waitFor<T>(probe: () => T | null, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const tick = () => {
      const value = probe()
      if (value !== null) return resolve(value)
      if (Date.now() - started > timeoutMs) return reject(new Error('等待超时'))
      setTimeout(tick, 20)
    }
    tick()
  })
}

describe('LcuAdvisor', () => {
  it('连接 mock → 进入选人 → 触发一次建议（含会话快照）', async () => {
    const mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: {
        '/lol-champ-select/v1/session': { json: fixture('session-draft-mid.json') },
      },
    })
    servers.push(mock)

    const snapshots: AdviceSnapshot[] = []
    const advisor = createLcuAdvisor({
      lcuDirOverride: mock.lcuDir,
      discoverIntervalMs: 50,
      debounceMs: 30,
      compute: session => ({ kind: 'rift', sessionQueueId: session.queueId }),
    })
    advisor.onAdvice(s => snapshots.push(s))
    advisor.start()

    const first = await waitFor(() => snapshots[0] ?? null)
    expect(first.kind).toBe('rift')
    expect(first.sessionQueueId).toBe(420)
    advisor.stop()
  })

  it('客户端不在（无 lockfile）时静默等待，出现后自动连上', async () => {
    // 先起 advisor 指向一个不存在的目录
    const statuses: string[] = []
    const advisor = createLcuAdvisor({
      lcuDirOverride: '/tmp/lux-lcu-not-exist',
      discoverIntervalMs: 50,
      debounceMs: 30,
      compute: session => ({ kind: 'rift', sessionQueueId: session.queueId }),
    })
    advisor.onStatus(s => statuses.push(s))
    advisor.start()
    await new Promise(r => setTimeout(r, 100))
    expect(statuses.at(-1)).toBe('waiting')

    // 再启动 mock 并把 advisor 指过去（重扫目录生效）
    const mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: { '/lol-champ-select/v1/session': { json: fixture('session-draft-mid.json') } },
    })
    servers.push(mock)
    advisor.setLcuDirForTest(mock.lcuDir)
    await waitFor(() => (statuses.includes('in-champ-select') ? true : null))
    advisor.stop()
  })

  it('服务中断但 lockfile 仍在（客户端崩溃残留）→ 连续失败后自愈回等待态', async () => {
    const mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: { '/lol-champ-select/v1/session': { json: fixture('session-draft-mid.json') } },
    })
    servers.push(mock)

    const statuses: string[] = []
    const advisor = createLcuAdvisor({
      lcuDirOverride: mock.lcuDir,
      discoverIntervalMs: 30,
      debounceMs: 10,
      compute: session => ({ kind: 'rift', sessionQueueId: session.queueId }),
    })
    advisor.onStatus(s => statuses.push(s))
    advisor.start()
    await waitFor(() => (statuses.includes('in-champ-select') ? true : null))

    await mock.stopServing() // 停服务但保留 lockfile（模拟崩溃残留）
    await waitFor(() => (statuses.at(-1) === 'waiting' ? true : null), 5000)
    expect(statuses.at(-1)).toBe('waiting') // 连续请求失败 ≥3 → 断开自愈
    advisor.stop()
  })
})
