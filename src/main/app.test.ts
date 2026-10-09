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
    const app = createAppWithPaths(
      { configDir: '/tmp/lux-app-cfg', dataRoot: '/tmp/lux-app-data-none' },
      { createSource: fakeSource },
    )
    expect(app.service.getManifest()).toBeNull()
    expect(app.service.getConfig().ownedFilter).toBe(true)
    expect(app.lcuInfo()).toBeNull() // 注入假源：无 LCU 诊断
    app.service.stop()
  })
})
