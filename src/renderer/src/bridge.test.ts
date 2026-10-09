// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createInertBridge, getBridge } from './bridge'

describe('bridge', () => {
  it('无 window.lux 时降级为惰性桥（不抛错）', async () => {
    delete (window as { lux?: unknown }).lux
    const b = getBridge()
    expect(await b.applySpells()).toBe(false)
    expect(await b.getManifest()).toBeNull()
    expect(() => b.setWindowState('main')).not.toThrow()
  })

  it('有 window.lux 时透传', () => {
    ;(window as unknown as { lux: unknown }).lux = { ping: () => 'pong' }
    expect((getBridge() as unknown as { ping(): string }).ping()).toBe('pong')
    delete (window as { lux?: unknown }).lux
    expect(() => createInertBridge()).not.toThrow()
  })
})
