// LCU REST 客户端：node:https（自签证书放行、Basic 认证、超时、JSON 编解码）。
// 不用 fetch：undici 对自签需额外 dispatcher，且 LCU 恒为本机 https。
import { request } from 'node:https'

export class LcuHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
  ) {
    super(`LCU ${path} responded ${status}`)
    this.name = 'LcuHttpError'
  }
}

export interface LcuHttpOptions {
  port: number
  password: string
  timeoutMs?: number
}

export interface LcuHttp {
  get<T>(path: string): Promise<T | null>
  post<T>(path: string, body?: unknown): Promise<T | null>
  put<T>(path: string, body?: unknown): Promise<T | null>
  patch<T>(path: string, body?: unknown): Promise<T | null>
  del<T>(path: string): Promise<T | null>
}

export function createLcuHttp(options: LcuHttpOptions): LcuHttp {
  const timeoutMs = options.timeoutMs ?? 3000
  const auth = `Basic ${Buffer.from(`riot:${options.password}`).toString('base64')}`

  function send<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    return new Promise<T | null>((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body)
      const req = request(
        {
          host: '127.0.0.1',
          port: options.port,
          path,
          method,
          rejectUnauthorized: false,
          headers: {
            Authorization: auth,
            Accept: 'application/json',
            ...(payload === undefined ? {} : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }),
          },
        },
        res => {
          const chunks: Buffer[] = []
          res.on('data', c => chunks.push(c as Buffer))
          res.on('end', () => {
            const status = res.statusCode ?? 0
            if (status === 204 || chunks.length === 0) {
              if (status >= 200 && status < 300) resolve(null)
              else reject(new LcuHttpError(status, path))
              return
            }
            if (status < 200 || status >= 300) {
              reject(new LcuHttpError(status, path))
              return
            }
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')) as T)
            } catch {
              reject(new Error(`LCU ${path}: 响应非 JSON`))
            }
          })
        },
      )
      req.setTimeout(timeoutMs, () => req.destroy(new Error(`LCU ${path}: 超时`)))
      req.on('error', reject)
      if (payload !== undefined) req.write(payload)
      req.end()
    })
  }

  return {
    get: (path) => send('GET', path),
    post: (path, body) => send('POST', path, body),
    put: (path, body) => send('PUT', path, body),
    patch: (path, body) => send('PATCH', path, body),
    del: (path) => send('DELETE', path),
  }
}
