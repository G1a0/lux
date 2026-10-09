import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  __resetLockfileScanCacheForTest, discoverLockfile, getLastProcessProbeInfo, normalizeLcuDir,
  parseClientCommandLine, parseLockfile, parseProcessProbeJson, probeLcuDir,
} from './lockfile'
import type { ProcessProbeResult } from './lockfile'

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

  it('拒收启动器（Riot Client）的 lockfile（首字段非 leagueclient）', () => {
    // 国服 Riot Client Data\User Data\Config\lockfile：误连表现为「已连接但永无选人」
    expect(parseLockfile('Riot Client:8812:59887:tok:https')).toBeNull()
    expect(parseLockfile('SomeOtherProcess:1:54321:pw:https')).toBeNull()
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

describe('parseClientCommandLine', () => {
  it('从命令行提取 --app-port 与 --remoting-auth-token（容忍引号与其他参数）', () => {
    const cl = '"D:\\WeGameApps\\英雄联盟（含经典模式）\\LeagueClient\\LeagueClientUx.exe" "--app-port=54231" --app-pid=8812 "--remoting-auth-token=AbC-123_xyZ" --locale=zh_CN --no-rads'
    expect(parseClientCommandLine(cl)).toEqual({ port: 54231, password: 'AbC-123_xyZ' })
  })

  it('缺端口或缺 token → null；端口越界 → null', () => {
    expect(parseClientCommandLine('"--app-port=54231" --foo')).toBeNull()
    expect(parseClientCommandLine('--remoting-auth-token=abc')).toBeNull()
    expect(parseClientCommandLine('--app-port=99999 --remoting-auth-token=abc')).toBeNull()
    expect(parseClientCommandLine('--app-port=0 --remoting-auth-token=abc')).toBeNull()
  })
})

describe('parseProcessProbeJson', () => {
  const item = { ProcessId: 8812, ExecutablePath: 'D:\\x\\LeagueClientUx.exe', CommandLine: '--app-port=1 --remoting-auth-token=t' }
  const mapped = { pid: 8812, exePath: 'D:\\x\\LeagueClientUx.exe', commandLine: '--app-port=1 --remoting-auth-token=t' }

  it('数组与单个对象（ConvertTo-Json 单结果时输出对象而非数组）', () => {
    expect(parseProcessProbeJson(JSON.stringify([item]))).toEqual([mapped])
    expect(parseProcessProbeJson(JSON.stringify(item))).toEqual([mapped])
  })

  it('空串/空白/垃圾文本 → []；字段类型不符置 null', () => {
    expect(parseProcessProbeJson('')).toEqual([])
    expect(parseProcessProbeJson('   ')).toEqual([])
    expect(parseProcessProbeJson('不是 JSON')).toEqual([])
    expect(parseProcessProbeJson(JSON.stringify({ ProcessId: '8812', ExecutablePath: 42, CommandLine: true })))
      .toEqual([{ pid: null, exePath: null, commandLine: null }])
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

  it('win32 候选全未命中时按运行进程目录查找（processProbe 注入）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), 'LeagueClient:1:4321:pw:https')
    const found = discoverLockfile({
      envDir: undefined,
      candidateDirs: [],
      platform: 'win32',
      processProbe: () => ({ entries: [{ dir, pid: process.pid, port: null, password: null }], note: '' }),
    })
    expect(found?.port).toBe(4321)
    expect(found?.dir).toBe(dir)
  })

  it('entry 目录 lockfile 空/缺失但有命令行凭据（pid 存活）→ 合成结果直接连接', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), '') // 国服新版客户端实测：0 字节
    const found = discoverLockfile({
      envDir: undefined,
      candidateDirs: [],
      platform: 'win32',
      processProbe: () => ({ entries: [{ dir, pid: process.pid, port: 41234, password: 'tok-PW_1' }], note: '' }),
    })
    expect(found).toEqual({ processName: 'LeagueClient', pid: process.pid, port: 41234, password: 'tok-PW_1', protocol: 'https', dir })
  })

  it('已退出的进程条目整条跳过（即使目录里有合法 lockfile）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), 'LeagueClient:1:4321:pw:https')
    const deadPid = spawnSync(process.execPath, ['-e', '']).pid
    if (typeof deadPid !== 'number') throw new Error('无法获取已退出进程的 pid')
    const found = discoverLockfile({
      envDir: undefined,
      candidateDirs: [],
      platform: 'win32',
      processProbe: () => ({ entries: [{ dir, pid: deadPid, port: 1, password: 'p' }], note: '' }),
    })
    expect(found).toBeNull()
  })

  it('候选命中时不触发进程探测（避免无谓 powershell 开销）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), 'LeagueClient:1:5555:pw:https')
    let calls = 0
    const found = discoverLockfile({
      envDir: undefined,
      candidateDirs: [dir],
      platform: 'win32',
      processProbe: () => {
        calls += 1
        return { entries: [], note: '' }
      },
    })
    expect(found?.dir).toBe(dir)
    expect(calls).toBe(0)
  })

  it('进程探测 30s 限流：窗口内复用缓存结果（不再重复探测，仍可命中）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    let calls = 0
    const opts = {
      envDir: undefined,
      candidateDirs: [] as string[],
      platform: 'win32' as const,
      processProbe: (): ProcessProbeResult => {
        calls += 1
        return { entries: [{ dir, pid: process.pid, port: 3333, password: 'pw' }], note: '发现 1 个客户端进程（已解析连接参数）' }
      },
    }
    expect(discoverLockfile(opts)?.port).toBe(3333)
    expect(calls).toBe(1)
    expect(discoverLockfile(opts)?.port).toBe(3333) // 限流窗口内：复用缓存而非跳过
    expect(calls).toBe(1)
    __resetLockfileScanCacheForTest()
    expect(discoverLockfile(opts)?.port).toBe(3333)
    expect(calls).toBe(2)
  })

  it('getLastProcessProbeInfo 暴露最近一次探测摘要（诊断用）', () => {
    expect(getLastProcessProbeInfo()).toBeNull()
    const probe: ProcessProbeResult = { entries: [], note: '未发现正在运行的 LeagueClientUx / LeagueClient 进程' }
    discoverLockfile({ envDir: undefined, candidateDirs: [], platform: 'win32', processProbe: () => probe })
    expect(getLastProcessProbeInfo()?.note).toBe('未发现正在运行的 LeagueClientUx / LeagueClient 进程')
  })

  it('非 win32 平台忽略进程探测', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), 'LeagueClient:1:8888:pw:https')
    let calls = 0
    const found = discoverLockfile({
      envDir: undefined,
      candidateDirs: [],
      platform: 'darwin',
      processProbe: () => {
        calls += 1
        return { entries: [{ dir, pid: process.pid, port: null, password: null }], note: '' }
      },
    })
    expect(found).toBeNull()
    expect(calls).toBe(0)
  })
})

describe('probeLcuDir', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
  })

  it('目录不存在 → dirExists false，其余为空', () => {
    const probe = probeLcuDir(join(tmpdir(), `lux-lcu-missing-${Date.now()}`))
    expect(probe.dirExists).toBe(false)
    expect(probe.lockfileExists).toBe(false)
    expect(probe.lockfileSize).toBeNull()
    expect(probe.lockfileMtimeMs).toBeNull()
    expect(probe.processName).toBeNull()
    expect(probe.contentIssue).toBeNull()
    expect(probe.parsed).toBe(false)
  })

  it('目录存在但无 lockfile', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    const probe = probeLcuDir(dir)
    expect(probe.dirExists).toBe(true)
    expect(probe.lockfileExists).toBe(false)
    expect(probe.lockfileSize).toBeNull()
    expect(probe.contentIssue).toBeNull()
    expect(probe.parsed).toBe(false)
  })

  it('空文件（0 字节）→ empty（含大小与 mtime）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), '')
    const probe = probeLcuDir(dir)
    expect(probe.lockfileExists).toBe(true)
    expect(probe.lockfileSize).toBe(0)
    expect(probe.lockfileMtimeMs).toBeTypeOf('number')
    expect(probe.contentIssue).toBe('empty')
    expect(probe.parsed).toBe(false)
  })

  it('Riot Client（启动器）的 lockfile → foreign + processName', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), 'Riot Client:8812:59887:tok:https')
    const probe = probeLcuDir(dir)
    expect(probe.contentIssue).toBe('foreign')
    expect(probe.processName).toBe('Riot Client')
    expect(probe.parsed).toBe(false)
  })

  it('合法 LeagueClient lockfile → parsed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), 'LeagueClient:123:456:pw:https')
    const probe = probeLcuDir(dir)
    expect(probe.dirExists).toBe(true)
    expect(probe.lockfileExists).toBe(true)
    expect(probe.contentIssue).toBeNull()
    expect(probe.processName).toBeNull()
    expect(probe.parsed).toBe(true)
  })
})
