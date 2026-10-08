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
})
