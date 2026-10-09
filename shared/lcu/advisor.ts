// 编排：发现 lockfile → 连接（REST+WSS）→ 会话存在时防抖重算 → 回调建议；
// 客户端消失/断线 → 退避重连、静默等待，不打扰用户。
import { discoverLockfile, getLastProcessProbeInfo, normalizeLcuDir, probeLcuDir, type LcuDirProbe } from './lockfile'
import { createLcuHttp, type LcuHttp } from './http'
import { createLcuEventSocket, type LcuEventSocket } from './events'
import { createLcuReaders, type LcuReaders } from './readers'
import type { ChampSelectSession } from './types'

export type AdvisorStatus = 'waiting' | 'connected' | 'in-champ-select'

export interface AdviceSnapshot {
  kind: 'rift' | 'aram'
  sessionQueueId: number
  session: ChampSelectSession
  /** 由外部（CLI/UI）注入的引擎计算产物；编排层不关心内容 */
  advice?: unknown
}

export type ComputeAdvice = (
  session: ChampSelectSession,
) => Omit<AdviceSnapshot, 'session'> | Promise<Omit<AdviceSnapshot, 'session'>>

export interface LcuAdvisorOptions {
  /** 手动指定 lockfile 目录；函数形式支持动态读取（设置页改动免重启） */
  lcuDirOverride?: string | (() => string | undefined)
  discoverIntervalMs?: number
  debounceMs?: number
  compute: ComputeAdvice
}

export interface LcuAdvisor {
  start(): void
  stop(): void
  onAdvice(handler: (snapshot: AdviceSnapshot) => void): () => void
  onStatus(handler: (status: AdvisorStatus) => void): () => void
  /** 测试用：动态改指向的 lockfile 目录 */
  setLcuDirForTest(dir: string): void
  http(): LcuHttp | null
  readers(): LcuReaders | null
  /** 连接诊断（UI 展示用）：当前状态、命中目录/端口、最近一次请求错误、当前指定目录（正在探测的目标，自动发现时为 null）；
   *  targetProbe：等待态且指定了目录时该目录的 lockfile 探测详情（排障）；processNote：最近一次进程探测摘要（脱敏）。 */
  info(): {
    status: AdvisorStatus
    lockDir: string | null
    port: number | null
    lastError: string | null
    targetDir: string | null
    targetProbe: LcuDirProbe | null
    processNote: string | null
  }
}

export function createLcuAdvisor(options: LcuAdvisorOptions): LcuAdvisor {
  const discoverIntervalMs = options.discoverIntervalMs ?? 5000
  const debounceMs = options.debounceMs ?? 300

  // 手动目录每次连接尝试重新解析（getter 支持设置页改动免重启）；测试 setLcuDirForTest 注入的值优先
  let testOverrideDir: string | undefined = undefined
  function resolveOverrideDir(): string | undefined {
    const override = testOverrideDir
      ?? (typeof options.lcuDirOverride === 'function' ? options.lcuDirOverride() : options.lcuDirOverride)
    const resolved = override?.trim() ? normalizeLcuDir(override) : undefined
    return resolved || undefined
  }
  let lcuDir: string | undefined = undefined // 最近一次解析出的手动目录；tick 存活检查沿用（connected 期间不因设置改动抖断）
  // 当前指定目录（诊断展示：正在探测哪个目录；自动发现时保持 null）
  let targetDir: string | null = null
  // 命中目录记忆（tryConnect 成功时记录，含进程扫描回退）：lcuDir 未设置时供 tick 存活检查兜底。
  // 否则 tick 会以 undefined 重扫候选（miss）→ 进程扫描（30s 限流内直接 miss）→ 误判客户端已退出，闪连；不随 disconnect 清空。
  let discoveredDir: string | null = null
  let http: LcuHttp | null = null
  let readers: LcuReaders | null = null
  let socket: LcuEventSocket | null = null
  let discoverTimer: ReturnType<typeof setInterval> | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let status: AdvisorStatus = 'waiting'
  let running = false
  let consecutiveFailures = 0
  // 连接诊断：连接成功记录命中目录/端口；请求失败记录最近错误（UI 反馈用，排障时无远程调试也能看）
  let info: { lockDir: string; port: number } | null = null
  let lastError: string | null = null

  const adviceHandlers = new Set<(snapshot: AdviceSnapshot) => void>()
  const statusHandlers = new Set<(status: AdvisorStatus) => void>()

  function setStatus(next: AdvisorStatus): void {
    if (status === next) return
    status = next
    statusHandlers.forEach(h => h(next))
  }

  /** 断开并回到等待态（客户端退出/崩溃自愈路径；下个 tick 会重扫 lockfile） */
  function disconnect(): void {
    socket?.close()
    socket = null
    http = null
    readers = null
    info = null // 断连后路径信息失效；lastError 保留供 UI 展示最近失败原因
    consecutiveFailures = 0
    setStatus('waiting')
  }

  let evaluating = false
  let pendingRerun = false

  async function evaluate(): Promise<void> {
    if (!readers) return
    if (evaluating) {
      pendingRerun = true // 单飞：进行中则安排尾随重算
      return
    }
    evaluating = true
    try {
      let session: ChampSelectSession | null
      try {
        session = await readers.getChampSelectSession()
        consecutiveFailures = 0
        lastError = null
      } catch (error) {
        // 客户端崩溃/重启常见于 lockfile 残留：连续失败即断开重扫（密码/端口已变）
        lastError = String(error)
        consecutiveFailures += 1
        if (consecutiveFailures >= 3) disconnect()
        return
      }
      if (!session) {
        setStatus('connected')
        return
      }
      setStatus('in-champ-select')
      // 计算/回调属消费方代码：其异常不得冒泡为未处理拒绝（void evaluate）
      try {
        const advice = await options.compute(session)
        const snapshot: AdviceSnapshot = { ...advice, session }
        adviceHandlers.forEach(h => h(snapshot))
      } catch (error) {
        console.warn('[lcu] 建议计算失败：', error)
      }
    } finally {
      evaluating = false
      if (pendingRerun) {
        pendingRerun = false
        scheduleEvaluate()
      }
    }
  }

  function scheduleEvaluate(): void {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => { void evaluate() }, debounceMs)
  }

  async function tryConnect(): Promise<boolean> {
    lcuDir = resolveOverrideDir() // 定期重解析：设置页保存后数秒内自动生效
    targetDir = lcuDir ?? null
    const lock = discoverLockfile({ envDir: lcuDir })
    if (!lock) return false

    discoveredDir = lock.dir
    info = { lockDir: lock.dir, port: lock.port }
    lastError = null
    http = createLcuHttp({ port: lock.port, password: lock.password })
    readers = createLcuReaders(http)
    setStatus('connected')

    socket = createLcuEventSocket({ port: lock.port, password: lock.password })
    socket.onMessage(message => {
      if (message.uri === '/lol-champ-select/v1/session') scheduleEvaluate()
    })
    socket.onStatus(s => {
      if (s === 'closed' && running) scheduleEvaluate()
    })
    socket.connect()
    scheduleEvaluate()
    return true
  }

  return {
    start() {
      running = true
      // 广播初始状态：首个 tick 前订阅者也需要拿到基线（否则客户端缺席时 onStatus 永远无事件）
      statusHandlers.forEach(h => h(status))
      void tryConnect()
      discoverTimer = setInterval(() => {
        if (!running) return
        if (http === null) {
          void tryConnect().then(ok => { if (!ok) setStatus('waiting') })
        } else {
          // 客户端可能已退出：lockfile 消失 → 断开重等（lcuDir 未设置时用记住的命中目录，避免进程扫描限流误判）
          const still = discoverLockfile({ envDir: lcuDir ?? discoveredDir ?? undefined })
          if (!still) {
            disconnect()
          } else {
            // 周期性刷新（补事件丢失）+ 失败计数由 evaluate 内部自愈
            scheduleEvaluate()
          }
        }
      }, discoverIntervalMs)
    },
    stop() {
      running = false
      if (discoverTimer) clearInterval(discoverTimer)
      if (debounceTimer) clearTimeout(debounceTimer)
      disconnect()
    },
    onAdvice(handler) {
      adviceHandlers.add(handler)
      return () => adviceHandlers.delete(handler)
    },
    onStatus(handler) {
      statusHandlers.add(handler)
      return () => statusHandlers.delete(handler)
    },
    setLcuDirForTest(dir: string) {
      testOverrideDir = dir
    },
    http: () => http,
    readers: () => readers,
    info: () => ({
      status,
      lockDir: info?.lockDir ?? null,
      port: info?.port ?? null,
      lastError,
      targetDir,
      // 等待态才探测：连接成功后目录内容如何已无诊断价值，且每次 info() 都做同步 IO
      targetProbe: status === 'waiting' && targetDir ? probeLcuDir(targetDir) : null,
      processNote: getLastProcessProbeInfo()?.note ?? null,
    }),
  }
}
