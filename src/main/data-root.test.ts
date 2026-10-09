import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bootstrapDataRoot, resolveDataRoot } from './data-root'

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'lux-dataroot-'))
})

/** 造一个可被 hasData 识别的数据仓：qq101/manifest.json + 一个嵌套文件（验证递归复制） */
function makeWarehouse(dir: string, marker: string): void {
  mkdirSync(join(dir, 'qq101', 'nested'), { recursive: true })
  writeFileSync(join(dir, 'qq101', 'manifest.json'), JSON.stringify({ marker }))
  writeFileSync(join(dir, 'qq101', 'nested', `${marker}.json`), marker)
}

describe('resolveDataRoot', () => {
  it('LUX_DATA_DIR 覆盖一切', () => {
    const envDir = join(root, 'env')
    expect(
      resolveDataRoot({
        envDir,
        isPackaged: true,
        resourcesPath: join(root, 'Lux', 'resources'),
        userDataPath: join(root, 'userData'),
      }),
    ).toBe(envDir)
  })

  it('打包版 → <安装目录>/data（resourcesPath 的上层）', () => {
    expect(
      resolveDataRoot({
        envDir: undefined,
        isPackaged: true,
        resourcesPath: join(root, 'Lux', 'resources'),
        userDataPath: join(root, 'userData'),
      }),
    ).toBe(join(root, 'Lux', 'data'))
  })

  it('开发版 → userData/data', () => {
    const userDataPath = join(root, 'userData')
    expect(
      resolveDataRoot({
        envDir: undefined,
        isPackaged: false,
        resourcesPath: join(root, 'resources'),
        userDataPath,
      }),
    ).toBe(join(userDataPath, 'data'))
  })
})

describe('bootstrapDataRoot', () => {
  it('已有数据保持原样（不迁移、不覆盖）', () => {
    const dataRoot = join(root, 'data')
    makeWarehouse(dataRoot, 'existing')
    writeFileSync(join(dataRoot, 'marker.txt'), 'keep')
    const legacyDir = join(root, 'legacy')
    makeWarehouse(legacyDir, 'legacy')
    writeFileSync(join(legacyDir, 'legacy-only.txt'), 'x')

    expect(bootstrapDataRoot({ dataRoot, legacyDir, seedDir: null, fallbackDir: join(root, 'fallback') })).toBe(dataRoot)
    expect(existsSync(join(dataRoot, 'marker.txt'))).toBe(true)
    expect(existsSync(join(dataRoot, 'legacy-only.txt'))).toBe(false)
    expect(readdirSync(dataRoot).sort()).toEqual(['marker.txt', 'qq101'])
  })

  it('空仓 + 旧版数据 → 迁移旧 userData/data（优先于种子，含嵌套文件）', () => {
    const dataRoot = join(root, 'data')
    const legacyDir = join(root, 'legacy')
    makeWarehouse(legacyDir, 'legacy')
    const seedDir = join(root, 'seed')
    makeWarehouse(seedDir, 'seed')

    expect(bootstrapDataRoot({ dataRoot, legacyDir, seedDir, fallbackDir: join(root, 'fallback') })).toBe(dataRoot)
    expect(existsSync(join(dataRoot, 'qq101', 'manifest.json'))).toBe(true)
    expect(existsSync(join(dataRoot, 'qq101', 'nested', 'legacy.json'))).toBe(true)
    expect(existsSync(join(dataRoot, 'qq101', 'nested', 'seed.json'))).toBe(false)
  })

  it('空仓 + 无旧版 + 内置种子 → 复制种子', () => {
    const dataRoot = join(root, 'data')
    const seedDir = join(root, 'seed')
    makeWarehouse(seedDir, 'seed')

    expect(bootstrapDataRoot({ dataRoot, legacyDir: null, seedDir, fallbackDir: join(root, 'fallback') })).toBe(dataRoot)
    expect(existsSync(join(dataRoot, 'qq101', 'manifest.json'))).toBe(true)
    expect(existsSync(join(dataRoot, 'qq101', 'nested', 'seed.json'))).toBe(true)
  })

  it('空仓且无旧版无种子 → 建空目录，不抛错', () => {
    const dataRoot = join(root, 'data')
    expect(
      bootstrapDataRoot({ dataRoot, legacyDir: null, seedDir: null, fallbackDir: join(root, 'fallback') }),
    ).toBe(dataRoot)
    expect(existsSync(dataRoot)).toBe(true)
    expect(readdirSync(dataRoot)).toEqual([])
  })

  it('主目录不可写（只读）→ 回退 fallbackDir 并复制种子', () => {
    if (typeof process.getuid === 'function' && process.getuid() === 0) return // root 无视权限位
    const dataRoot = join(root, 'readonly')
    mkdirSync(dataRoot)
    chmodSync(dataRoot, 0o555)
    const fallbackDir = join(root, 'fallback')
    const seedDir = join(root, 'seed')
    makeWarehouse(seedDir, 'seed')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(bootstrapDataRoot({ dataRoot, legacyDir: null, seedDir, fallbackDir })).toBe(fallbackDir)
      expect(existsSync(join(fallbackDir, 'qq101', 'manifest.json'))).toBe(true)
      expect(existsSync(join(fallbackDir, 'qq101', 'nested', 'seed.json'))).toBe(true)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('安装目录不可写'))
    } finally {
      chmodSync(dataRoot, 0o755) // 恢复权限，保证临时目录可清理
      warn.mockRestore()
    }
  })
})
