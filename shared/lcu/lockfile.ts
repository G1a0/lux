// LCU lockfile：定位与解析。真实路径候选覆盖国服/国际服常见安装位置
// （国服 WeGame 实测路径：D:\WeGameApps\英雄联盟\LeagueClient 含 lockfile）；
// 调用方可通过 envDir 选项覆盖（测试 / 非默认安装 / dev CLI）。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface LcuLockfile {
  processName: string
  pid: number
  port: number
  password: string
  protocol: string
}

const DEFAULT_CANDIDATES = [
  '/mnt/c/Riot Games/League of Legends',
  'C:/Riot Games/League of Legends',
  'C:/Program Files/League of Legends',
  '/mnt/d/WeGameApps/英雄联盟/LeagueClient',
  'D:/WeGameApps/英雄联盟/LeagueClient',
  '/mnt/d/WeGameApps/英雄联盟/Game',
  'D:/WeGameApps/英雄联盟/Game',
]

export function parseLockfile(content: string): LcuLockfile | null {
  const fields = content.trim().split(':')
  if (fields.length !== 5) return null
  const pid = Number(fields[1])
  const port = Number(fields[2])
  if (!Number.isInteger(pid) || pid <= 0) return null
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return null
  if (!fields[3]) return null
  const protocol = fields[4] || 'https'
  if (protocol !== 'http' && protocol !== 'https') return null // 撕裂读/异常内容不容错
  return {
    processName: fields[0],
    pid,
    port,
    password: fields[3],
    protocol,
  }
}

export interface DiscoverOptions {
  envDir?: string
  candidateDirs?: string[]
}

export function discoverLockfile(options: DiscoverOptions = {}): LcuLockfile | null {
  const dirs = options.envDir ? [options.envDir] : (options.candidateDirs ?? DEFAULT_CANDIDATES)
  for (const dir of dirs) {
    try {
      const parsed = parseLockfile(readFileSync(join(dir, 'lockfile'), 'utf-8'))
      if (parsed) return parsed
    } catch {
      // 目录/文件不存在：继续找下一个
    }
  }
  return null
}
