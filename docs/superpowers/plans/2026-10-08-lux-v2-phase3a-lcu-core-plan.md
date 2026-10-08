# Lux v2 Phase 3A（LCU 集成核心）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付与游戏客户端（LCU）对接的完整核心：发现/连接/重连、选人会话与事件订阅、英雄元数据（名称/定位/伤害类型/难度）读取、会话→引擎上下文映射、符文页与召唤师技能写入，并以 Mock LCU + dev CLI 全链路离线验收。

**Architecture:** 全部为纯 Node/TS 模块（`shared/lcu/`），**不含 Electron**（Electron 壳与 UI 属 3B，另行立项）。LCU 通信 = node:https REST（Basic 认证 + 自签放行）+ `ws` 实现的 WAMP 子集（`OnJsonApiEvent` 订阅）；用 `LcuAdvisor` 编排「发现→连接→事件→防抖重算→回调输出」，引擎与数据仓沿用 Phase 1/2 成品并保持注入式解耦。测试环境没有真实客户端（Win10 不支持 WSL 镜像网络），因此 **MockLcuServer**（HTTPS+WSS、场景脚本、请求记录）是全量验收载体。

**Tech Stack:** TypeScript(ESM) + vitest + 新增依赖 `ws` + `@types/ws`；测试证书用 openssl 一次性生成并入库（自签、仅测试用途）。

**范围说明（用户已确认）：**
- 本计划 = 3A：LCU 核心 + Mock + dev CLI。**不含** Electron/窗口/托盘/设置页/打包（3B）。
- **暂不真机实测**：验收 = Mock 回放全自动测试 + dev CLI 冒烟输出；真机联调（开客户端）留待以后。
- 写入只做两类（设计 §6）：符文页应用、召唤师技能携带；**不做任何代打行为**。
- 日志/输出不落真实账号敏感信息；mock 证书与 fixture 均脱敏虚构。

**端点与协议依据（来自归档 `archive/pengu-loader-plugin`，已在 2026-05 真机验证过）：**
- `GET /lol-champ-select/v1/session`（类型见 `shared/lcu/types.ts`，含 `queueId`/`benchChampions`/`rerollsRemaining`/`bans`）
- `GET /lol-summoner/v1/current-summoner` → `summonerId`
- `GET /lol-champions/v1/inventories/{summonerId}/champions` → `[{id, ownership:{owned}}]`
- `GET /lol-game-data/assets/v1/champion-summary.json` → `[{id,name,alias,roles?}]`
- `GET /lol-game-data/assets/v1/champions/{id}.json` → `{tacticalInfo:{damageType}, playstyleInfo?{difficulty}, roles?}`；伤害类型映射 `kDamageTypeMagic→ap / kDamageTypePhysical→ad / kDamageTypeMixed→mixed`
- 事件：WSS + wamp 子集，发 `[5,"OnJsonApiEvent"]` 订阅，收 `[8,"OnJsonApiEvent",{uri,eventType,data}]`
- Lockfile：`进程名:pid:端口:密码:协议`，路径候选 + `LUX_LCU_DIR` 覆盖

---

### Task 1: lockfile 解析与发现

**Files:**
- Create: `shared/lcu/lockfile.ts`
- Test: `shared/lcu/lockfile.test.ts`

- [ ] **Step 1: 写失败测试 `shared/lcu/lockfile.test.ts`**

```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/lcu/lockfile.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `shared/lcu/lockfile.ts`**

```ts
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
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/lcu/lockfile.test.ts`
Expected: PASS（5 条）

- [ ] **Step 5: 提交**

```bash
git add shared/lcu/lockfile.ts shared/lcu/lockfile.test.ts
git commit -m "feat: add lcu lockfile discovery and parsing"
```

---

### Task 2: LCU 类型（会话/召唤师/事件）

**Files:**
- Create: `shared/lcu/types.ts`

（纯类型，无独立测试；由后续任务的测试覆盖。）

- [ ] **Step 1: 写 `shared/lcu/types.ts`**

```ts
// LCU 数据契约：移植自已验证的归档实现（archive/pengu-loader-plugin:src/types/lcu.ts），
// 仅保留本阶段所需部分。

export interface ChampSelectPlayer {
  assignedPosition: string
  cellId: number
  championId: number
  championPickIntent: number
  summonerId: number
  puuid: string
  team: number
  spell1Id: number
  spell2Id: number
}

export interface ChampSelectAction {
  actorCellId: number
  championId: number
  completed: boolean
  id: number
  isAllyAction: boolean
  isInProgress: boolean
  type: string
}

export interface ChampSelectSession {
  actions: ChampSelectAction[][]
  benchChampions: { championId: number; isPriority: boolean }[]
  benchEnabled: boolean
  localPlayerCellId: number
  myTeam: ChampSelectPlayer[]
  theirTeam: ChampSelectPlayer[]
  queueId: number
  rerollsRemaining: number
  timer: {
    phase: string
    adjustedTimeLeftInPhase: number
    totalTimeInPhase: number
  }
  bans: {
    myTeamBans: number[]
    theirTeamBans: number[]
    numBans: number
  }
}

export interface SummonerInfo {
  summonerId: number
  displayName: string
}

export interface ChampionOwnershipEntry {
  id: number
  ownership: { owned: boolean }
}

export interface ChampionSummaryEntry {
  id: number
  name: string
  alias: string
  roles?: string[]
}

export interface ChampionDetail {
  id: number
  tacticalInfo?: { damageType?: string }
  playstyleInfo?: { difficulty?: number }
  roles?: string[]
}

export interface FreeRotationInfo {
  freeChampionIds: number[]
  freeChampionIdsForNewPlayers: number[]
  maxNewPlayerLevel: number
}

export interface LcuEventMessage {
  data: unknown
  eventType: string
  uri: string
}

/** 本应用支持的模式（超出则不出建议） */
export const SUPPORTED_QUEUE_IDS: readonly number[] = [400, 420, 430, 440, 450]
```

- [ ] **Step 2: 验证与提交**

Run: `npm run typecheck`
Expected: 0 错误。

```bash
git add shared/lcu/types.ts
git commit -m "feat: add lcu data contracts (session, summoner, events)"
```

---

### Task 3: 测试证书 + MockLcuServer 骨架（HTTPS REST + lockfile）

**Files:**
- Create: `shared/lcu/fixtures/test-certs/cert.pem`、`key.pem`（openssl 生成，自签，仅测试）
- Create: `shared/lcu/mock/server.ts`
- Test: `shared/lcu/mock/server.test.ts`
- Modify: `package.json`（新增依赖）

- [ ] **Step 1: 安装依赖**

```bash
npm i ws && npm i -D @types/ws
```

Expected: `ws` 进 dependencies、`@types/ws` 进 devDependencies。

- [ ] **Step 2: 生成并提交测试证书**

```bash
mkdir -p shared/lcu/fixtures/test-certs && cd shared/lcu/fixtures/test-certs
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 3650 -subj '/CN=lux-mock-lcu'
cd -
```

Expected: 两个文件生成；`openssl` 缺失时先 `sudo apt install openssl`（本机一般已装）。

- [ ] **Step 3: 写失败测试 `shared/lcu/mock/server.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createMockLcu, type MockLcu } from './server'

let servers: MockLcu[] = []
afterEach(async () => {
  for (const s of servers.splice(0)) await s.stop()
})

const CERT_DIR = join(__dirname, '..', 'fixtures', 'test-certs')

describe('MockLcuServer', () => {
  function httpsGet(port: number, path: string, auth: string): Promise<{ status: number; body: string }> {
    return new Promise(resolve => {
      const req = https.get(
        { host: '127.0.0.1', port, path, rejectUnauthorized: false, headers: { Authorization: auth } },
        res => {
          const chunks: Buffer[] = []
          res.on('data', c => chunks.push(c as Buffer))
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf-8') }))
        },
      )
      req.on('error', () => resolve({ status: -1, body: '' }))
    })
  }

  it('启动后写出 lockfile，正确凭据可读 JSON', async () => {
    const mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: {
        '/lol-summoner/v1/current-summoner': { json: { summonerId: 42, displayName: '测试召唤师' } },
      },
    })
    servers.push(mock)

    const lock = readFileSync(join(mock.lcuDir, 'lockfile'), 'utf-8').trim().split(':')
    expect(Number(lock[2])).toBe(mock.port)

    const good = `Basic ${Buffer.from(`riot:${mock.password}`).toString('base64')}`
    const res = await httpsGet(mock.port, '/lol-summoner/v1/current-summoner', good)
    expect(res.status).toBe(200)
    expect(JSON.parse(res.body)).toEqual({ summonerId: 42, displayName: '测试召唤师' })
  })

  it('未注册路由返回 404，错误密码返回 401', async () => {
    const mock = await createMockLcu({ certDir: CERT_DIR, routes: {} })
    servers.push(mock)
    expect((await httpsGet(mock.port, '/nope', 'Basic x')).status).toBe(401)
    const good = `Basic ${Buffer.from(`riot:${mock.password}`).toString('base64')}`
    expect((await httpsGet(mock.port, '/nope', good)).status).toBe(404)
  })
})
```

（测试顶部 import 需包含：`import { readFileSync } from 'node:fs'`、`import https from 'node:https'`、`import { join } from 'node:path'`。）

- [ ] **Step 4: 运行确认失败**

Run: `npx vitest run shared/lcu/mock/server.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 5: 实现 `shared/lcu/mock/server.ts`**

```ts
// Mock LCU：HTTPS +（Task 5 追加）WSS，场景驱动、记录收到的写请求。
// 仅供测试与 dev CLI；绝不打包进生产入口（3B 打包时排除 shared/lcu/mock）。
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:https'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

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

  const lcuDir = mkdtempSync(join(tmpdir(), 'lux-mock-lcu-'))
  writeFileSync(join(lcuDir, 'lockfile'), `LeagueClient:1:${port}:${password}:https`)

  return {
    port,
    password,
    lcuDir,
    received,
    server,
    async stop() {
      await new Promise<void>(resolve => server.close(() => resolve()))
      rmSync(lcuDir, { recursive: true, force: true })
    },
  }
}
```

- [ ] **Step 6: 运行确认通过**

Run: `npx vitest run shared/lcu/mock/server.test.ts`
Expected: PASS（2 条，fetch 一处已按上方说明改用 https.get）

Run: `npm run test && npm run typecheck`
Expected: 全量 PASS、0 错误。

- [ ] **Step 7: 提交**

```bash
git add package.json package-lock.json shared/lcu/fixtures/test-certs shared/lcu/mock/server.ts shared/lcu/mock/server.test.ts
git commit -m "feat: add mock lcu server (https rest) and test certs"
```

---

### Task 4: LCU HTTP 客户端

**Files:**
- Create: `shared/lcu/http.ts`
- Test: `shared/lcu/http.test.ts`

- [ ] **Step 1: 写失败测试 `shared/lcu/http.test.ts`**

```ts
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createMockLcu, type MockLcu } from './mock/server'
import { LcuHttpError, createLcuHttp } from './http'

const CERT_DIR = join(__dirname, 'fixtures', 'test-certs')
let servers: MockLcu[] = []
afterEach(async () => {
  for (const s of servers.splice(0)) await s.stop()
})

function mock(late: () => { json?: unknown; status?: number }): Promise<MockLcu> {
  return createMockLcu({
    certDir: CERT_DIR,
    routes: { '/lol-summoner/v1/current-summoner': { handler: () => late() } },
  })
}

describe('createLcuHttp', () => {
  it('GET 返回 JSON', async () => {
    const m = await mock(() => ({ json: { summonerId: 7, displayName: 'x' } }))
    servers.push(m)
    const http = createLcuHttp({ port: m.port, password: m.password })
    expect(await http.get('/lol-summoner/v1/current-summoner')).toEqual({ summonerId: 7, displayName: 'x' })
  })

  it('204 返回 null；非 2xx 抛 LcuHttpError（带状态码）', async () => {
    const m = await mock(() => ({ status: 204 }))
    servers.push(m)
    const http = createLcuHttp({ port: m.port, password: m.password })
    expect(await http.get('/lol-summoner/v1/current-summoner')).toBeNull()
    await expect(http.get('/nope')).rejects.toMatchObject({ name: 'LcuHttpError', status: 404 })
    expect(new LcuHttpError(404, '/x').status).toBe(404)
  })

  it('PUT 发送 JSON 体', async () => {
    const m = await mock(() => ({ json: { ok: true } }))
    servers.push(m)
    const http = createLcuHttp({ port: m.port, password: m.password })
    await http.put('/lol-perks/v1/currentpage', { name: 'x' })
    expect(m.received).toContainEqual({ method: 'PUT', url: '/lol-perks/v1/currentpage', body: { name: 'x' } })
  })

  it('连接失败抛错（端口无人监听）', async () => {
    const http = createLcuHttp({ port: 1, password: 'x', timeoutMs: 500 })
    await expect(http.get('/x')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/lcu/http.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `shared/lcu/http.ts`**

```ts
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
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/lcu/http.test.ts`
Expected: PASS（4 条）

- [ ] **Step 5: 提交**

```bash
git add shared/lcu/http.ts shared/lcu/http.test.ts
git commit -m "feat: add lcu http client over node:https"
```

---

### Task 5: WAMP 事件通道（mock WSS + 客户端 + 重连退避）

**Files:**
- Modify: `shared/lcu/mock/server.ts`（追加 WSS 支持与 `pushEvent`）
- Create: `shared/lcu/events.ts`
- Test: `shared/lcu/events.test.ts`

- [ ] **Step 1: 写失败测试 `shared/lcu/events.test.ts`**

```ts
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createMockLcu, type MockLcu } from './mock/server'
import { createLcuEventSocket } from './events'
import type { LcuEventMessage } from './types'

const CERT_DIR = join(__dirname, 'fixtures', 'test-certs')
let servers: MockLcu[] = []
afterEach(async () => {
  for (const s of servers.splice(0)) await s.stop()
})

function waitMessage(socket: ReturnType<typeof createLcuEventSocket>, predicate: (m: LcuEventMessage) => boolean, timeoutMs = 3000): Promise<LcuEventMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('等待事件超时')), timeoutMs)
    const off = socket.onMessage(msg => {
      if (predicate(msg)) {
        clearTimeout(timer)
        off()
        resolve(msg)
      }
    })
  })
}

describe('LcuEventSocket', () => {
  it('订阅后收到 mock 推送的事件', async () => {
    const mock = await createMockLcu({ certDir: CERT_DIR, routes: {} })
    servers.push(mock)
    const socket = createLcuEventSocket({ port: mock.port, password: mock.password })
    const ready = new Promise<void>(resolve => socket.onStatus(s => { if (s === 'open') resolve() }))
    socket.connect()
    await ready
    await new Promise(r => setTimeout(r, 50)) // 等 mock 收到 [5,"OnJsonApiEvent"] 订阅帧
    const pending = waitMessage(socket, m => m.uri === '/lol-champ-select/v1/session')
    mock.pushEvent('/lol-champ-select/v1/session', 'Update', { queueId: 420 })
    const msg = await pending
    expect(msg.eventType).toBe('Update')
    expect(msg.data).toEqual({ queueId: 420 })
    socket.close()
  })

  it('断线后自动重连（同一实例，mock 短暂重启）', async () => {
    const mock = await createMockLcu({ certDir: CERT_DIR, routes: {} })
    servers.push(mock)
    const socket = createLcuEventSocket({ port: mock.port, password: mock.password, backoffMs: [50, 100] })
    const statuses: string[] = []
    socket.onStatus(s => statuses.push(s))
    socket.connect()
    await new Promise(r => setTimeout(r, 150))
    mock.closeClients() // 服务端断开所有连接但监听保留
    await new Promise(r => setTimeout(r, 300))
    expect(statuses.filter(s => s === 'open').length).toBeGreaterThanOrEqual(2)
    socket.close()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/lcu/events.test.ts`
Expected: FAIL（`pushEvent`/`closeClients`/`createLcuEventSocket` 不存在）

- [ ] **Step 3: 扩展 mock（`shared/lcu/mock/server.ts`）**

- `MockLcuOptions` 增加可选 `wssEnabled?: boolean`（默认 true）。
- `MockLcu` 接口增加：`pushEvent(uri: string, eventType: string, data: unknown): void` 与 `closeClients(): void`。
- 实现：`import { WebSocketServer } from 'ws'`；`const wss = new WebSocketServer({ server, path: '/', verifyClient: ... })`——自签场景由客户端 `rejectUnauthorized:false` 处理，服务端直接共享 https server。
- 连接建立后等待客户端发 `[5,"OnJsonApiEvent"]`（JSON.parse 后 `Array.isArray(msg) && msg[0] === 5`）→ 记入 `subscribed` 集合。
- `pushEvent`：对所有已订阅连接 `send(JSON.stringify([8, 'OnJsonApiEvent', { uri, eventType, data }]))`。
- `closeClients`：遍历 wss.clients 调用 `terminate()`。
- `stop()` 中追加 `wss.close()`。

- [ ] **Step 4: 实现 `shared/lcu/events.ts`**

```ts
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
    closedByUser = false
    emitStatus('connecting')
    const auth = Buffer.from(`riot:${options.password}`).toString('base64')
    ws = new WebSocket(`wss://127.0.0.1:${options.port}/`, ['wamp'], {
      rejectUnauthorized: false,
      headers: { Authorization: `Basic ${auth}` },
    })

    ws.on('open', () => {
      backoffIndex = 0
      ws?.send(JSON.stringify([5, 'OnJsonApiEvent']))
      emitStatus('open')
    })

    ws.on('message', raw => {
      try {
        const msg = JSON.parse(String(raw)) as unknown
        if (Array.isArray(msg) && msg[0] === 8 && msg[1] === 'OnJsonApiEvent') {
          const payload = msg[2] as { uri?: string; eventType?: string; data?: unknown }
          if (typeof payload?.uri === 'string') {
            messageHandlers.forEach(h => h({ uri: payload.uri!, eventType: payload.eventType ?? '', data: payload.data }))
          }
        }
      } catch {
        // 非 JSON 消息忽略
      }
    })

    ws.on('close', () => {
      ws = null
      emitStatus('closed')
      if (closedByUser) return
      const delay = backoff[Math.min(backoffIndex, backoff.length - 1)]
      backoffIndex += 1
      reconnectTimer = setTimeout(open, delay)
    })

    ws.on('error', () => {
      // close 事件会随后触发重连
    })
  }

  return {
    connect: open,
    close() {
      closedByUser = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
      ws = null
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
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run shared/lcu/events.test.ts`
Expected: PASS（2 条）

- [ ] **Step 6: 提交**

```bash
git add shared/lcu/mock/server.ts shared/lcu/events.ts shared/lcu/events.test.ts
git commit -m "feat: add lcu wamp event socket with reconnect and mock wss"
```

---

### Task 6: 会话数据读取层（REST readers）

**Files:**
- Create: `shared/lcu/readers.ts`
- Create: `shared/lcu/fixtures/session-draft-mid.json`、`session-aram.json`、`owned-champions.json`、`free-rotation.json`
- Test: `shared/lcu/readers.test.ts`

- [ ] **Step 1: 写 fixtures**

`shared/lcu/fixtures/session-draft-mid.json`（虚构脱敏；420 排位中单，我方已选中单已定，敌我各有已选与 ban）：

```json
{
  "actions": [[
    { "actorCellId": 3, "championId": 0, "completed": true, "id": 1, "isAllyAction": false, "isInProgress": false, "type": "ban" },
    { "actorCellId": 1, "championId": 0, "completed": true, "id": 2, "isAllyAction": true, "isInProgress": false, "type": "ban" }
  ], [
    { "actorCellId": 2, "championId": 84, "completed": true, "id": 3, "isAllyAction": false, "isInProgress": false, "type": "pick" },
    { "actorCellId": 1, "championId": 123, "completed": true, "id": 4, "isAllyAction": true, "isInProgress": false, "type": "pick" }
  ]],
  "benchChampions": [],
  "benchEnabled": false,
  "localPlayerCellId": 1,
  "myTeam": [
    { "assignedPosition": "top", "cellId": 0, "championId": 86, "championPickIntent": 0, "summonerId": 11, "puuid": "p-0", "team": 1, "spell1Id": 4, "spell2Id": 12 },
    { "assignedPosition": "middle", "cellId": 1, "championId": 0, "championPickIntent": 0, "summonerId": 12, "puuid": "p-1", "team": 1, "spell1Id": 4, "spell2Id": 14 },
    { "assignedPosition": "jungle", "cellId": 2, "championId": 64, "championPickIntent": 0, "summonerId": 13, "puuid": "p-2", "team": 1, "spell1Id": 4, "spell2Id": 11 }
  ],
  "theirTeam": [
    { "assignedPosition": "", "cellId": 5, "championId": 112, "championPickIntent": 0, "summonerId": 21, "puuid": "e-0", "team": 2, "spell1Id": 4, "spell2Id": 12 },
    { "assignedPosition": "", "cellId": 6, "championId": 0, "championPickIntent": 0, "summonerId": 22, "puuid": "e-1", "team": 2, "spell1Id": 0, "spell2Id": 0 },
    { "assignedPosition": "", "cellId": 7, "championId": 0, "championPickIntent": 0, "summonerId": 23, "puuid": "e-2", "team": 2, "spell1Id": 0, "spell2Id": 0 }
  ],
  "queueId": 420,
  "rerollsRemaining": 0,
  "timer": { "phase": "BAN_PICK", "adjustedTimeLeftInPhase": 20000, "totalTimeInPhase": 30000 },
  "bans": { "myTeamBans": [105, 0, 0], "theirTeamBans": [99, 0, 0], "numBans": 10 }
}
```

`shared/lcu/fixtures/session-aram.json`（450 大乱斗，持有英雄 22，备战席 [84,57]，剩 2 次骰子）：

```json
{
  "actions": [],
  "benchChampions": [
    { "championId": 84, "isPriority": false },
    { "championId": 57, "isPriority": false }
  ],
  "benchEnabled": true,
  "localPlayerCellId": 2,
  "myTeam": [
    { "assignedPosition": "", "cellId": 0, "championId": 111, "championPickIntent": 0, "summonerId": 31, "puuid": "p-0", "team": 1, "spell1Id": 4, "spell2Id": 32 },
    { "assignedPosition": "", "cellId": 1, "championId": 90, "championPickIntent": 0, "summonerId": 32, "puuid": "p-1", "team": 1, "spell1Id": 4, "spell2Id": 32 },
    { "assignedPosition": "", "cellId": 2, "championId": 711, "championPickIntent": 0, "summonerId": 33, "puuid": "p-2", "team": 1, "spell1Id": 4, "spell2Id": 32 }
  ],
  "theirTeam": [
    { "assignedPosition": "", "cellId": 5, "championId": 105, "championPickIntent": 0, "summonerId": 41, "puuid": "e-0", "team": 2, "spell1Id": 4, "spell2Id": 32 },
    { "assignedPosition": "", "cellId": 6, "championId": 64, "championPickIntent": 0, "summonerId": 42, "puuid": "e-1", "team": 2, "spell1Id": 4, "spell2Id": 32 },
    { "assignedPosition": "", "cellId": 7, "championId": 0, "championPickIntent": 0, "summonerId": 43, "puuid": "e-2", "team": 2, "spell1Id": 0, "spell2Id": 0 }
  ],
  "queueId": 450,
  "rerollsRemaining": 2,
  "timer": { "phase": "BAN_PICK", "adjustedTimeLeftInPhase": 25000, "totalTimeInPhase": 60000 },
  "bans": { "myTeamBans": [], "theirTeamBans": [], "numBans": 0 }
}
```

`shared/lcu/fixtures/owned-champions.json`：

```json
[
  { "id": 84, "ownership": { "owned": true } },
  { "id": 112, "ownership": { "owned": true } },
  { "id": 711, "ownership": { "owned": true } },
  { "id": 101, "ownership": { "owned": false } },
  { "id": 57, "ownership": { "owned": false } },
  { "id": 22, "ownership": { "owned": true } }
]
```

`shared/lcu/fixtures/free-rotation.json`：

```json
{ "freeChampionIds": [57, 64], "freeChampionIdsForNewPlayers": [99], "maxNewPlayerLevel": 10 }
```

`shared/lcu/fixtures/champion-mastery.json`：

```json
[
  { "championId": 84, "championLevel": 7, "championPoints": 70000 },
  { "championId": 711, "championLevel": 3, "championPoints": 8000 }
]
```

- [ ] **Step 2: 写失败测试 `shared/lcu/readers.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMockLcu, type MockLcu } from './mock/server'
import { createLcuHttp } from './http'
import { createLcuReaders } from './readers'

const CERT_DIR = join(__dirname, 'fixtures', 'test-certs')
const fixture = (name: string) => JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf-8')) as unknown

let mock: MockLcu
beforeEach(async () => {
  mock = await createMockLcu({
    certDir: CERT_DIR,
    routes: {
      '/lol-summoner/v1/current-summoner': { json: { summonerId: 33, displayName: '测试' } },
      '/lol-champ-select/v1/session': { json: fixture('session-draft-mid.json') },
      '/lol-champions/v1/inventories/33/champions': { json: fixture('owned-champions.json') },
      '/lol-champions/v1/free-rotation': { json: fixture('free-rotation.json') },
      '/lol-champion-mastery/v1/local-player/champion-mastery': { json: fixture('champion-mastery.json') },
    },
  })
})
afterEach(async () => { await mock.stop() })

function readers() {
  return createLcuReaders(createLcuHttp({ port: mock.port, password: mock.password }))
}

describe('createLcuReaders', () => {
  it('读取会话/召唤师/拥有/周免/熟练度', async () => {
    const r = readers()
    expect((await r.getChampSelectSession())?.queueId).toBe(420)
    expect((await r.getSummoner())?.summonerId).toBe(33)
    expect(await r.getOwnedChampionIds()).toEqual([84, 112, 711, 22])
    expect(await r.getFreeRotationIds()).toEqual([57, 64, 99])
    expect(await r.getChampionMasteryPoints()).toEqual({ 84: 70000, 711: 8000 })
  })

  it('免费周免 404 时静默回退为空数组（旧客户端无此端点）', async () => {
    await mock.stop()
    mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: { '/lol-champions/v1/free-rotation': { status: 404 } },
    })
    expect(await readers().getFreeRotationIds()).toEqual([])
  })
})
```

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run shared/lcu/readers.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 4: 实现 `shared/lcu/readers.ts`**

```ts
import type { LcuHttp } from './http'
import type {
  ChampionOwnershipEntry,
  ChampSelectSession,
  FreeRotationInfo,
  SummonerInfo,
} from './types'

export interface LcuReaders {
  getChampSelectSession(): Promise<ChampSelectSession | null>
  getSummoner(): Promise<SummonerInfo | null>
  getOwnedChampionIds(): Promise<number[]>
  getFreeRotationIds(): Promise<number[]>
  /** 熟练度积分 { championId: championPoints }；端点缺失/无数据 → {} */
  getChampionMasteryPoints(): Promise<Record<number, number>>
}

export function createLcuReaders(http: LcuHttp): LcuReaders {
  let cachedSummonerId: number | null = null

  return {
    getChampSelectSession: async () => {
      try {
        return await http.get<ChampSelectSession>('/lol-champ-select/v1/session')
      } catch (error) {
        if (error instanceof LcuHttpError && error.status === 404) return null
        throw error
      }
    },

    getSummoner: async () => {
      const info = await http.get<SummonerInfo>('/lol-summoner/v1/current-summoner')
      if (info) cachedSummonerId = info.summonerId
      return info
    },

    getOwnedChampionIds: async () => {
      if (cachedSummonerId === null) {
        const info = await http.get<SummonerInfo>('/lol-summoner/v1/current-summoner')
        cachedSummonerId = info?.summonerId ?? null
      }
      if (cachedSummonerId === null) return []
      const entries = await http.get<ChampionOwnershipEntry[]>(
        `/lol-champions/v1/inventories/${cachedSummonerId}/champions`,
      )
      return (entries ?? []).filter(e => e.ownership?.owned).map(e => e.id)
    },

    getFreeRotationIds: async () => {
      try {
        const info = await http.get<FreeRotationInfo>('/lol-champions/v1/free-rotation')
        if (!info) return []
        return [...(info.freeChampionIds ?? []), ...(info.freeChampionIdsForNewPlayers ?? [])]
      } catch (error) {
        // 仅 404（旧客户端无此端点）视作无周免；连接类错误上抛，供 advisor 失败计数感知客户端状态
        if (error instanceof LcuHttpError && error.status === 404) return []
        throw error
      }
    },

    getChampionMasteryPoints: async () => {
      try {
        const rows = await http.get<{ championId: number; championPoints?: number }[]>(
          '/lol-champion-mastery/v1/local-player/champion-mastery',
        )
        const result: Record<number, number> = {}
        for (const row of rows ?? []) {
          if (typeof row.championId === 'number' && typeof row.championPoints === 'number') {
            result[row.championId] = row.championPoints
          }
        }
        return result
      } catch (error) {
        if (error instanceof LcuHttpError && error.status === 404) return {}
        throw error
      }
    },
  }
}
```

（`getChampSelectSession` 已把 404 归一为 null——即「不在选人」；`http.ts` 的 `LcuHttpError` 需在 import 中引入。）

测试补一条：mock 无 session 路由时 `getChampSelectSession()` 返回 null：

```ts
  it('无会话时（404）返回 null', async () => {
    await mock.stop()
    mock = await createMockLcu({ certDir: CERT_DIR, routes: {} })
    expect(await readers().getChampSelectSession()).toBeNull()
  })
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run shared/lcu/readers.test.ts`
Expected: PASS（3 条）

- [ ] **Step 6: 提交**

```bash
git add shared/lcu/readers.ts shared/lcu/readers.test.ts shared/lcu/fixtures/session-draft-mid.json shared/lcu/fixtures/session-aram.json shared/lcu/fixtures/owned-champions.json shared/lcu/fixtures/free-rotation.json
git commit -m "feat: add lcu session/summoner/champion readers"
```

---

### Task 7: 英雄资源适配（ChampionIndex 构建）

**Files:**
- Create: `shared/lcu/resources.ts`
- Create: `shared/lcu/fixtures/champion-summary.json`、`champion-detail-84.json`、`champion-detail-112.json`
- Test: `shared/lcu/resources.test.ts`

- [ ] **Step 1: 写 fixtures**

`shared/lcu/fixtures/champion-summary.json`（节选，虚构字段形态与客户端一致）：

```json
[
  { "id": 84, "name": "阿卡丽", "alias": "Akali", "roles": ["ASSASSIN"] },
  { "id": 112, "name": "维克托", "alias": "Viktor", "roles": ["MAGE"] },
  { "id": 57, "name": "茂凯", "alias": "Maokai", "roles": ["TANK", "SUPPORT"] },
  { "id": 22, "name": "艾希", "alias": "Ashe", "roles": ["MARKSMAN", "SUPPORT"] },
  { "id": 64, "name": "李青", "alias": "LeeSin", "roles": ["FIGHTER"] }
]
```

`shared/lcu/fixtures/champion-detail-84.json`：

```json
{ "id": 84, "tacticalInfo": { "damageType": "kDamageTypeMagic" }, "playstyleInfo": { "difficulty": 0.7 } }
```

`shared/lcu/fixtures/champion-detail-112.json`：

```json
{ "id": 112, "tacticalInfo": { "damageType": "kDamageTypeMagic" }, "playstyleInfo": { "difficulty": 70 } }
```

（其余英雄在 mock 中不提供 detail → 走兜底：damageType 'mixed'、difficulty 5。测试覆盖两条归一化路径 + 兜底。）

- [ ] **Step 2: 写失败测试 `shared/lcu/resources.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMockLcu, type MockLcu } from './mock/server'
import { createLcuHttp } from './http'
import { createLcuReaders } from './readers'
import { buildChampionIndex } from './resources'

const CERT_DIR = join(__dirname, 'fixtures', 'test-certs')
const fixture = (name: string) => JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf-8')) as unknown

let mock: MockLcu
beforeEach(async () => {
  mock = await createMockLcu({
    certDir: CERT_DIR,
    routes: {
      '/lol-game-data/assets/v1/champion-summary.json': { json: fixture('champion-summary.json') },
      '/lol-game-data/assets/v1/champions/84.json': { json: fixture('champion-detail-84.json') },
      '/lol-game-data/assets/v1/champions/112.json': { json: fixture('champion-detail-112.json') },
    },
  })
})
afterEach(async () => { await mock.stop() })

describe('buildChampionIndex', () => {
  it('名称/定位来自 summary；伤害与难度来自 detail；缺失走兜底', async () => {
    const index = await buildChampionIndex(createLcuHttp({ port: mock.port, password: mock.password }))

    expect(index.get(84)).toEqual({ id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 })
    expect(index.get(112)?.difficulty).toBe(7) // 70 → 7
    expect(index.get(57)).toEqual({ id: 57, name: '茂凯', damageType: 'mixed', roles: ['tank', 'support'], difficulty: 5 })
    expect(index.get(22)?.roles).toEqual(['marksman', 'support'])
    expect(index.get(9999)).toBeNull()
    expect(index.all().length).toBe(5)
  })
})
```

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run shared/lcu/resources.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 4: 实现 `shared/lcu/resources.ts`**

```ts
// 从 LCU 本地资源构建引擎用 ChampionIndex。
// 契约依据：归档 champion-data.ts（真机验证过 tacticalInfo.damageType 取值）。
import type { ChampionIndex, ChampionMeta, ChampionRole, DamageType } from '../champions/meta'
import { createChampionIndex } from '../champions/meta'
import type { LcuHttp } from './http'
import type { LcuReaders } from './readers'
import type { ChampionDetail, ChampionSummaryEntry } from './types'

const ROLE_MAP: Record<string, ChampionRole> = {
  FIGHTER: 'fighter',
  TANK: 'tank',
  MAGE: 'mage',
  ASSASSIN: 'assassin',
  MARKSMAN: 'marksman',
  SUPPORT: 'support',
}

export function toDamageType(raw: unknown): DamageType {
  if (raw === 'kDamageTypeMagic') return 'ap'
  if (raw === 'kDamageTypePhysical') return 'ad'
  if (raw === 'kDamageTypeMixed') return 'mixed'
  return 'mixed'
}

/** 难度归一化：0-1 → ×10；1-10 → 原值；>10 → ÷10；缺失 → 5；截断 1-10 取整 */
export function normalizeDifficulty(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return 5
  const scaled = raw <= 1 ? raw * 10 : raw <= 10 ? raw : raw / 10
  return Math.max(1, Math.min(10, Math.round(scaled)))
}

function toRoles(raw: string[] | undefined): ChampionRole[] {
  return (raw ?? []).flatMap(r => {
    const mapped = ROLE_MAP[r.toUpperCase()]
    return mapped ? [mapped] : []
  })
}

export async function buildChampionIndex(http: LcuHttp, concurrency = 8): Promise<ChampionIndex> {
  const summary = await http.get<ChampionSummaryEntry[]>('/lol-game-data/assets/v1/champion-summary.json')
  const entries = (summary ?? []).filter(e => e.id > 0 && e.name)

  const metas: ChampionMeta[] = []
  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < entries.length) {
      const entry = entries[cursor++]
      let detail: ChampionDetail | null = null
      try {
        detail = await http.get<ChampionDetail>(`/lol-game-data/assets/v1/champions/${entry.id}.json`)
      } catch {
        detail = null // 单个英雄失败不阻塞（404/超时 → 兜底）
      }
      const roles = toRoles(detail?.roles ?? entry.roles)
      metas.push({
        id: entry.id,
        name: entry.name,
        damageType: toDamageType(detail?.tacticalInfo?.damageType),
        roles,
        difficulty: normalizeDifficulty(detail?.playstyleInfo?.difficulty),
      })
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, worker))

  return createChampionIndex(metas)
}
```

（`LcuReaders` 与 `readers.ts` 的 import 在实现中按需保留；`buildChampionIndex` 只依赖 `LcuHttp`。）

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run shared/lcu/resources.test.ts`
Expected: PASS（1 条）

- [ ] **Step 6: 提交**

```bash
git add shared/lcu/resources.ts shared/lcu/resources.test.ts shared/lcu/fixtures/champion-summary.json shared/lcu/fixtures/champion-detail-84.json shared/lcu/fixtures/champion-detail-112.json
git commit -m "feat: build champion index from lcu resources"
```

---

### Task 8: 会话 → 引擎上下文映射

**Files:**
- Create: `shared/lcu/map-session.ts`
- Test: `shared/lcu/map-session.test.ts`

- [ ] **Step 1: 写失败测试 `shared/lcu/map-session.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mapAramInput, mapRiftContext, proficiencyFromMastery } from './map-session'
import type { ChampSelectSession } from './types'

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf-8')) as ChampSelectSession

describe('mapRiftContext', () => {
  it('420 中单：位置/我方/敌方/ban 正确提取，我未选时排除自己', () => {
    const ctx = mapRiftContext(fixture('session-draft-mid.json'))
    expect(ctx).not.toBeNull()
    expect(ctx!.queueId).toBe(420)
    expect(ctx!.myPosition).toBe('mid')
    expect(ctx!.allies.map(a => a.championId).sort()).toEqual([64, 86])
    expect(ctx!.enemies.map(e => e.championId)).toEqual([112])
    expect(ctx!.bans?.sort()).toEqual([99, 105])
  })

  it('不支持的模式返回 null', () => {
    const session = { ...fixture('session-draft-mid.json'), queueId: 1700 }
    expect(mapRiftContext(session)).toBeNull()
  })

  it('450 走 aram 输入：当前英雄/备战席/骰子/双方阵容', () => {
    const input = mapAramInput(fixture('session-aram.json'))
    expect(input).not.toBeNull()
    expect(input!.current).toBe(711)
    expect(input!.bench).toEqual([84, 57])
    expect(input!.diceLeft).toBe(2)
    expect(input!.allies?.sort()).toEqual([90, 111])
    expect(input!.enemies?.sort()).toEqual([64, 105])
  })

  it('450 但当前英雄为 0（换人中间态）返回 null', () => {
    const session = fixture('session-aram.json')
    session.myTeam[2].championId = 0
    expect(mapAramInput(session)).toBeNull()
  })

  it('熟练度折算 0-100 并可注入上下文', () => {
    expect(proficiencyFromMastery(35000)).toBe(100)
    expect(proficiencyFromMastery(8000)).toBe(23)
    expect(proficiencyFromMastery(0)).toBe(0)
    const ctx = mapRiftContext(fixture('session-draft-mid.json'), { proficiency: { 84: 23 } })
    expect(ctx!.proficiency).toEqual({ 84: 23 })
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/lcu/map-session.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `shared/lcu/map-session.ts`**

```ts
import { normalizeLcuPosition } from '../positions'
import type { AramJudgeInput, DraftContext } from '../engine/types'
import type { ChampSelectSession } from './types'
import { SUPPORTED_QUEUE_IDS } from './types'

function myCell(session: ChampSelectSession) {
  return session.myTeam.find(p => p.cellId === session.localPlayerCellId) ?? null
}

/** 熟练度积分 → 0-100（35000 分封顶）；引擎的新手友好因素使用 */
export function proficiencyFromMastery(championPoints: number): number {
  return Math.max(0, Math.min(100, Math.round(championPoints / 350)))
}

export interface MapExtras {
  /** 熟练度（0-100，championId → 值） */
  proficiency?: Record<number, number>
}

/** 征召/盲选/排位（400/420/430/440）→ DraftContext；其它模式或数据不足 → null */
export function mapRiftContext(session: ChampSelectSession, extras: MapExtras = {}): DraftContext | null {
  if (!SUPPORTED_QUEUE_IDS.includes(session.queueId) || session.queueId === 450) return null
  const me = myCell(session)
  if (!me) return null

  const myPosition = normalizeLcuPosition(me.assignedPosition)
  const allies = session.myTeam
    .filter(p => p.cellId !== session.localPlayerCellId && p.championId > 0)
    .map(p => ({ championId: p.championId, position: normalizeLcuPosition(p.assignedPosition) || undefined }))
  const enemies = session.theirTeam
    .filter(p => p.championId > 0)
    .map(p => ({ championId: p.championId }))
  const bans = [...session.bans.myTeamBans, ...session.theirTeamBans].filter(id => id > 0)

  return {
    queueId: session.queueId as DraftContext['queueId'],
    myPosition: myPosition || undefined,
    allies,
    enemies,
    bans,
    ...(extras.proficiency ? { proficiency: extras.proficiency } : {}),
  }
}

/** 大乱斗（450）→ 换/留判定输入；当前英雄未就绪 → null */
export function mapAramInput(session: ChampSelectSession): AramJudgeInput | null {
  if (session.queueId !== 450) return null
  const me = myCell(session)
  if (!me || me.championId <= 0) return null

  return {
    current: me.championId,
    bench: session.benchChampions.map(b => b.championId).filter(id => id > 0 && id !== me.championId),
    diceLeft: session.rerollsRemaining,
    allies: session.myTeam.filter(p => p.cellId !== session.localPlayerCellId && p.championId > 0).map(p => p.championId),
    enemies: session.theirTeam.filter(p => p.championId > 0).map(p => p.championId),
  }
}
```

（`DraftContext['queueId']` 是 420|440|400|430|450 联合——上面已排 450，断言类型安全；若 typecheck 提示标窄问题，用 `Exclude<DraftContext['queueId'], 450>` 处理。）

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/lcu/map-session.test.ts`
Expected: PASS（4 条）

- [ ] **Step 5: 提交**

```bash
git add shared/lcu/map-session.ts shared/lcu/map-session.test.ts
git commit -m "feat: map champ-select session to engine contexts"
```

---

### Task 9: 符文页与召唤师技能写入

**Files:**
- Create: `shared/lcu/writers.ts`
- Test: `shared/lcu/writers.test.ts`

- [ ] **Step 1: 写失败测试 `shared/lcu/writers.test.ts`**

```ts
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMockLcu, type MockLcu } from './mock/server'
import { createLcuHttp } from './http'
import { subStyleCodeToStyleId, applyRunePage, carrySpells } from './writers'

const CERT_DIR = join(__dirname, 'fixtures', 'test-certs')
let mock: MockLcu
beforeEach(async () => {
  mock = await createMockLcu({
    certDir: CERT_DIR,
    routes: {
      '/lol-perks/v1/pages': {
        handler: (body, req) => {
          if (req.method === 'POST') return { json: { id: 9001 } }
          return { json: [{ id: 100, current: true, isDeletable: true, name: '旧页' }] }
        },
      },
      '/lol-perks/v1/currentpage': { status: 200, json: {} },
      '/lol-champ-select/v1/session/my-selection': { status: 204 },
    },
  })
})
afterEach(async () => { await mock.stop() })

describe('subStyleCodeToStyleId', () => {
  it('映射 101 副系 code → 符文系 id', () => {
    expect(subStyleCodeToStyleId('jm')).toBe(8000)
    expect(subStyleCodeToStyleId('zj')).toBe(8100)
    expect(subStyleCodeToStyleId('ws')).toBe(8200)
    expect(subStyleCodeToStyleId('jj')).toBe(8400)
    expect(subStyleCodeToStyleId('qd')).toBe(8300)
    expect(subStyleCodeToStyleId('??')).toBeNull()
  })
})

describe('applyRunePage', () => {
  it('常规：POST 创建当前页', async () => {
    const http = createLcuHttp({ port: mock.port, password: mock.password })
    const ok = await applyRunePage(http, {
      name: 'Lux·阿卡丽',
      keystoneId: 8112,
      subStyleCode: 'jj',
      runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
    })
    expect(ok.ok).toBe(true)
    const post = mock.received.find(r => r.method === 'POST' && r.url === '/lol-perks/v1/pages')
    expect(post?.body).toMatchObject({
      name: 'Lux·阿卡丽',
      primaryStyleId: 8100, // 基石 8112（主宰）推导
      subStyleId: 8400,
      selectedPerkIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
      current: true,
    })
  })

  it('页数满（POST 失败）：删除当前可删页后重试成功', async () => {
    await mock.stop()
    let firstPost = true
    mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: {
        '/lol-perks/v1/pages': {
          handler: (_body, req) => {
            if (req.method === 'POST') {
              if (firstPost) { firstPost = false; return { status: 500 } }
              return { json: { id: 9002 } }
            }
            return { json: [{ id: 100, current: true, isDeletable: true, name: '旧页' }] }
          },
        },
        '/lol-perks/v1/pages/100': { status: 204 },
      },
    })
    const http = createLcuHttp({ port: mock.port, password: mock.password })
    const ok = await applyRunePage(http, {
      name: 'Lux·测试', keystoneId: 8112, subStyleCode: 'jj',
      runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
    })
    expect(ok.ok).toBe(true)
    expect(mock.received.some(r => r.method === 'DELETE' && r.url === '/lol-perks/v1/pages/100')).toBe(true)
  })

  it('副系未知 → 失败并带原因', async () => {
    const http = createLcuHttp({ port: mock.port, password: mock.password })
    const result = await applyRunePage(http, {
      name: 'Lux·测试', keystoneId: 8112, subStyleCode: 'xx', runeIds: [8112],
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('副系')
  })
})

describe('carrySpells', () => {
  it('PATCH my-selection 携带技能', async () => {
    const http = createLcuHttp({ port: mock.port, password: mock.password })
    expect(await carrySpells(http, [4, 32])).toBe(true)
    expect(mock.received).toContainEqual({
      method: 'PATCH',
      url: '/lol-champ-select/v1/session/my-selection',
      body: { spell1Id: 4, spell2Id: 32 },
    })
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/lcu/writers.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `shared/lcu/writers.ts`**

```ts
// LCU 仅有的两类写入（设计 §6）：符文页应用、召唤师技能携带。
// keystone → 主系推导：8000s 精确；8100s 主宰；8200s 巫术；8300s 启迪；8400s 坚决；
// 特例：9923（丛刃）属主宰 8100。
import type { LcuHttp } from './http'

const SUB_STYLE_IDS: Record<string, number> = {
  jm: 8000, // 精密
  zj: 8100,
  zz: 8100, // 主宰（两码都见过）
  ws: 8200, // 巫术
  jj: 8400, // 坚决
  qd: 8300, // 启迪
}

export function subStyleCodeToStyleId(code: string): number | null {
  return SUB_STYLE_IDS[code.toLowerCase()] ?? null
}

export function keystoneToPrimaryStyleId(keystoneId: number): number | null {
  if (keystoneId === 9923) return 8100
  const band = Math.floor(keystoneId / 100) * 100
  return [8000, 8100, 8200, 8300, 8400].includes(band) ? band : null
}

export interface RunePageInput {
  name: string
  keystoneId: number
  subStyleCode: string
  runeIds: number[]
}

export interface WriteResult {
  ok: boolean
  reason?: string
}

interface PerkPage {
  id: number
  current?: boolean
  isDeletable?: boolean
  name?: string
}

export async function applyRunePage(http: LcuHttp, page: RunePageInput): Promise<WriteResult> {
  const primaryStyleId = keystoneToPrimaryStyleId(page.keystoneId)
  if (primaryStyleId === null) return { ok: false, reason: '无法识别基石符文的主系' }
  const subStyleId = subStyleCodeToStyleId(page.subStyleCode)
  if (subStyleId === null) return { ok: false, reason: `无法识别副系（${page.subStyleCode}）` }
  if (page.runeIds.length < 6) return { ok: false, reason: '符文列表不完整' }

  const body = {
    name: page.name.slice(0, 40),
    primaryStyleId,
    subStyleId,
    selectedPerkIds: page.runeIds,
    current: true,
  }

  try {
    await http.post<{ id: number }>('/lol-perks/v1/pages', body)
    return { ok: true }
  } catch {
    // 页数已满等：删除当前可删页后重试一次
    try {
      const pages = (await http.get<PerkPage[]>('/lol-perks/v1/pages')) ?? []
      const target = pages.find(p => p.current && p.isDeletable !== false)
      if (!target) return { ok: false, reason: '符文页创建失败（可能页数已满且无可用空位）' }
      await http.del(`/lol-perks/v1/pages/${target.id}`)
      await http.post<{ id: number }>('/lol-perks/v1/pages', body)
      return { ok: true }
    } catch {
      return { ok: false, reason: '符文页创建失败，请手动在客户端设置' }
    }
  }
}

export async function carrySpells(http: LcuHttp, spellIds: [number, number]): Promise<boolean> {
  try {
    await http.patch('/lol-champ-select/v1/session/my-selection', { spell1Id: spellIds[0], spell2Id: spellIds[1] })
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/lcu/writers.test.ts`
Expected: PASS（5 条）

- [ ] **Step 5: 提交**

```bash
git add shared/lcu/writers.ts shared/lcu/writers.test.ts
git commit -m "feat: add rune page and summoner spell writers"
```

---

### Task 10: LcuAdvisor 编排（发现→连接→事件→重算→回调）

**Files:**
- Create: `shared/lcu/advisor.ts`
- Modify: `shared/lcu/mock/server.ts`（新增 `stopServing()`：停止对外服务但保留 lockfile 目录，用于自愈测试）
- Test: `shared/lcu/advisor.test.ts`

- [ ] **Step 1: 写失败测试 `shared/lcu/advisor.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createMockLcu, type MockLcu } from './mock/server'
import { createLcuAdvisor } from './advisor'
import type { AdviceSnapshot } from './advisor'

const CERT_DIR = join(__dirname, 'fixtures', 'test-certs')
const fixture = (name: string) => JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf-8')) as Record<string, unknown>

let servers: MockLcu[] = []
afterEach(async () => { for (const s of servers.splice(0)) await s.stop() })

function waitFor<T>(probe: () => T | null, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const tick = () => {
      const value = probe()
      if (value !== null) return resolve(value)
      if (Date.now() - started > timeoutMs) return reject(new Error('等待超时'))
      setTimeout(tick, 20)
    }
    tick()
  })
}

describe('LcuAdvisor', () => {
  it('连接 mock → 进入选人 → 触发一次建议（含会话快照）', async () => {
    const mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: {
        '/lol-champ-select/v1/session': { json: fixture('session-draft-mid.json') },
      },
    })
    servers.push(mock)

    const snapshots: AdviceSnapshot[] = []
    const advisor = createLcuAdvisor({
      lcuDirOverride: mock.lcuDir,
      discoverIntervalMs: 50,
      debounceMs: 30,
      compute: session => ({ kind: 'rift', sessionQueueId: session.queueId }),
    })
    advisor.onAdvice(s => snapshots.push(s))
    advisor.start()

    const first = await waitFor(() => snapshots[0] ?? null)
    expect(first.kind).toBe('rift')
    expect(first.sessionQueueId).toBe(420)
    advisor.stop()
  })

  it('客户端不在（无 lockfile）时静默等待，出现后自动连上', async () => {
    // 先起 advisor 指向一个不存在的目录
    const statuses: string[] = []
    const advisor = createLcuAdvisor({
      lcuDirOverride: '/tmp/lux-lcu-not-exist',
      discoverIntervalMs: 50,
      debounceMs: 30,
      compute: session => ({ kind: 'rift', sessionQueueId: session.queueId }),
    })
    advisor.onStatus(s => statuses.push(s))
    advisor.start()
    await new Promise(r => setTimeout(r, 100))
    expect(statuses.at(-1)).toBe('waiting')

    // 再启动 mock 并把 advisor 指过去（重扫目录生效）
    const mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: { '/lol-champ-select/v1/session': { json: fixture('session-draft-mid.json') } },
    })
    servers.push(mock)
    advisor.setLcuDirForTest(mock.lcuDir)
    await waitFor(() => (statuses.includes('in-champ-select') ? true : null))
    advisor.stop()
  })

  it('服务中断但 lockfile 仍在（客户端崩溃残留）→ 连续失败后自愈回等待态', async () => {
    const mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: { '/lol-champ-select/v1/session': { json: fixture('session-draft-mid.json') } },
    })
    servers.push(mock)

    const statuses: string[] = []
    const advisor = createLcuAdvisor({
      lcuDirOverride: mock.lcuDir,
      discoverIntervalMs: 30,
      debounceMs: 10,
      compute: session => ({ kind: 'rift', sessionQueueId: session.queueId }),
    })
    advisor.onStatus(s => statuses.push(s))
    advisor.start()
    await waitFor(() => (statuses.includes('in-champ-select') ? true : null))

    await mock.stopServing() // 停服务但保留 lockfile（模拟崩溃残留）
    await waitFor(() => (statuses.at(-1) === 'waiting' ? true : null), 5000)
    expect(statuses.at(-1)).toBe('waiting') // 连续请求失败 ≥3 → 断开自愈
    advisor.stop()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/lcu/advisor.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `shared/lcu/advisor.ts`**

先给 mock 增加 `stopServing()`（`shared/lcu/mock/server.ts`）：`MockLcu` 接口加 `stopServing(): Promise<void>`，实现为 `wss.close()` + `server.close()` 但**不**删除 `lcuDir`；`stop()` 则先 `stopServing()` 再 `rmSync(lcuDir)`。

```ts
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

export type ComputeAdvice = (session: ChampSelectSession) => Omit<AdviceSnapshot, 'session'>

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

  async function evaluate(): Promise<void> {
    if (!readers) return
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
    const advice = options.compute(session)
    const snapshot: AdviceSnapshot = { ...advice, session }
    adviceHandlers.forEach(h => h(snapshot))
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
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/lcu/advisor.test.ts`
Expected: PASS（2 条）

Run: `npm run test && npm run typecheck`
Expected: 全量 PASS、0 错误。

- [ ] **Step 5: 提交**

```bash
git add shared/lcu/advisor.ts shared/lcu/advisor.test.ts
git commit -m "feat: add lcu advisor orchestration with reconnect and debounce"
```

---

### Task 11: dev CLI（Mock 全链路冒烟，3A 验收载体）

**Files:**
- Create: `scripts/lux-dev-cli.ts`

- [ ] **Step 1: 实现 `scripts/lux-dev-cli.ts`**

```ts
// 3A 验收 CLI：用 Mock LCU + 真实 ./data 数据仓，跑通「读会话 → 出推荐」；
// 用法：npx tsx scripts/lux-dev-cli.ts [--scenario draft|aram] [--apply] [--root ./data]
// --apply 会向 Mock 发起符文/技能写入并打印 Mock 收到的请求（验证写入链路）。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createMockLcu } from '../shared/lcu/mock/server'
import { buildChampionIndex } from '../shared/lcu/resources'
import { createLcuHttp } from '../shared/lcu/http'
import { createLcuReaders } from '../shared/lcu/readers'
import { mapAramInput, mapRiftContext } from '../shared/lcu/map-session'
import { applyRunePage, carrySpells } from '../shared/lcu/writers'
import { createWarehouse } from '../shared/warehouse/store'
import { createEngineData } from '../shared/engine/data'
import { recommendRift } from '../shared/engine/recommend'
import { judgeAram } from '../shared/engine/aram'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const root = arg('root') ?? './data'
const scenario = process.argv.includes('aram') ? 'aram' : 'draft'
const shouldApply = process.argv.includes('--apply')

const FIX = join(__dirname, '..', 'shared', 'lcu', 'fixtures')
const readFixture = (name: string) => JSON.parse(readFileSync(join(FIX, name), 'utf-8'))

async function main(): Promise<void> {
  const mock = await createMockLcu({
    certDir: join(FIX, 'test-certs'),
    routes: {
      '/lol-champ-select/v1/session': { json: readFixture(`session-${scenario === 'aram' ? 'aram' : 'draft-mid'}.json`) },
      '/lol-summoner/v1/current-summoner': { json: { summonerId: 33, displayName: 'Lux 开发者' } },
      '/lol-champions/v1/inventories/33/champions': { json: readFixture('owned-champions.json') },
      '/lol-champions/v1/free-rotation': { json: readFixture('free-rotation.json') },
      '/lol-game-data/assets/v1/champion-summary.json': { json: readFixture('champion-summary.json') },
      '/lol-game-data/assets/v1/champions/84.json': { json: readFixture('champion-detail-84.json') },
      '/lol-game-data/assets/v1/champions/112.json': { json: readFixture('champion-detail-112.json') },
      '/lol-perks/v1/pages': { handler: (_b, req) => (req.method === 'POST' ? { json: { id: 9001 } } : { json: [] }) },
      '/lol-champ-select/v1/session/my-selection': { status: 204 },
    },
  })

  const http = createLcuHttp({ port: mock.port, password: mock.password })
  const readers = createLcuReaders(http)
  const index = await buildChampionIndex(http)
  const warehouse = createWarehouse(root)
  const data = createEngineData(warehouse, index)

  const session = await readers.getChampSelectSession()
  if (!session) throw new Error('Mock 未返回会话')

  if (scenario === 'aram') {
    const input = mapAramInput(session)
    if (!input) throw new Error('大乱斗映射失败')
    const result = judgeAram(input, data)
    console.log('=== 大乱斗 换/留 判定（Mock 会话） ===')
    console.log(JSON.stringify({ action: result.action, reason: result.reason, runes: result.runes, spells: result.spells }, null, 2))
    if (shouldApply && result.runes) {
      const applied = await applyRunePage(http, {
        name: `Lux·${result.action}`,
        keystoneId: result.runes.keystoneId,
        subStyleCode: 'jj',
        runeIds: result.runes.runeIds,
      })
      const carried = await carrySpells(http, result.spells!.spellIds)
      console.log(`[apply] 符文=${applied.ok} 技能=${carried}`)
    }
  } else {
    const ctx = mapRiftContext(session)
    if (!ctx) throw new Error('征召映射失败')
    const owned = [...(await readers.getOwnedChampionIds()), ...(await readers.getFreeRotationIds())]
    const advice = recommendRift({ ...ctx, ownedChampionIds: owned }, data)
    console.log('=== 排位·中单 推荐（Mock 会话 + 真实数据仓） ===')
    console.log(JSON.stringify({ ruleMode: advice.ruleMode, primary: advice.primary, alternates: advice.alternates, runes: advice.runes, spells: advice.spells }, null, 2))
    if (shouldApply && advice.spells) {
      const applied = await applyRunePage(http, {
        name: 'Lux·排位',
        keystoneId: advice.runes?.keystoneId ?? 0,
        subStyleCode: 'jj',
        runeIds: advice.runes?.runeIds ?? [],
      })
      const carried = await carrySpells(http, advice.spells.spellIds)
      console.log(`[apply] 符文=${applied.ok} 技能=${carried}`)
    }
  }

  if (shouldApply) {
    console.log('--- Mock 收到的写请求 ---')
    for (const r of mock.received) console.log(`${r.method} ${r.url}`, JSON.stringify(r.body ?? ''))
  }

  await mock.stop()
}

main().catch(error => {
  console.error('[lux-dev-cli] 失败：', error)
  process.exit(1)
})
```

（注：advisor 编排器留待 3B UI 接线；本 CLI 直接走 readers→engine 显式链路，便于逐步观察。aram 场景 `--apply` 时 `keystoneId: 0` 不可发生——aram 的 runes 永远来自内置规则（非 null），若为 null 则 `--apply` 分支因 `result.runes` 为 null 不会进入。）

- [ ] **Step 2: 冒烟运行（离线）**

Run: `npx tsx scripts/lux-dev-cli.ts --scenario draft --root ./data`
Expected: 打印排位推荐 JSON（primary 含真实数据仓的强度因素；owner 过滤后候选池来自 owned+周免 ∪ 榜单）；无异常退出。

Run: `npx tsx scripts/lux-dev-cli.ts --scenario aram --root ./data --apply`
Expected: 打印大乱斗判定 + `[apply] 符文=true 技能=true` + Mock 收到的写请求清单（POST /lol-perks/v1/pages 与 PATCH my-selection）。

- [ ] **Step 3: typecheck + 全量测试 + 提交**

Run: `npm run typecheck && npm run test`
Expected: 0 错误、全部 PASS。

```bash
git add scripts/lux-dev-cli.ts
git commit -m "feat: add lcu dev cli smoke over mock client"
```

---

### Task 12: README 更新与收尾

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 更新 README**

在「当前状态」后追加一段「Phase 3A（LCU 集成核心）已完成」：
- `shared/lcu/`：lockfile 发现、REST/事件通道（WAMP）、会话读取、英雄资源适配、会话→引擎映射、符文/技能写入、`LcuAdvisor` 编排
- Mock LCU（`shared/lcu/mock/`）：场景化 HTTPS+WSS 回放，测试与 dev CLI 的全量验收载体
- 开发命令追加：
```bash
npx tsx scripts/lux-dev-cli.ts --scenario draft --root ./data   # LCU 核心冒烟（Mock）
npx tsx scripts/lux-dev-cli.ts --scenario aram --root ./data --apply  # 含符文/技能写入演示
```
- 文档列表加本计划链接；注明 Phase 3B（Electron 壳 + 小窗 UI + 打包）待立项、真机联调待用户开客户端时进行。

- [ ] **Step 2: 验证与提交**

Run: `npm run test && npm run typecheck`
Expected: 全部 PASS。

```bash
git add README.md
git commit -m "docs: document phase 3a lcu core and dev cli"
```

---

## 完成后状态（Phase 3A 交付物）

- `shared/lcu/`：lockfile / http / events(WAMP) / types / readers / resources / map-session / writers / advisor —— 全部有测试（Mock 驱动）
- `shared/lcu/mock/`：MockLcuServer（HTTPS+WSS、场景路由、请求记录、事件推送、连接断开控制）
- 会话→引擎→建议的完整链路可离线运行并被观测（dev CLI）
- 真机验证路径已在代码中预留（`LUX_LCU_DIR`、候选路径含国服 WeGame 目录），待用户开客户端后再做最终联调
- 3B 待立项：Electron 壳、置顶小窗 UI、设置/引导、托盘、NSIS 打包（届时解决 electron 二进制镜像与 WSL GUI 依赖问题）

## 风险与注意

- **LCU 字段不确定性**：`queueId`/`benchChampions`/`rerollsRemaining`/`tacticalInfo.damageType` 有归档真机依据；`playstyleInfo.difficulty` 与 `free-rotation` 端点为「尽力而为」——均已设计兜底（默认难度 5、伤害 mixed、周免空）并有测试；真机联调时优先核对这两处。
- **写入安全**：符文页仅在「创建失败」时才删除**当前可删页**，且最多一次；不做任何代打行为；失败一律返回原因文本（3B UI 用它提示手动步骤）。
- **Mock 与生产隔离**：`shared/lcu/mock/` 仅供测试/dev CLI；3B 打包时不得进入产物入口。
- **不跑真机**：本阶段所有验收均可离线完成；任何网络请求（npm 安装除外）都不需要。
