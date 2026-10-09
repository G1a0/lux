import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createConfigStore, type AppConfig } from './config'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'lux-cfg-'))
})

describe('configStore', () => {
  it('默认值 + 落盘 + 重新加载', () => {
    const store = createConfigStore(dir)
    expect(store.get()).toEqual({
      ownedFilter: true,
      modes: { rift: true, aram: true },
      onboarded: false,
      windowPos: null,
    })

    store.set({ onboarded: true, windowPos: { x: 100, y: 200 } })
    const reloaded = createConfigStore(dir).get()
    expect(reloaded.onboarded).toBe(true)
    expect(reloaded.windowPos).toEqual({ x: 100, y: 200 })
  })

  it('文件损坏时回落默认值', () => {
    const store = createConfigStore(dir)
    store.set({ ownedFilter: false })
    const file = join(dir, 'config.json')
    writeFileSync(file, 'not-json')
    expect(createConfigStore(dir).get().ownedFilter).toBe(true)
  })

  it('set 为浅合并（modes 子对象合并）', () => {
    const store = createConfigStore(dir)
    store.set({ modes: { rift: false, aram: true } })
    expect(store.get().modes).toEqual({ rift: false, aram: true })
    const patch: Partial<AppConfig> = { modes: { rift: false, aram: true } }
    expect(patch.modes?.aram).toBe(true)
  })
})
