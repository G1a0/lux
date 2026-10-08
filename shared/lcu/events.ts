// LCU 事件通道：WAMP 子集（订阅 OnJsonApiEvent，收 [8, 'OnJsonApiEvent', payload]）。
// 断线自动重连，退避阶梯可注入（测试用短阶梯）。
import WebSocket from 'ws'
import type { LcuEventMessage } from './types'

export type SocketStatus = 'connecting' | 'open' | 'closed'

export interface LcuEventSocketOptions {
  port: number
  password: string
  /** 重连退避阶梯（毫秒），耗尽后停在最后一档循环 */
  backoffMs?: number[]
}

export interface LcuEventSocket {
  connect(): void
  close(): void
  onMessage(handler: (message: LcuEventMessage) => void): () => void
  onStatus(handler: (status: SocketStatus) => void): () => void
}

export function createLcuEventSocket(options: LcuEventSocketOptions): LcuEventSocket {
  const backoff = options.backoffMs ?? [1000, 2000, 5000, 10000, 30000]
  const messageHandlers = new Set<(message: LcuEventMessage) => void>()
  const statusHandlers = new Set<(status: SocketStatus) => void>()
  let ws: WebSocket | null = null
  let backoffIndex = 0
  let closedByUser = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const emitStatus = (status: SocketStatus) => statusHandlers.forEach(h => h(status))

  function open(): void {
    if (closedByUser) return // 迟到的重连回调：用户已显式关闭
    emitStatus('connecting')
    const auth = Buffer.from(`riot:${options.password}`).toString('base64')
    const socket = new WebSocket(`wss://127.0.0.1:${options.port}/`, ['wamp'], {
      rejectUnauthorized: false,
      headers: { Authorization: `Basic ${auth}` },
    })
    ws = socket

    socket.on('open', () => {
      if (ws !== socket) return // 过期连接（已被替换或用户关闭）
      backoffIndex = 0
      socket.send(JSON.stringify([5, 'OnJsonApiEvent']))
      emitStatus('open')
    })

    socket.on('message', raw => {
      if (ws !== socket) return
      try {
        const msg = JSON.parse(String(raw)) as unknown
        if (Array.isArray(msg) && msg[0] === 8 && msg[1] === 'OnJsonApiEvent') {
          const payload = msg[2] as { uri?: string; eventType?: string; data?: unknown } | undefined
          if (typeof payload?.uri === 'string') {
            for (const handler of messageHandlers) {
              handler({ uri: payload.uri, eventType: payload.eventType ?? '', data: payload.data })
            }
          }
        }
      } catch {
        // 非 JSON 消息忽略
      }
    })

    socket.on('close', () => {
      if (ws !== socket) return // 过期连接的 close 事件，不参与状态与重连
      ws = null
      emitStatus('closed')
      if (closedByUser) return
      const delay = backoff[Math.min(backoffIndex, backoff.length - 1)]
      backoffIndex += 1
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        open()
      }, delay)
    })

    socket.on('error', () => {
      // close 事件会随后触发重连
    })
  }

  return {
    connect() {
      closedByUser = false
      open()
    },
    close() {
      closedByUser = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    },
    onMessage(handler) {
      messageHandlers.add(handler)
      return () => messageHandlers.delete(handler)
    },
    onStatus(handler) {
      statusHandlers.add(handler)
      return () => statusHandlers.delete(handler)
    },
  }
}
