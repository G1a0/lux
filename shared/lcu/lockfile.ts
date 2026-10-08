// LCU lockfile：定位与解析。真实路径候选覆盖国服/国际服常见安装位置；
// 测试与 mock 用 LUX_LCU_DIR 覆盖。
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
  if (!Number.isInteger(pid) || !Number.isInteger(port) || port <= 0) return null
  if (!fields[3]) return null
  return {
    processName: fields[0],
    pid,
    port,
    password: fields[3],
    protocol: fields[4] || 'https',
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
