// 应用配置：JSON 落盘在 userData 目录（dev/test 可注入任意目录）。
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface AppConfig {
  /** 候选池仅限"已拥有+本周免费" */
  ownedFilter: boolean
  modes: { rift: boolean; aram: boolean }
  onboarded: boolean
  windowPos: { x: number; y: number } | null
  /** 闪现键位：'d' = 第 1 槽（spell1）、'f' = 第 2 槽（spell2）；快照/携带时归一含闪现的组合 */
  flashKey: 'd' | 'f'
  /** 手动指定的客户端目录；缺省 = 自动发现 */
  lcuDir?: string
}

export const DEFAULT_CONFIG: AppConfig = {
  ownedFilter: true,
  modes: { rift: true, aram: true },
  onboarded: false,
  windowPos: null,
  flashKey: 'f',
}

export interface ConfigStore {
  get(): AppConfig
  /** 浅合并（顶层）；modes 会按子对象合并 */
  set(patch: Partial<AppConfig>): AppConfig
}

export function createConfigStore(dir: string): ConfigStore {
  const file = join(dir, 'config.json')

  function load(): AppConfig {
    try {
      const raw = JSON.parse(readFileSync(file, 'utf-8')) as Partial<AppConfig>
      return {
        ...DEFAULT_CONFIG,
        ...raw,
        modes: { ...DEFAULT_CONFIG.modes, ...(raw.modes ?? {}) },
      }
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  }

  let current = load()

  return {
    get: () => ({ ...current, modes: { ...current.modes } }),
    set(patch) {
      current = {
        ...current,
        ...patch,
        modes: { ...current.modes, ...(patch.modes ?? {}) },
      }
      mkdirSync(dir, { recursive: true })
      const tmp = `${file}.tmp`
      writeFileSync(tmp, JSON.stringify(current, null, 2))
      renameSync(tmp, file)
      return { ...current, modes: { ...current.modes } }
    },
  }
}
