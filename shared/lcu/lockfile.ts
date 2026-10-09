// LCU lockfile：定位与解析。真实路径候选覆盖国服/国际服常见安装位置
// （国服 WeGame 实测路径：D:\WeGameApps\英雄联盟\LeagueClient 含 lockfile）；
// 调用方可通过 envDir 选项覆盖（测试 / 非默认安装 / dev CLI）。
// Windows 上候选全未命中时，按「正在运行的 LeagueClientUx 进程」定位安装目录与连接凭据
// （30s 限流；国服新版客户端 lockfile 可能为 0 字节，凭据只能从进程命令行取）。
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync, type Stats } from 'node:fs'
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
  '/mnt/d/WeGameApps/英雄联盟（含经典模式）/LeagueClient',
  'D:/WeGameApps/英雄联盟（含经典模式）/LeagueClient',
  'C:/WeGameApps/英雄联盟（含经典模式）/LeagueClient',
  'E:/WeGameApps/英雄联盟（含经典模式）/LeagueClient',
  'F:/WeGameApps/英雄联盟（含经典模式）/LeagueClient',
  '/mnt/d/WeGameApps/英雄联盟（含经典模式）/Game',
  'D:/WeGameApps/英雄联盟（含经典模式）/Game',
]

/** 规整用户提供的目录：去首尾空白与引号（英/中文）、去尾斜杠、若误填了 lockfile 文件路径则取其父目录。 */
export function normalizeLcuDir(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim()
  s = s.replace(/[\\/]+$/g, '')
  s = s.replace(/[\\/]lockfile$/i, '')
  return s
}

export function parseLockfile(content: string): LcuLockfile | null {
  const fields = content.trim().split(':')
  if (fields.length !== 5) return null
  // 只认游戏客户端的 lockfile：国服 `Riot Client Data\User Data\Config\lockfile`
  // 属于启动器（首字段 `Riot Client`），其 API 不提供 /lol-* 端点——误连会表现为
  // 「已连接但永远等不到选人」，必须拒收。
  if (!/leagueclient/i.test(fields[0])) return null
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

export interface ProcessClientEntry {
  dir: string | null
  pid: number | null
  port: number | null
  password: string | null
}

export interface ProcessProbeResult {
  entries: ProcessClientEntry[]
  /** UI 诊断文案；**绝不允许包含 token 或命令行原文** */
  note: string
}

/** 从进程命令行提取 LCU 连接参数：`--app-port=NNNNN` + `--remoting-auth-token=TOKEN`（缺一即 null）。 */
export function parseClientCommandLine(commandLine: string): { port: number; password: string } | null {
  const portMatch = /--app-port=(\d+)/.exec(commandLine)
  const tokenMatch = /--remoting-auth-token=([A-Za-z0-9_-]+)/.exec(commandLine)
  if (!portMatch || !tokenMatch) return null
  const port = Number(portMatch[1])
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null
  return { port, password: tokenMatch[1] }
}

/** 解析 PowerShell `ConvertTo-Json` 输出（兼容单个对象或数组；空串/坏 JSON → []；字段类型不符置 null）。 */
export function parseProcessProbeJson(raw: string): Array<{ pid: number | null; exePath: string | null; commandLine: string | null }> {
  if (raw.trim() === '') return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  const items = Array.isArray(parsed) ? parsed : [parsed]
  return items.map(item => {
    const record = item !== null && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const pid = typeof record.ProcessId === 'number' && Number.isInteger(record.ProcessId) ? record.ProcessId : null
    const exePath = typeof record.ExecutablePath === 'string' && record.ExecutablePath.length > 0 ? record.ExecutablePath : null
    const commandLine = typeof record.CommandLine === 'string' && record.CommandLine.length > 0 ? record.CommandLine : null
    return { pid, exePath, commandLine }
  })
}

/** 解析 wmic `/format:list` 输出：`Key=Value` 行、空行分块、按首个 `=` 切分。 */
function parseWmicProcessList(raw: string): Array<{ pid: number | null; exePath: string | null; commandLine: string | null }> {
  return raw
    .split(/\r?\n\r?\n/)
    .map(block => block.trim())
    .filter(block => block.length > 0)
    .map(block => {
      const record: Record<string, string> = {}
      for (const line of block.split(/\r?\n/)) {
        const at = line.indexOf('=')
        if (at <= 0) continue
        record[line.slice(0, at).trim()] = line.slice(at + 1).trim()
      }
      const pidNum = record.ProcessId ? Number(record.ProcessId) : NaN
      return {
        pid: Number.isInteger(pidNum) && pidNum > 0 ? pidNum : null,
        exePath: record.ExecutablePath || null,
        commandLine: record.CommandLine || null,
      }
    })
    // 有 pid 但字段全空的块也要保留：权限受限进程正是这种形态（rawCount 靠它区分「没有进程」与「有进程读不到」）
    .filter(item => item.pid !== null || item.exePath !== null || item.commandLine !== null)
}

/** 解析宽查输出（`Get-CimInstance Win32_Process` 按名称匹配后仅取 Name）：单对象/数组兼容；空串/坏 JSON → []。 */
export function parseBroadProcessNames(raw: string): string[] {
  if (raw.trim() === '') return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  const items = Array.isArray(parsed) ? parsed : [parsed]
  return items.flatMap(item => {
    const name = item !== null && typeof item === 'object' ? (item as Record<string, unknown>).Name : null
    return typeof name === 'string' ? [name] : []
  })
}

/** 宽查：列出名称含 league/riot 的进程名（仅精确查询 0 结果时的诊断用；**不取命令行，防泄露 token**）。失败 → null。 */
function probeBroadProcessNames(): string[] | null {
  const psCommand = `[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'league|riot' } | Select-Object ProcessId,Name | ConvertTo-Json -Compress`
  try {
    const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', psCommand], { timeout: 4000, windowsHide: true }).toString()
    return parseBroadProcessNames(output)
  } catch {
    return null
  }
}

/** 组装进程探测诊断文案（纯函数便于测试；**输出绝不包含 token 或命令行原文**）。 */
export function buildProcessProbeNote(input: {
  /** 精确查询解析出的原始条目数（映射丢弃前）：>0 但 entries 空 = 有进程但读不到字段（典型：权限受限） */
  rawCount: number
  entries: ProcessClientEntry[]
  /** null = 宽查未执行/失败（旧「未发现」文案）；[] = 宽查执行但没扫到 */
  broadNames: string[] | null
  /** 两种探测方法都失败时的错误摘要 */
  error: string | null
}): string {
  const { rawCount, entries, broadNames, error } = input
  if (error !== null) return `进程探测失败：${error.slice(0, 80)}`
  if (rawCount === 0) {
    if (broadNames === null) return '未发现正在运行的 LeagueClientUx / LeagueClient 进程'
    return broadNames.length > 0
      ? `未发现 LeagueClientUx / LeagueClient 进程（扫到名称含 league/riot 的进程：${broadNames.slice(0, 6).join('、')}）`
      : '未发现 LeagueClientUx / LeagueClient 进程（名称含 league/riot 的进程也没有）'
  }
  if (entries.length === 0) {
    return `发现 ${rawCount} 个客户端进程，但无法读取其路径与命令行（客户端可能以管理员权限运行）——请右键 Lux 图标「以管理员身份运行」后重试`
  }
  return entries.some(e => e.port !== null && e.password !== null)
    ? `发现 ${entries.length} 个客户端进程（已解析连接参数）`
    : `发现 ${entries.length} 个客户端进程（未解析出连接参数；若客户端以管理员运行，请以管理员运行 Lux）`
}

/**
 * 探测运行中的客户端进程（同步，Windows 专用）：首选 PowerShell CIM 拿
 * ExecutablePath + CommandLine，失败时退到 wmic。命令行含 `--app-port`/
 * `--remoting-auth-token`——国服 0 字节 lockfile 时凭据的唯一来源。
 */
export function probeClientProcessesByCommandLine(): ProcessProbeResult {
  // UTF-8 前置：中文 Windows 默认 GBK 输出会把「英雄联盟」路径打成乱码
  const psCommand = `[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-CimInstance Win32_Process -Filter "Name='LeagueClientUx.exe' or Name='LeagueClient.exe'" | Select-Object ProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress`
  let records: Array<{ pid: number | null; exePath: string | null; commandLine: string | null }> | null = null
  try {
    const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', psCommand], { timeout: 4000, windowsHide: true }).toString()
    records = parseProcessProbeJson(output)
  } catch {
    // PowerShell 不可用（AV 拦截/不存在）：退到 wmic（老系统仍有）
  }
  if (records === null) {
    try {
      const output = execFileSync(
        'wmic',
        ['process', 'where', "name='LeagueClientUx.exe' or name='LeagueClient.exe'", 'get', 'ProcessId,ExecutablePath,CommandLine', '/format:list'],
        { timeout: 4000, windowsHide: true },
      ).toString()
      records = parseWmicProcessList(output)
    } catch (error) {
      return { entries: [], note: buildProcessProbeNote({ rawCount: 0, entries: [], broadNames: null, error: String(error) }) }
    }
  }
  const rawCount = records.length // 映射丢弃前：0 = 名都没扫到；>0 但 entries 空 = 有进程但字段读不到（权限受限）
  const entries: ProcessClientEntry[] = []
  for (const record of records) {
    const dir = record.exePath ? dirname(record.exePath) : null
    const creds = record.commandLine ? parseClientCommandLine(record.commandLine) : null
    if (record.exePath === null && creds === null) continue // 既无路径又无凭据：无价值（权限受限进程即此形态）
    entries.push({ dir, pid: record.pid, port: creds?.port ?? null, password: creds?.password ?? null })
  }
  entries.sort((a, b) => Number(b.port !== null) - Number(a.port !== null)) // 带凭据的排前面
  // 精确查询 0 条：宽查名称含 league/riot 的进程（仅诊断：列名字，定位进程名不匹配；不取命令行）
  const broadNames = rawCount === 0 ? probeBroadProcessNames() : null
  return { entries, note: buildProcessProbeNote({ rawCount, entries, broadNames, error: null }) }
}

export interface DiscoverOptions {
  envDir?: string
  candidateDirs?: string[]
  /** 测试注入；默认 win32 用 PowerShell CIM/wmic 探测进程（目录 + 命令行凭据） */
  processProbe?: () => ProcessProbeResult
  platform?: NodeJS.Platform
}

/** 进程扫描限流：powershell 启动开销大，30s 内至多一次；窗口内复用缓存结果 */
const PROCESS_SCAN_THROTTLE_MS = 30_000
let lastProcessScanAt = 0
let lastProcessProbe: ProcessProbeResult | null = null

/** 测试钩子：重置进程扫描限流与缓存状态 */
export function __resetLockfileScanCacheForTest(): void {
  lastProcessScanAt = 0
  lastProcessProbe = null
}

/** 最近一次进程探测结果（诊断展示用；不含量敏信息——note 已脱敏）。 */
export function getLastProcessProbeInfo(): ProcessProbeResult | null {
  return lastProcessProbe
}

/** 存活检查：防缓存里已退出的进程把 UI 连到死端口（Windows 上 kill(pid,0) 即 liveness 探针）。 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
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
  // 用户手填路径常带引号/尾斜杠/误贴 lockfile 全路径：规整后再探测（自动发现路径不受影响）
  const rawDir = options.envDir ?? process.env.LUX_LCU_DIR
  const envDir = rawDir?.trim() ? normalizeLcuDir(rawDir) : undefined
  const dirs = envDir ? [envDir] : (options.candidateDirs ?? DEFAULT_CANDIDATES)
  for (const dir of dirs) {
    const found = tryReadLockfile(dir)
    if (found) return found
  }
  // 候选全未命中：win32 下按运行中的客户端进程找目录/凭据（限流 30s，窗口内复用缓存）
  const platform = options.platform ?? process.platform
  if (platform !== 'win32') return null
  const now = Date.now()
  let probe: ProcessProbeResult | null
  if (now - lastProcessScanAt < PROCESS_SCAN_THROTTLE_MS) {
    probe = lastProcessProbe
  } else {
    lastProcessScanAt = now
    probe = (options.processProbe ?? probeClientProcessesByCommandLine)()
    lastProcessProbe = probe
  }
  for (const entry of probe?.entries ?? []) {
    if (entry.pid !== null && !isProcessAlive(entry.pid)) continue // 已退出的进程：整条跳过
    if (entry.dir) {
      const found = tryReadLockfile(entry.dir)
      if (found) return found
    }
    // lockfile 空/缺失（国服新版客户端）但有命令行凭据：直接合成
    // （连接只需 port+password；dir 仅展示/存活用——权限受限时读不到路径，可为空串）
    if (entry.port !== null && entry.password !== null) {
      return { processName: 'LeagueClient', pid: entry.pid ?? 0, port: entry.port, password: entry.password, protocol: 'https', dir: entry.dir ?? '' }
    }
  }
  return null
}

export interface LcuDirProbe {
  dir: string
  dirExists: boolean
  lockfileExists: boolean
  lockfileSize: number | null
  lockfileMtimeMs: number | null
  processName: string | null
  /** lockfile 存在但不可用：'empty'（0 字节/空内容）| 'invalid'（读失败或格式非法）| 'foreign'（属于 Riot Client 等非游戏客户端）| null（可用） */
  contentIssue: 'empty' | 'invalid' | 'foreign' | null
  parsed: boolean
}

/** 诊断用户指定目录的 lockfile 状况（UI 展示；不做连接）。 */
export function probeLcuDir(dir: string): LcuDirProbe {
  const probe: LcuDirProbe = {
    dir,
    dirExists: false,
    lockfileExists: false,
    lockfileSize: null,
    lockfileMtimeMs: null,
    processName: null,
    contentIssue: null,
    parsed: false,
  }
  let dirStat: Stats
  try {
    dirStat = statSync(dir)
  } catch {
    return probe
  }
  if (!dirStat.isDirectory()) return probe
  probe.dirExists = true
  let lockStat: Stats
  try {
    lockStat = statSync(join(dir, 'lockfile'))
  } catch {
    return probe
  }
  probe.lockfileExists = true
  probe.lockfileSize = lockStat.size
  probe.lockfileMtimeMs = lockStat.mtimeMs
  let content: string | null = null
  try {
    content = readFileSync(join(dir, 'lockfile'), 'utf-8')
  } catch {
    // size>0 但读失败（被占用/权限）：invalid
  }
  if (content === null) {
    probe.contentIssue = 'invalid'
    return probe
  }
  if (lockStat.size === 0 || content.trim() === '') {
    probe.contentIssue = 'empty'
    return probe
  }
  const fields = content.trim().split(':')
  if (fields.length === 5 && !/leagueclient/i.test(fields[0])) {
    probe.processName = fields[0]
    probe.contentIssue = 'foreign'
    return probe
  }
  if (!parseLockfile(content)) {
    probe.contentIssue = 'invalid'
    return probe
  }
  probe.parsed = true
  return probe
}
