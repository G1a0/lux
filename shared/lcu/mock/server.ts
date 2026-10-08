// Mock LCU：HTTPS +（Task 5 追加）WSS，场景驱动、记录收到的写请求。
// 仅供测试与 dev CLI；绝不打包进生产入口（3B 打包时排除 shared/lcu/mock）。
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:https'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'

export interface MockRouteResult {
  status?: number
  json?: unknown
  /** 动态处理：拿到请求体返回结果 */
  handler?: (body: unknown, req: IncomingMessage) => { status?: number; json?: unknown }
}

export interface MockLcuOptions {
  certDir: string
  routes: Record<string, MockRouteResult>
  password?: string
  /** 是否启用 WSS 事件通道（默认 true） */
  wssEnabled?: boolean
}

export interface ReceivedRequest {
  method: string
  url: string
  body: unknown
}

export interface MockLcu {
  port: number
  password: string
  lcuDir: string
  received: ReceivedRequest[]
  server: Server
  /** 向所有已订阅（发过 [5,"OnJsonApiEvent"] 帧）的连接推送 [8,...] 事件 */
  pushEvent(uri: string, eventType: string, data: unknown): void
  /** 断开所有 WS 客户端（监听保留，模拟 LCU 重启） */
  closeClients(): void
  stop(): Promise<void>
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  if (chunks.length === 0) return undefined
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'))
  } catch {
    return undefined
  }
}

export async function createMockLcu(options: MockLcuOptions): Promise<MockLcu> {
  const password = options.password ?? 'mock-password'
  const received: ReceivedRequest[] = []
  const cert = readFileSync(join(options.certDir, 'cert.pem'))
  const key = readFileSync(join(options.certDir, 'key.pem'))

  const server = createServer({ cert, key }, async (req: IncomingMessage, res: ServerResponse) => {
    const auth = req.headers.authorization ?? ''
    const expected = `Basic ${Buffer.from(`riot:${password}`).toString('base64')}`
    if (auth !== expected) {
      res.writeHead(401).end()
      return
    }

    const url = (req.url ?? '/').split('?')[0]
    const body = await readBody(req)
    if (req.method !== 'GET') received.push({ method: req.method ?? 'GET', url, body })

    const route = options.routes[url]
    if (!route) {
      res.writeHead(404).end()
      return
    }
    const result = route.handler ? route.handler(body, req) : { status: route.status, json: route.json }
    const status = result.status ?? 200
    if (status === 204 || result.json === undefined) {
      res.writeHead(status).end()
      return
    }
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(result.json))
  })

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0

  // WSS 事件通道：与 HTTPS 共享同一端口（upgrade 请求）。自签证书由客户端 rejectUnauthorized:false 放行。
  const wss = options.wssEnabled === false ? null : new WebSocketServer({ server, path: '/' })
  const subscribed = new Set<WebSocket>()
  if (wss) {
    wss.on('connection', client => {
      client.on('message', raw => {
        try {
          const msg = JSON.parse(String(raw)) as unknown
          if (Array.isArray(msg) && msg[0] === 5) subscribed.add(client)
        } catch {
          // 非 JSON 消息忽略
        }
      })
      client.on('close', () => subscribed.delete(client))
    })
  }

  const lcuDir = mkdtempSync(join(tmpdir(), 'lux-mock-lcu-'))
  writeFileSync(join(lcuDir, 'lockfile'), `LeagueClient:1:${port}:${password}:https`)

  function pushEvent(uri: string, eventType: string, data: unknown): void {
    const frame = JSON.stringify([8, 'OnJsonApiEvent', { uri, eventType, data }])
    for (const client of subscribed) {
      if (client.readyState === client.OPEN) client.send(frame)
    }
  }

  function closeClients(): void {
    if (!wss) return
    for (const client of wss.clients) client.terminate()
  }

  async function stop(): Promise<void> {
    closeClients() // 先断开客户端，避免 wss.close 等待悬挂连接
    if (wss) await new Promise<void>(resolve => wss.close(() => resolve()))
    await new Promise<void>(resolve => server.close(() => resolve()))
    rmSync(lcuDir, { recursive: true, force: true })
  }

  return { port, password, lcuDir, received, server, pushEvent, closeClients, stop }
}
