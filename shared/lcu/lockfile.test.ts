import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { discoverLockfile, parseLockfile } from './lockfile'

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

  it('LUX_LCU_DIR 覆盖优先且读取其中 lockfile 文件', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lux-lcu-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'lockfile'), 'LeagueClient:1:2345:pw:https')
    const found = discoverLockfile({ envDir: dir })
    expect(found?.port).toBe(2345)
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
})
