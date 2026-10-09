import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { __resetLockfileScanCacheForTest, discoverLockfile, normalizeLcuDir, parseLockfile } from './lockfile'

describe('normalizeLcuDir', () => {
  it('去首尾空白与引号（英/中文）', () => {
    expect(normalizeLcuDir('  "D:\\WeGameApps\\英雄联盟\\LeagueClient"  ')).toBe('D:\\WeGameApps\\英雄联盟\\LeagueClient')
    expect(normalizeLcuDir('“D:/Games/LoL”')).toBe('D:/Games/LoL')
    expect(normalizeLcuDir("‘D:/Games/LoL’")).toBe('D:/Games/LoL')
  })

  it('去尾部斜杠（反斜杠/正斜杠/多重）', () => {
    expect(normalizeLcuDir('D:\\WeGameApps\\英雄联盟\\LeagueClient\\')).toBe('D:\\WeGameApps\\英雄联盟\\LeagueClient')
    expect(normalizeLcuDir('D:/Games/LoL///')).toBe('D:/Games/LoL')
  })

  it('误填 lockfile 文件路径 → 取父目录（discoverLockfile 端到端同款规整）', () => {
    expect(normalizeLcuDir('D:\\WeGameApps\\英雄联盟\\LeagueClient\\lockfile')).toBe('D:\\WeGameApps\\英雄联盟\\LeagueClient')
    expect(normalizeLcuDir('D:/Games/LoL/lockfile')).toBe('D:/Games/LoL')
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    try {
      writeFileSync(join(dir, 'lockfile'), 'LeagueClient:1:3456:pw:https')
      expect(discoverLockfile({ envDir: join(dir, 'lockfile') })?.port).toBe(3456)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('parseLockfile', () => {
  it('解析 5 段格式', () => {
    expect(parseLockfile('LeagueClient:12345:54321:secretPW:https')).toEqual({
      processName: 'LeagueClient',
      pid: 12345,
      port: 54321,
      password: 'secretPW',
      protocol: 'https',
    })
  })

  it('畸形内容返回 null', () => {
    expect(parseLockfile('a:b:c')).toBeNull()
    expect(parseLockfile('LeagueClient:x:54321:secretPW:https')).toBeNull()
    expect(parseLockfile('')).toBeNull()
  })

  it('校验加固：pid/端口边界与协议白名单', () => {
    expect(parseLockfile('LeagueClient:0:54321:pw:https')).toBeNull()
    expect(parseLockfile('LeagueClient:1:99999:pw:https')).toBeNull()
    expect(parseLockfile('LeagueClient:1:54321:pw:ht')).toBeNull()
    expect(parseLockfile('LeagueClient:1:54321:pw:')).toEqual({
      processName: 'LeagueClient', pid: 1, port: 54321, password: 'pw', protocol: 'https',
    })
  })
})

describe('discoverLockfile', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
  })
  beforeEach(() => __resetLockfileScanCacheForTest())

  it('LUX_LCU_DIR 覆盖优先且读取其中 lockfile 文件', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), 'LeagueClient:1:2345:pw:https')
    const found = discoverLockfile({ envDir: dir })
    expect(found?.port).toBe(2345)
    expect(found?.dir).toBe(dir)
  })

  it('目录无 lockfile 或内容畸形时返回 null', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    expect(discoverLockfile({ envDir: dir })).toBeNull()
    writeFileSync(join(dir, 'lockfile'), 'broken')
    expect(discoverLockfile({ envDir: dir })).toBeNull()
  })

  it('无 override 时按候选路径查找（测试注入候选列表）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), 'LeagueClient:1:9999:pw:https')
    const found = discoverLockfile({ envDir: undefined, candidateDirs: [join(dir, '不存在'), dir] })
    expect(found?.port).toBe(9999)
    expect(found?.dir).toBe(dir)
  })

  it('lockfile 存在但为空（0 字节，客户端未运行时的真实状态）→ null', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), '')
    expect(discoverLockfile({ envDir: dir })).toBeNull()
  })

  it('process.env.LUX_LCU_DIR 作为环境级覆盖生效', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), 'LeagueClient:1:7777:pw:https')
    const prev = process.env.LUX_LCU_DIR
    process.env.LUX_LCU_DIR = dir
    try {
      expect(discoverLockfile()?.port).toBe(7777)
    } finally {
      if (prev === undefined) delete process.env.LUX_LCU_DIR
      else process.env.LUX_LCU_DIR = prev
    }
  })

  it('win32 候选全未命中时按运行进程目录查找（findClientDirs 注入）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), 'LeagueClient:1:4321:pw:https')
    const found = discoverLockfile({
      envDir: undefined,
      candidateDirs: [],
      platform: 'win32',
      findClientDirs: () => [dir],
    })
    expect(found?.port).toBe(4321)
    expect(found?.dir).toBe(dir)
  })

  it('候选命中时不触发进程扫描（避免无谓 powershell 开销）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), 'LeagueClient:1:5555:pw:https')
    let calls = 0
    const found = discoverLockfile({
      envDir: undefined,
      candidateDirs: [dir],
      platform: 'win32',
      findClientDirs: () => {
        calls += 1
        return []
      },
    })
    expect(found?.dir).toBe(dir)
    expect(calls).toBe(0)
  })

  it('进程扫描 30s 限流：限流期内不再扫描，重置后可再扫描', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), 'LeagueClient:1:6666:pw:https')
    let calls = 0
    const opts = {
      envDir: undefined,
      candidateDirs: [],
      platform: 'win32' as const,
      findClientDirs: (): string[] => {
        calls += 1
        return [dir]
      },
    }
    expect(discoverLockfile(opts)?.port).toBe(6666)
    expect(calls).toBe(1)
    expect(discoverLockfile(opts)).toBeNull() // 限流期内：跳过扫描
    expect(calls).toBe(1)
    __resetLockfileScanCacheForTest()
    expect(discoverLockfile(opts)?.port).toBe(6666)
    expect(calls).toBe(2)
  })

  it('非 win32 平台忽略进程扫描', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), 'LeagueClient:1:8888:pw:https')
    let calls = 0
    const found = discoverLockfile({
      envDir: undefined,
      candidateDirs: [],
      platform: 'darwin',
      findClientDirs: () => {
        calls += 1
        return [dir]
      },
    })
    expect(found).toBeNull()
    expect(calls).toBe(0)
  })
})
