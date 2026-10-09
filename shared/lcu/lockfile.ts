// LCU lockfile：定位与解析。真实路径候选覆盖国服/国际服常见安装位置
// （国服 WeGame 实测路径：D:\WeGameApps\英雄联盟\LeagueClient 含 lockfile）；
// 调用方可通过 envDir 选项覆盖（测试 / 非默认安装 / dev CLI）。
// Windows 上候选全未命中时，按「正在运行的 LeagueClientUx 进程」定位安装目录（30s 限流）。
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export interface LcuLockfile {
  processName: string
  pid: number
  port: number
  password: string
  protocol: string
}

export interface DiscoveredLockfile extends LcuLockfile {
  dir: string
}

const DEFAULT_CANDIDATES = [
  '/mnt/c/Riot Games/League of Legends',
  'C:/Riot Games/League of Legends',
  'C:/Program Files/League of Legends',
  '/mnt/d/WeGameApps/英雄联盟/LeagueClient',
  'D:/WeGameApps/英雄联盟/LeagueClient',
  '/mnt/d/WeGameApps/英雄联盟/Game',
  'D:/WeGameApps/英雄联盟/Game',
  'C:/WeGameApps/英雄联盟/LeagueClient',
  'E:/WeGameApps/英雄联盟/LeagueClient',
  'F:/WeGameApps/英雄联盟/LeagueClient',
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
  /** 测试注入；默认 win32 用 PowerShell 查 LeagueClientUx 进程路径 */
  findClientDirs?: () => string[]
  platform?: NodeJS.Platform
}

/** 进程扫描限流：powershell 启动开销大，30s 内至多一次 */
const PROCESS_SCAN_THROTTLE_MS = 30_000
let lastProcessScanAt = 0

/** 测试钩子：重置进程扫描限流状态 */
export function __resetLockfileScanCacheForTest(): void {
  lastProcessScanAt = 0
}

function findClientDirsByProcess(): string[] {
  try {
    // Path 展开后按行拼接；Get-Process 失败（未运行）时为空串 → 空列表
    const output = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-Command', '(Get-Process LeagueClientUx,LeagueClient -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path) -join "`n"'],
      { timeout: 3000, windowsHide: true },
    ).toString()
    const dirs = output
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(exePath => dirname(exePath))
    return [...new Set(dirs)]
  } catch {
    return []
  }
}

function tryReadLockfile(dir: string): DiscoveredLockfile | null {
  try {
    const parsed = parseLockfile(readFileSync(join(dir, 'lockfile'), 'utf-8'))
    return parsed ? { ...parsed, dir } : null
  } catch {
    return null // 目录/文件不存在：继续找下一个
  }
}

export function discoverLockfile(options: DiscoverOptions = {}): DiscoveredLockfile | null {
  const envDir = options.envDir ?? process.env.LUX_LCU_DIR
  const dirs = envDir ? [envDir] : (options.candidateDirs ?? DEFAULT_CANDIDATES)
  for (const dir of dirs) {
    const found = tryReadLockfile(dir)
    if (found) return found
  }
  // 候选全未命中：win32 下按运行中的客户端进程找目录（限流 30s）
  const platform = options.platform ?? process.platform
  if (platform !== 'win32') return null
  const now = Date.now()
  if (now - lastProcessScanAt < PROCESS_SCAN_THROTTLE_MS) return null
  lastProcessScanAt = now
  const findDirs = options.findClientDirs ?? findClientDirsByProcess
  for (const dir of findDirs()) {
    const found = tryReadLockfile(dir)
    if (found) return found
  }
  return null
}
