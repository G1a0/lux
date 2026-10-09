import { describe, expect, it } from 'vitest'
import { createAppWithPaths } from './app'
import type { AdviceSource } from './service'

function fakeSource(): AdviceSource {
  return {
    start: () => {},
    stop: () => {},
    onAdvice: () => () => {},
    onStatus: () => () => {},
    http: () => null,
    readers: () => null,
  }
}

describe('createAppWithPaths', () => {
  it('装配出 service 且 manifestReader 可调用（空仓返回 null）', () => {
    const { service } = createAppWithPaths(
      { configDir: '/tmp/lux-app-cfg', dataRoot: '/tmp/lux-app-data-none' },
      { createSource: fakeSource },
    )
    expect(service.getManifest()).toBeNull()
    expect(service.getConfig().ownedFilter).toBe(true)
    service.stop()
  })
})
