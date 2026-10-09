// 编排：发现 lockfile → 连接（REST+WSS）→ 会话存在时防抖重算 → 回调建议；
// 客户端消失/断线 → 退避重连、静默等待，不打扰用户。
import { discoverLockfile } from './lockfile'
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
  lcuDirOverride?: string
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
}

export function createLcuAdvisor(options: LcuAdvisorOptions): LcuAdvisor {
  const discoverIntervalMs = options.discoverIntervalMs ?? 5000
  const debounceMs = options.debounceMs ?? 300

  let lcuDir = options.lcuDirOverride
  let http: LcuHttp | null = null
  let readers: LcuReaders | null = null
  let socket: LcuEventSocket | null = null
  let discoverTimer: ReturnType<typeof setInterval> | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let status: AdvisorStatus = 'waiting'
  let running = false
  let consecutiveFailures = 0

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
      } catch {
        // 客户端崩溃/重启常见于 lockfile 残留：连续失败即断开重扫（密码/端口已变）
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
    const lock = discoverLockfile({ envDir: lcuDir })
    if (!lock) return false

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
          // 客户端可能已退出：lockfile 消失 → 断开重等
          const still = discoverLockfile({ envDir: lcuDir })
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
      lcuDir = dir
    },
    http: () => http,
    readers: () => readers,
  }
}
