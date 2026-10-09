# Lux Phase 1 — 英雄选择智能推荐 实现计划


**Goal:** 在英雄选择阶段，根据双方已选/Ban 的阵容，通过 OP.GG API + 本地规则给出最优英雄推荐。

**Architecture:** 基于 Pengu Loader 的客户端内插件，TypeScript + React 19 + Vite 6。LCU WebSocket 监听选人事件，OP.GG API 拉取 counter/synergy/tier 数据，多因子加权评分引擎计算推荐结果，通过 MutationObserver + React Portal 注入到英雄选择界面。

**Tech Stack:** TypeScript, React 19, Vite 6, Pengu Loader Runtime, LCU REST API + WebSocket

---

## 文件结构

```
src/
├── index.tsx                          # 插件入口（init/load 生命周期）
├── types/
│   └── lcu.ts                         # LCU API 类型（ChampSelectSession 等）
├── lib/
│   ├── logger.ts                      # 日志系统
│   ├── lcu.ts                         # LCU Manager（REST + WebSocket）
│   ├── store.ts                       # 配置持久化 (DataStore wrapper)
│   ├── InjectorManager.ts            # 全局 MutationObserver 守护
│   ├── utils.ts                       # 工具函数（sleep、debounce）
│   ├── opgg-api.ts                    # OP.GG API 客户端
│   ├── local-rules.ts                 # 本地静态 counter/协同规则
│   ├── scorer.ts                      # 推荐评分引擎
│   └── features/
│       └── champion-recommendation.ts  # 推荐功能模块
├── components/
│   ├── ChampionBadgeOverlay.tsx       # 英雄网格角标
│   └── RecommendationPanel.tsx        # 推荐详情面板
├── data/
│   └── champion-meta.json            # 英雄 ID→名称→位置 映射
└── styles/
    └── index.css                      # 推荐 UI 样式
```

---

### Task 1: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `pengu.d.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "lux",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "description": "Lux - 英雄联盟智能选人推荐插件",
  "license": "AGPL-3.0",
  "config": {
    "pluginName": "lux",
    "loaderPath": "../../"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.4.1",
    "typescript": "^5.8.3",
    "vite": "^6.3.0",
    "vite-plugin-mkcert": "^1.17.8"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "pengu.d.ts"]
}
```

- [ ] **Step 3: 创建 vite.config.ts**

直接复用 Sona 的 vite 配置，替换 `pluginName` 为 `lux`。

用以下命令复制并替换：
```bash
cp /tmp/sona-reference/vite.config.ts vite.config.ts
cp /tmp/sona-reference/pengu.d.ts pengu.d.ts
```

然后修改 `vite.config.ts` 中第 8 行 `PLUGIN_NAME` 为 `pkg.config.pluginName`，修改 banner 中 `@name`、`@description`、`@author`、`@link` 为 Lux 的信息。

- [ ] **Step 4: 安装依赖**

Run: `cd /home/giao1907/Project/Lux && npm install`
Expected: 依赖安装成功，无错误。

- [ ] **Step 5: 验证构建**

Run: `npx tsc --noEmit`
Expected: 无错误（此时 src 目录还为空）。

- [ ] **Step 6: Commit**

```bash
cd /home/giao1907/Project/Lux
git add package.json tsconfig.json vite.config.ts pengu.d.ts
git commit -m "feat: project scaffolding for Lux plugin"
```

---

### Task 2: Logger 工具

**Files:**
- Create: `src/lib/logger.ts`

- [ ] **Step 1: 编写 logger 实现**

```typescript
// src/lib/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerOptions {
  name: string
  version: string
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function formatMessage(level: LogLevel, name: string, message: string): string {
  const ts = new Date().toISOString().slice(11, 23)
  return `[${ts}] [${level.toUpperCase()}] [${name}] ${message}`
}

export function createLogger(options: LoggerOptions) {
  return {
    debug(message: string, ...args: unknown[]) {
      console.debug(formatMessage('debug', options.name, message), ...args)
    },
    info(message: string, ...args: unknown[]) {
      console.log(formatMessage('info', options.name, message), ...args)
    },
    warn(message: string, ...args: unknown[]) {
      console.warn(formatMessage('warn', options.name, message), ...args)
    },
    error(message: string, ...args: unknown[]) {
      console.error(formatMessage('error', options.name, message), ...args)
    },
    printBanner() {
      console.log(
        `%c  🔆 Lux v${options.version}  %c 英雄联盟智能选人推荐 `,
        'background:#f0c040;color:#000;font-weight:bold;padding:4px 8px;',
        'background:#333;color:#fff;padding:4px 8px;',
      )
    },
  }
}

export type Logger = ReturnType<typeof createLogger>
```

- [ ] **Step 2: Commit**

```bash
cd /home/giao1907/Project/Lux
git add src/lib/logger.ts
git commit -m "feat: add logger utility"
```

---

### Task 3: LCU 类型定义

**Files:**
- Create: `src/types/lcu.ts`

- [ ] **Step 1: 编写 ChampSelect 相关类型**

```typescript
// src/types/lcu.ts

/** 英雄选择阶段玩家信息 */
export interface ChampSelectPlayer {
  assignedPosition: string
  cellId: number
  championId: number
  championPickIntent: number
  gameName: string
  summonerId: number
  puuid: string
  team: 1 | 2 | number
  spell1Id: number
  spell2Id: number
}

/** 英雄选择操作 */
export interface ChampSelectAction {
  actorCellId: number
  championId: number
  completed: boolean
  id: number
  isAllyAction: boolean
  isInProgress: boolean
  type: 'pick' | 'ban' | 'ten_bans_reveal' | (string & {})
}

/** 英雄选择会话 */
export interface ChampSelectSession {
  actions: ChampSelectAction[][]
  allowBattleBoost: boolean
  allowRerolling: boolean
  allowSkinSelection: boolean
  benchChampions: { championId: number; isPriority: boolean }[]
  benchEnabled: boolean
  counter: number
  gameId: number
  id: string
  isCustomGame: boolean
  isSpectating: boolean
  localPlayerCellId: number
  lockedEventIndex: number
  myTeam: ChampSelectPlayer[]
  theirTeam: ChampSelectPlayer[]
  queueId: number
  rerollsRemaining: number
  timer: {
    adjustedTimeLeftInPhase: number
    internalNowInEpochMs: number
    isInfinite: boolean
    phase: 'PLANNING' | 'BAN_PICK' | 'FINALIZATION' | 'GAME_STARTING' | (string & {})
    totalTimeInPhase: number
  }
  trades: { cellId: number; id: number; state: 'AVAILABLE' | 'BUSY' | 'RECEIVED' | 'SENT' | (string & {}) }[]
  bans: {
    myTeamBans: number[]
    theirTeamBans: number[]
    numBans: number
  }
}

/** LCU WebSocket 事件消息 */
export interface LCUEventMessage {
  data: unknown
  eventType: 'Create' | 'Update' | 'Delete'
  uri: string
}

/** 游戏流程阶段 */
export type GameflowPhase = 'None' | 'Lobby' | 'Matchmaking' | 'ReadyCheck' | 'ChampSelect' | 'GameStart' | 'InProgress' | 'WaitingForStats' | 'PreEndOfGame' | 'EndOfGame' | (string & {})

/** LCU WebSocket 事件 URI 常量 */
export const LcuEventUri = {
  GAMEFLOW_PHASE_CHANGE: '/lol-gameflow/v1/gameflow-phase',
  CHAMP_SELECT_SESSION: '/lol-champ-select/v1/session',
} as const

/** 召唤师信息 */
export interface SummonerInfo {
  summonerId: number
  displayName: string
  internalName: string
  puuid: string
  accountId: number
  summonerLevel: number
  profileIconId: number
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/giao1907/Project/Lux
git add src/types/lcu.ts
git commit -m "feat: add LCU type definitions for champ select"
```

---

### Task 4: 英雄元数据

**Files:**
- Create: `src/data/champion-meta.json`

- [ ] **Step 1: 创建英雄元数据 JSON**

champion-meta.json 包含全部英雄的 ID、名称、位置映射。关键字段：
- `id`: 英雄 ID（与 LCU API 一致）
- `name`: 中文名
- `enName`: 英文名
- `positions`: 适合的位置数组（top/jungle/mid/bot/utility）

```json
{
  "champions": {
    "1": { "name": "黑暗之女", "enName": "Annie", "positions": ["mid", "utility"] },
    "2": { "name": "狂战士", "enName": "Olaf", "positions": ["top", "jungle"] },
    "3": { "name": "正义巨像", "enName": "Galio", "positions": ["mid", "utility"] }
  },
  "positionOrder": ["top", "jungle", "mid", "bot", "utility"],
  "positionLabels": {
    "top": "上路",
    "jungle": "打野",
    "mid": "中路",
    "bot": "下路",
    "utility": "辅助"
  },
  "damageTypes": {
    "1": "ap",
    "2": "ad",
    "3": "ap"
  }
}
```

> 注：实际文件需包含全部英雄数据（约 170 个），可后续从 Data Dragon 或 OP.GG API 批量导入。上述为格式示例，完整数据见 `scripts/import-champion-meta.ts`。

- [ ] **Step 2: 创建数据导入脚本**

```typescript
// scripts/import-champion-meta.ts
// 从 Data Dragon API 拉取最新英雄列表并生成 champion-meta.json
// 运行: npx tsx scripts/import-champion-meta.ts

async function main() {
  const versionUrl = 'https://ddragon.leagueoflegends.com/api/versions.json'
  const versions: string[] = await fetch(versionUrl).then(r => r.json())
  const latestVersion = versions[0]

  const champUrl = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/zh_CN/champion.json`
  const data = await fetch(champUrl).then(r => r.json())

  const champions: Record<string, unknown> = {}
  for (const champ of Object.values(data.data) as Array<{ key: string; name: string; id: string; tags: string[] }>) {
    champions[champ.key] = {
      name: champ.name,
      enName: champ.id,
      positions: champ.tags.map(t => t.toLowerCase()),
    }
  }

  const output = {
    champions,
    positionOrder: ['top', 'jungle', 'mid', 'bot', 'utility'],
    positionLabels: {
      top: '上路', jungle: '打野', mid: '中路', bot: '下路', utility: '辅助'
    },
    damageTypes: {}
  }

  const fs = await import('fs')
  fs.writeFileSync('src/data/champion-meta.json', JSON.stringify(output, null, 2))
  console.log(`Written ${Object.keys(champions).length} champions to champion-meta.json`)
}

main()
```

- [ ] **Step 3: 运行导入脚本**

Run: `cd /home/giao1907/Project/Lux && npx tsx scripts/import-champion-meta.ts`
Expected: 生成包含全部英雄的 `src/data/champion-meta.json`。

- [ ] **Step 4: Commit**

```bash
cd /home/giao1907/Project/Lux
git add src/data/champion-meta.json scripts/import-champion-meta.ts
git commit -m "feat: add champion metadata and import script"
```

---

### Task 5: 工具函数

**Files:**
- Create: `src/lib/utils.ts`

- [ ] **Step 1: 编写工具函数**

```typescript
// src/lib/utils.ts

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, delayMs)
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function normalizeScore(scores: Map<number, number>): Map<number, number> {
  const entries = Array.from(scores.entries())
  if (entries.length === 0) return scores

  const min = Math.min(...entries.map(([, v]) => v))
  const max = Math.max(...entries.map(([, v]) => v))

  if (max === min) {
    return new Map(entries.map(([k]) => [k, 50]))
  }

  return new Map(
    entries.map(([k, v]) => [k, Math.round(((v - min) / (max - min)) * 100)]),
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/giao1907/Project/Lux
git add src/lib/utils.ts
git commit -m "feat: add utility functions"
```

---

### Task 6: InjectorManager

**Files:**
- Create: `src/lib/InjectorManager.ts`

- [ ] **Step 1: 编写 InjectorManager**

```typescript
// src/lib/InjectorManager.ts

type InjectTask = () => boolean

class InjectorManager {
  private tasks: Set<InjectTask> = new Set()
  private observer: MutationObserver | null = null
  private isThrottled = false

  register(task: InjectTask) {
    this.tasks.add(task)
    try { task() } catch { /* 首次执行失败静默 */ }
  }

  unregister(task: InjectTask) {
    this.tasks.delete(task)
  }

  start() {
    if (this.observer) return
    this.observer = new MutationObserver(() => {
      if (this.isThrottled) return
      this.isThrottled = true
      requestAnimationFrame(() => {
        for (const task of this.tasks) {
          try { task() } catch { /* 重试失败静默 */ }
        }
        this.isThrottled = false
      })
    })
    this.observer.observe(document.body, { childList: true, subtree: true })
  }

  stop() {
    this.observer?.disconnect()
    this.observer = null
  }
}

export const injector = new InjectorManager()
```

- [ ] **Step 2: Commit**

```bash
cd /home/giao1907/Project/Lux
git add src/lib/InjectorManager.ts
git commit -m "feat: add InjectorManager for DOM injection"
```

---

### Task 7: Config Store

**Files:**
- Create: `src/lib/store.ts`

- [ ] **Step 1: 编写 Store**

```typescript
// src/lib/store.ts

export interface LuxConfig {
  championRecommendation: boolean
}

type ConfigListener<K extends keyof LuxConfig> = (value: LuxConfig[K]) => void

const DEFAULTS: LuxConfig = {
  championRecommendation: true,
}

class LuxStore {
  private cache: LuxConfig
  private listeners = new Map<keyof LuxConfig, Set<ConfigListener<keyof LuxConfig>>>()

  constructor() {
    this.cache = { ...DEFAULTS }
  }

  get<K extends keyof LuxConfig>(key: K): LuxConfig[K] {
    const stored = DataStore.get<LuxConfig[K]>(`lux.${key}`)
    return stored !== undefined ? stored : DEFAULTS[key]
  }

  set<K extends keyof LuxConfig>(key: K, value: LuxConfig[K]) {
    this.cache[key] = value
    DataStore.set(`lux.${key}`, value)
    this.listeners.get(key)?.forEach(fn => fn(value))
  }

  onChange<K extends keyof LuxConfig>(key: K, callback: ConfigListener<K>) {
    let set = this.listeners.get(key)
    if (!set) {
      set = new Set()
      this.listeners.set(key, set)
    }
    set.add(callback)
    return () => set!.delete(callback)
  }

  /** 启动时从 DataStore 加载到内存缓存 */
  load() {
    for (const key of Object.keys(DEFAULTS) as (keyof LuxConfig)[]) {
      this.cache[key] = this.get(key)
    }
  }
}

export const store = new LuxStore()
```

- [ ] **Step 2: Commit**

```bash
cd /home/giao1907/Project/Lux
git add src/lib/store.ts
git commit -m "feat: add config store with DataStore persistence"
```

---

### Task 8: LCU Manager（精简版）

**Files:**
- Create: `src/lib/lcu.ts`

- [ ] **Step 1: 编写 LCU Manager**

```typescript
// src/lib/lcu.ts

import type { ChampSelectSession, SummonerInfo, LCUEventMessage, GameflowPhase } from '@/types/lcu'
import { LcuEventUri } from '@/types/lcu'

type EventCallback = (event: LCUEventMessage) => void

class LCUManager {
  private eventListeners = new Map<string, Set<EventCallback>>()
  private observedUris = new Set<string>()
  private penguContext: PenguContext | null = null

  bindContext(context: PenguContext) {
    this.penguContext = context
    const uris = Array.from(this.eventListeners.keys())
    this.observedUris.clear()
    uris.forEach(uri => this.observeUriOnSocket(uri))
  }

  private observeUriOnSocket(uri: string) {
    if (!this.penguContext || this.observedUris.has(uri)) return
    this.observedUris.add(uri)
    this.penguContext.socket.observe(uri, (data: unknown) => {
      const message = data as LCUEventMessage
      this.eventListeners.get(uri)?.forEach(cb => cb(message))
    })
  }

  observe(uri: string, callback: EventCallback): () => void {
    let listeners = this.eventListeners.get(uri)
    if (!listeners) {
      listeners = new Set()
      this.eventListeners.set(uri, listeners)
    }
    listeners.add(callback)
    this.observeUriOnSocket(uri)
    return () => {
      listeners?.delete(callback)
      if (listeners?.size === 0) this.eventListeners.delete(uri)
    }
  }

  // --- REST API ---

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...options.headers },
    })
    if (!res.ok) throw new Error(`[LCU] ${options.method ?? 'GET'} ${url} → ${res.status}`)
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  // --- Champ Select ---

  getChampSelectSession(): Promise<ChampSelectSession> {
    return this.request<ChampSelectSession>('/lol-champ-select/v1/session')
  }

  getPickableChampionIds(): Promise<number[]> {
    return this.request<number[]>('/lol-champ-select/v1/pickable-champion-ids')
  }

  getSummonerInfo(): Promise<SummonerInfo> {
    return this.request<SummonerInfo>('/lol-summoner/v1/current-summoner')
  }
}

export const lcu = new LCUManager()
export { LcuEventUri }
export type { LCUEventMessage, GameflowPhase, ChampSelectSession }
```

- [ ] **Step 2: Commit**

```bash
cd /home/giao1907/Project/Lux
git add src/lib/lcu.ts
git commit -m "feat: add minimal LCU Manager for champ select"
```

---

### Task 9: OP.GG API 客户端

**Files:**
- Create: `src/lib/opgg-api.ts`

- [ ] **Step 1: 编写 OP.GG API 客户端**

```typescript
// src/lib/opgg-api.ts

const OPGG_ORIGIN = 'https://lol-api-champion.op.gg'

interface OpggChampionTier {
  championId: number
  position: string
  tier: string  // "Tier1" ~ "Tier5", "OP"
  winRate: number
  pickRate: number
  banRate: number
}

interface OpggCounterStats {
  opponentChampionId: number
  winRate: number
  playCount: number
}

interface OpggSynergyStats {
  allyChampionId: number
  winRate: number
  playCount: number
}

// 中文区域 LCU queue ID → OP.GG region
// 国服 region = 'cn'
const REGION = 'cn'

/**
 * 单次超时 fetch 包装
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Lux/1.0',
        'Origin': OPGG_ORIGIN,
      },
    })
    return res
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 获取某英雄的对位 counter 数据
 */
async function getCounters(championId: number, position: string): Promise<OpggCounterStats[]> {
  try {
    const url = `${OPGG_ORIGIN}/champions/${championId}/counters?region=${REGION}&position=${position}`
    const res = await fetchWithTimeout(url, 3000)
    if (!res.ok) throw new Error(`OP.GG counter API returned ${res.status}`)
    return res.json()
  } catch {
    return []
  }
}

/**
 * 获取某英雄的协同数据
 */
async function getSynergies(championId: number, position: string): Promise<OpggSynergyStats[]> {
  try {
    const url = `${OPGG_ORIGIN}/champions/${championId}/synergies?region=${REGION}&position=${position}`
    const res = await fetchWithTimeout(url, 3000)
    if (!res.ok) throw new Error(`OP.GG synergy API returned ${res.status}`)
    return res.json()
  } catch {
    return []
  }
}

/**
 * 获取版本梯度数据
 */
async function getTierList(): Promise<OpggChampionTier[]> {
  try {
    const url = `${OPGG_ORIGIN}/tiers?region=${REGION}`
    const res = await fetchWithTimeout(url, 3000)
    if (!res.ok) throw new Error(`OP.GG tier API returned ${res.status}`)
    return res.json()
  } catch {
    return []
  }
}

export const opggApi = {
  getCounters,
  getSynergies,
  getTierList,
}

export type { OpggChampionTier, OpggCounterStats, OpggSynergyStats }
```

- [ ] **Step 2: Commit**

```bash
cd /home/giao1907/Project/Lux
git add src/lib/opgg-api.ts
git commit -m "feat: add OP.GG API client with timeout"
```

---

### Task 10: 本地规则降级

**Files:**
- Create: `src/lib/local-rules.ts`
- Create: `src/data/local-rules.json`

- [ ] **Step 1: 创建空规则数据文件**

```json
{
  "counters": {},
  "synergies": {},
  "version": "0.1.0",
  "description": "Phase 1 使用空规则集，所有评分中性。后续版本从 OP.GG 历史数据预生成。"
}
```

- [ ] **Step 2: 编写本地规则模块**

```typescript
// src/lib/local-rules.ts

/**
 * 本地静态规则表 — OP.GG API 不可用时的降级方案。
 *
 * 数据结构：
 * - counters: championId → Set<被克制的championId[]>  (此英雄克制哪些)
 * - synergies: championId → Set<协同的championId[]>    (此英雄和谁配合好)
 *
 * 规则数据从 src/data/local-rules.json 加载。
 * Phase 1 使用空规则集（所有分数中性），后续版本从版本数据预生成。
 */

import counterData from '@/data/local-rules.json'

const COUNTER_MAP: Record<string, number[]> = counterData.counters ?? {}
const SYNERGY_MAP: Record<string, number[]> = counterData.synergies ?? {}

/**
 * 获取 championId 对 targetId 的克制分数（0-100）
 */
export function getCounterScore(championId: number, targetId: number): number {
  const counteredBy = COUNTER_MAP[String(targetId)]
  if (counteredBy?.includes(championId)) return 80
  return 50
}

/**
 * 获取 championId 与 allyId 的协同分数（0-100）
 */
export function getSynergyScore(championId: number, allyId: number): number {
  const synergies = SYNERGY_MAP[String(allyId)]
  if (synergies?.includes(championId)) return 80
  return 50
}

/**
 * 获取版本强度分（0-100）
 * 本地降级时所有英雄统一返回中性分
 */
export function getMetaScore(_championId: number): number {
  return 50
}
```

- [ ] **Step 3: Commit**

```bash
cd /home/giao1907/Project/Lux
git add src/lib/local-rules.ts src/data/local-rules.json
git commit -m "feat: add local rules fallback for offline mode"
```

---

### Task 11: 评分引擎

**Files:**
- Create: `src/lib/scorer.ts`

- [ ] **Step 1: 编写评分引擎**

```typescript
// src/lib/scorer.ts

import type { OpggChampionTier, OpggCounterStats, OpggSynergyStats } from '@/lib/opgg-api'
import { getCounterScore, getSynergyScore, getMetaScore } from '@/lib/local-rules'
import { normalizeScore } from '@/lib/utils'

export interface ChampionScore {
  championId: number
  score: number        // 0-100 综合分
  synergy: number      // 协同维度
  counter: number      // 克制维度
  meta: number         // 版本强度
  balance: number      // 阵容平衡
  tier: 'strong' | 'good' | 'neutral' | 'weak' | 'avoid'
}

export interface GameState {
  allyPicks: number[]          // 己方已选英雄 ID
  enemyPicks: number[]          // 敌方已选英雄 ID
  allyBans: number[]            // 已 Ban 英雄 ID
  enemyBans: number[]           // 对方 Ban 英雄 ID
  bannedIds: number[]           // 合并后所有被 Ban 的 ID
  availableIds: number[]        // 可选的英雄 ID 列表
  assignedPosition: string      // 玩家分配的位置
  queueId: number               // 队列 ID
}

/**
 * 计算阵容 AP/AD 平衡分
 */
function computeBalanceScore(
  championId: number,
  allyPicks: number[],
  damageTypes: Record<string, string>,
): number {
  let apCount = 0
  let adCount = 0

  for (const pick of allyPicks) {
    const type = damageTypes[String(pick)] ?? 'ad'
    if (type === 'ap') apCount++
    else adCount++
  }

  const newType = damageTypes[String(championId)] ?? 'ad'
  if (newType === 'ap') apCount++
  else adCount++

  const total = apCount + adCount
  if (total === 0) return 50

  const apRatio = apCount / total
  // 最佳配比：40%~60% 之间
  if (apRatio >= 0.4 && apRatio <= 0.6) return 100
  // 极端偏向扣分
  if (apRatio === 1 || apRatio === 0) return 30
  // 轻微偏向
  return 65
}

/** 从 OP.GG counter 数据中找 championId 对 enemyId 的克制胜率 */
function findOpggCounterWinRate(counters: OpggCounterStats[], enemyId: number): number | null {
  const c = counters.find(c => c.opponentChampionId === enemyId)
  return c ? c.winRate : null
}

/** 从 OP.GG synergy 数据中找 championId 与 allyId 的协同胜率 */
function findOpggSynergyWinRate(synergies: OpggSynergyStats[], allyId: number): number | null {
  const s = synergies.find(s => s.allyChampionId === allyId)
  return s ? s.winRate : null
}

/**
 * 主评分函数：为每个候选英雄打分
 *
 * @param state 当前游戏阵容状态
 * @param opggCounters 所有候选英雄的 OP.GG counter 数据（Map<championId, OpggCounterStats[]>）
 * @param opggSynergies 所有候选英雄的 OP.GG synergy 数据
 * @param opggTiers OP.GG 梯度数据
 * @param useOpgg 是否使用 OP.GG 数据（false 则降级到本地规则）
 */
export function scoreAllChampions(
  state: GameState,
  opggCounters: Map<number, OpggCounterStats[]>,
  opggSynergies: Map<number, OpggSynergyStats[]>,
  opggTiers: Map<number, OpggChampionTier>,
  damageTypes: Record<string, string>,
  useOpgg: boolean,
): ChampionScore[] {
  const results: ChampionScore[] = []

  for (const championId of state.availableIds) {
    // 跳过已选和被 Ban 的英雄
    if (state.allyPicks.includes(championId) || state.enemyPicks.includes(championId)) continue
    if (state.bannedIds.includes(championId)) continue

    let synergyScore = 0
    let counterScore = 0
    let metaScore = 0

    if (useOpgg) {
      // --- OP.GG 数据路径 ---
      const counters = opggCounters.get(championId)
      const synergies = opggSynergies.get(championId)
      const tier = opggTiers.get(championId)

      // 协同：对每个己方已选的英雄，查找协同胜率
      for (const allyId of state.allyPicks) {
        const wr = synergies ? findOpggSynergyWinRate(synergies, allyId) : null
        synergyScore += wr !== null ? wr * 100 : 50
      }
      synergyScore = state.allyPicks.length > 0
        ? synergyScore / state.allyPicks.length
        : 50

      // 克制：对每个敌方已选的英雄，查找 counter 胜率
      for (const enemyId of state.enemyPicks) {
        const wr = counters ? findOpggCounterWinRate(counters, enemyId) : null
        counterScore += wr !== null ? wr * 100 : 50
      }
      counterScore = state.enemyPicks.length > 0
        ? counterScore / state.enemyPicks.length
        : 50

      // 版本强度
      if (tier) {
        const tierScores: Record<string, number> = { Tier1: 95, Tier2: 80, Tier3: 60, Tier4: 40, Tier5: 20, OP: 100 }
        metaScore = tierScores[tier.tier] ?? 50
      } else {
        metaScore = 50
      }
    } else {
      // --- 本地规则降级路径 ---
      for (const allyId of state.allyPicks) {
        synergyScore += getSynergyScore(championId, allyId)
      }
      synergyScore = state.allyPicks.length > 0
        ? synergyScore / state.allyPicks.length
        : 50

      for (const enemyId of state.enemyPicks) {
        counterScore += getCounterScore(championId, enemyId)
      }
      counterScore = state.enemyPicks.length > 0
        ? counterScore / state.enemyPicks.length
        : 50

      metaScore = getMetaScore(championId)
    }

    const balanceScore = computeBalanceScore(championId, state.allyPicks, damageTypes)

    const score = synergyScore * 0.35 + counterScore * 0.35 + metaScore * 0.20 + balanceScore * 0.10

    results.push({
      championId,
      score: Math.round(score),
      synergy: Math.round(synergyScore),
      counter: Math.round(counterScore),
      meta: Math.round(metaScore),
      balance: Math.round(balanceScore),
      tier: classifyScore(score),
    })
  }

  results.sort((a, b) => b.score - a.score)
  return results
}

function classifyScore(score: number): ChampionScore['tier'] {
  if (score >= 80) return 'strong'
  if (score >= 65) return 'good'
  if (score >= 45) return 'neutral'
  if (score >= 30) return 'weak'
  return 'avoid'
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/giao1907/Project/Lux
git add src/lib/scorer.ts
git commit -m "feat: add scoring engine for champion recommendation"
```

---

### Task 12: 推荐功能模块

**Files:**
- Create: `src/lib/features/champion-recommendation.ts`

- [ ] **Step 1: 编写功能模块**

```typescript
// src/lib/features/champion-recommendation.ts

import { lcu, LcuEventUri } from '@/lib/lcu'
import type { ChampSelectSession, LCUEventMessage } from '@/lib/lcu'
import { opggApi, type OpggCounterStats, type OpggSynergyStats, type OpggChampionTier } from '@/lib/opgg-api'
import { scoreAllChampions, type ChampionScore, type GameState } from '@/lib/scorer'
import { debounce } from '@/lib/utils'
import championMetaData from '@/data/champion-meta.json'

const OPGG_TIMEOUT_MS = 3000

interface RecommendationCache {
  sessionId: string
  scores: ChampionScore[]
  useOpgg: boolean
  timestamp: number
}

let cache: RecommendationCache | null = null
let unsubSession: (() => void) | null = null
let unsubPhase: (() => void) | null = null

/** 全局回调：每次计算出新推荐分时通知 UI */
let onScoresUpdated: ((scores: ChampionScore[], useOpgg: boolean) => void) | null = null

/** 全局回调：离开选人阶段时通知 UI 清除 */
let onClearRecommendation: (() => void) | null = null

export function setOnScoresUpdated(cb: (scores: ChampionScore[], useOpgg: boolean) => void) {
  onScoresUpdated = cb
}

export function setOnClearRecommendation(cb: () => void) {
  onClearRecommendation = cb
}

function extractGameState(session: ChampSelectSession, availableIds: number[]): GameState {
  const allyPicks = session.myTeam
    .filter(p => p.championId > 0)
    .map(p => p.championId)

  const enemyPicks = session.theirTeam
    .filter(p => p.championId > 0)
    .map(p => p.championId)

  const allyBans = session.bans.myTeamBans ?? []
  const enemyBans = session.bans.theirTeamBans ?? []

  const myPlayer = session.myTeam.find(p => p.cellId === session.localPlayerCellId)

  return {
    allyPicks,
    enemyPicks,
    allyBans,
    enemyBans,
    bannedIds: [...new Set([...allyBans, ...enemyBans])],
    availableIds: availableIds.filter(id => !allyPicks.includes(id) && !enemyPicks.includes(id)),
    assignedPosition: myPlayer?.assignedPosition ?? '',
    queueId: session.queueId,
  }
}

async function fetchOpggData(championIds: number[], position: string): Promise<{
  counters: Map<number, OpggCounterStats[]>
  synergies: Map<number, OpggSynergyStats[]>
  tiers: Map<number, OpggChampionTier>
  useOpgg: boolean
}> {
  try {
    const [tierList, ...champResults] = await Promise.all([
      withTimeout(opggApi.getTierList(), OPGG_TIMEOUT_MS),
      ...championIds.slice(0, 15).map(id =>
        withTimeout(
          Promise.all([
            opggApi.getCounters(id, position),
            opggApi.getSynergies(id, position),
          ]),
          OPGG_TIMEOUT_MS,
        ),
      ),
    ])

    const counters = new Map<number, OpggCounterStats[]>()
    const synergies = new Map<number, OpggSynergyStats[]>()
    champResults.forEach(([c, s], i) => {
      counters.set(championIds[i], c)
      synergies.set(championIds[i], s)
    })

    const tierMap = new Map<number, OpggChampionTier>()
    tierList.forEach(t => tierMap.set(t.championId, t))

    return { counters, synergies, tiers: tierMap, useOpgg: true }
  } catch {
    return { counters: new Map(), synergies: new Map(), tiers: new Map(), useOpgg: false }
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timeout')), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer!)
  }
}

/** 核心：接收 session 事件，触发评分计算 */
const computeRecommendation = debounce(async (session: ChampSelectSession) => {
  // 只在 Pick 阶段计算（非 Ban 非 Finalization）
  if (session.timer.phase !== 'BAN_PICK') return

  // 同一 session 不重算
  if (cache?.sessionId === session.id && cache?.scores.length > 0) return

  const availableIds = await lcu.getPickableChampionIds().catch(() => [] as number[])
  if (availableIds.length === 0) return

  const state = extractGameState(session, availableIds)
  const position = state.assignedPosition

  // 拉取 OP.GG 数据
  const relevantIds = state.availableIds.slice(0, 20) // 限制 API 调用量
  const { counters, synergies, tiers, useOpgg } = await fetchOpggData(relevantIds, position)

  // 评分
  const scores = scoreAllChampions(
    state,
    counters,
    synergies,
    tiers,
    championMetaData.damageTypes,
    useOpgg,
  )

  cache = { sessionId: session.id, scores, useOpgg, timestamp: Date.now() }
  onScoresUpdated?.(scores, useOpgg)
}, 500)

function clearCache() {
  cache = null
  onClearRecommendation?.()
}

/**
 * 启动推荐功能模块
 */
export function startRecommendation() {
  unsubSession = lcu.observe(
    LcuEventUri.CHAMP_SELECT_SESSION,
    (event: LCUEventMessage) => {
      const session = event.data as ChampSelectSession | null
      if (!session || !session.myTeam || !session.theirTeam) return
      computeRecommendation(session)
    },
  )

  // 监听 gameflow 变化：离开 ChampSelect 时清理缓存
  unsubPhase = lcu.observe(
    LcuEventUri.GAMEFLOW_PHASE_CHANGE,
    (event: LCUEventMessage) => {
      const phase = event.data as string
      if (phase !== 'ChampSelect') {
        clearCache()
      }
    },
  )
}

/**
 * 停止推荐功能模块
 */
export function stopRecommendation() {
  unsubSession?.()
  unsubSession = null
  unsubPhase?.()
  unsubPhase = null
  clearCache()
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/giao1907/Project/Lux
git add src/lib/features/champion-recommendation.ts
git commit -m "feat: add champion recommendation feature module"
```

---

### Task 13: UI — 英雄角标组件

**Files:**
- Create: `src/components/ChampionBadgeOverlay.tsx`

- [ ] **Step 1: 编写角标组件**

```typescript
// src/components/ChampionBadgeOverlay.tsx

import { useState, useEffect } from 'react'
import type { ChampionScore } from '@/lib/scorer'

const CHAMP_GRID_SELECTOR = '.champion-grid, [data-screen="champ-select"], .champ-select-container'

interface BadgeProps {
  scores: ChampionScore[]
  useOpgg: boolean
}

export function ChampionBadgeOverlay({ scores, useOpgg }: BadgeProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  const scoreMap = new Map(scores.map(s => [s.championId, s]))

  return (
    <div id="lux-badge-overlay" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      {/* 遍历 scoreMap，在对应 champion-icon 元素上叠加角标 */}
    </div>
  )
}

/**
 * 在英雄图标上注入评分角标 DOM
 * 由 InjectorManager 调度，自动处理 DOM 变动
 */
export function tryInjectBadges(scores: ChampionScore[], useOpgg: boolean): () => boolean {
  const scoreMap = new Map(scores.map(s => [s.championId, s]))

  return () => {
    const iconElements = document.querySelectorAll<HTMLElement>(
      '[data-champion-id], .champion-icon, [class*="champion"] img',
    )

    let injected = 0
    iconElements.forEach(el => {
      const championId = getChampionIdFromElement(el)
      if (!championId) return

      const score = scoreMap.get(championId)
      if (!score) return

      // 避免重复注入
      if (el.querySelector('.lux-badge')) return

      const badge = createBadgeElement(score, useOpgg)
      el.style.position = 'relative'
      el.appendChild(badge)
      injected++
    })

    return injected > 0
  }
}

function getChampionIdFromElement(el: HTMLElement): number | null {
  const dataId = el.getAttribute('data-champion-id')
  if (dataId) return parseInt(dataId, 10)

  const src = el.getAttribute('src') ?? ''
  const match = src.match(/champion[_/-](\d+)/i)
  return match ? parseInt(match[1], 10) : null
}

function createBadgeElement(score: ChampionScore, useOpgg: boolean): HTMLElement {
  const badge = document.createElement('div')
  badge.className = 'lux-badge'

  // 红色边框高亮 → 强烈推荐（top 3）
  if (score.tier === 'strong') {
    badge.style.cssText = `
      position: absolute; top: -4px; right: -4px;
      width: 24px; height: 24px;
      background: #e84057; color: #fff;
      border-radius: 50%; font-size: 11px;
      font-weight: bold; line-height: 24px; text-align: center;
      z-index: 100; pointer-events: none;
      box-shadow: 0 0 6px rgba(232,64,87,0.6);
    `
  } else if (score.tier === 'good') {
    badge.style.cssText = `
      position: absolute; top: -4px; right: -4px;
      width: 20px; height: 20px;
      background: #2ecc71; color: #fff;
      border-radius: 50%; font-size: 10px;
      font-weight: bold; line-height: 20px; text-align: center;
      z-index: 100; pointer-events: none;
    `
  } else if (score.tier === 'weak' || score.tier === 'avoid') {
    badge.style.cssText = `
      position: absolute; top: -4px; right: -4px;
      width: 20px; height: 20px;
      background: rgba(0,0,0,0.5); color: #999;
      border-radius: 50%; font-size: 10px;
      font-weight: bold; line-height: 20px; text-align: center;
      z-index: 100; pointer-events: none;
    `
  }

  if (!useOpgg) {
    // 降级数据标记：灰色
    badge.style.background = '#888'
  }

  badge.textContent = String(score.score)
  badge.title = [
    `综合: ${score.score}`,
    `协同: ${score.synergy}`,
    `克制: ${score.counter}`,
    `强度: ${score.meta}`,
    `平衡: ${score.balance}`,
    useOpgg ? '(OP.GG数据)' : '(本地数据)',
  ].join('\n')

  return badge
}
```

- [ ] **Step 2: 为角标添加边框高亮效果**

在英雄图标父元素上添加边框：

```typescript
export function tryHighlightChampion(score: ChampionScore, useOpgg: boolean): () => boolean {
  return () => {
    const parent = findChampionElement(score.championId)
    if (!parent || parent.hasAttribute('data-lux-highlighted')) return true

    const borderColor = score.tier === 'strong' ? '#e84057' : '#2ecc71'
    parent.style.boxShadow = `0 0 8px ${borderColor}, inset 0 0 0 2px ${borderColor}`
    parent.style.borderRadius = '4px'
    parent.setAttribute('data-lux-highlighted', 'true')

    return true
  }
}

function findChampionElement(championId: number): HTMLElement | null {
  const byData = document.querySelector<HTMLElement>(`[data-champion-id="${championId}"]`)
  if (byData) return byData

  // 备选：通过 img src 匹配
  const imgs = document.querySelectorAll<HTMLImageElement>(`.champion-icon img, [class*="champion"] img`)
  for (const img of imgs) {
    if (img.src.includes(`champion/${championId}`) || img.src.includes(`champion_${championId}`)) {
      return img.closest<HTMLElement>('[class*="champion"], .champion-icon, .champion-pick') ?? img
    }
  }

  return null
}
```

- [ ] **Step 3: Commit**

```bash
cd /home/giao1907/Project/Lux
git add src/components/ChampionBadgeOverlay.tsx
git commit -m "feat: add champion badge overlay component"
```

---

### Task 14: UI — 推荐面板组件

**Files:**
- Create: `src/components/RecommendationPanel.tsx`

- [ ] **Step 1: 编写推荐面板组件**

```typescript
// src/components/RecommendationPanel.tsx

import { useState } from 'react'
import type { ChampionScore } from '@/lib/scorer'
import championMetaData from '@/data/champion-meta.json'

interface PanelProps {
  scores: ChampionScore[]
  assignedPosition: string
  useOpgg: boolean
  visible: boolean
  onClose: () => void
}

export function RecommendationPanel({ scores, assignedPosition, useOpgg, visible, onClose }: PanelProps) {
  if (!visible) return null

  // 按位置分组
  const grouped = groupByPosition(scores, assignedPosition)

  return (
    <div id="lux-recommendation-panel" style={{
      position: 'fixed', right: 0, top: '10%',
      width: '320px', maxHeight: '80%',
      background: 'rgba(20,20,30,0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px 0 0 8px',
      color: '#cdd6f4',
      zIndex: 9999,
      overflow: 'auto',
      padding: '16px',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#f0c040' }}>
          🔆 推荐选择
          {!useOpgg && <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>(本地数据)</span>}
        </h3>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#888',
          cursor: 'pointer', fontSize: '18px',
        }}>×</button>
      </div>

      {/* 推荐位 Top 3 */}
      <Section title="推荐位">
        {grouped.recommended.slice(0, 3).map(s => (
          <ChampionRow key={s.championId} score={s} />
        ))}
      </Section>

      {/* 各位置 Top 1 */}
      <Section title="各位置速览">
        {Object.entries(grouped.byPosition).map(([pos, champs]) => {
          const top = champs[0]
          if (!top) return null
          return (
            <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: '#888', minWidth: '32px', fontSize: '12px' }}>
                {championMetaData.positionLabels[pos] ?? pos}
              </span>
              <ChampionRow score={top} compact />
            </div>
          )
        })}
      </Section>

      {/* 阵容分析 */}
      <Section title="阵容分析">
        <CompositionAnalysis scores={scores} />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#a6adc8' }}>{title}</h4>
      {children}
    </div>
  )
}

function ChampionRow({ score, compact = false }: { score: ChampionScore; compact?: boolean }) {
  const meta = championMetaData.champions[String(score.championId)]
  const name = meta?.name ?? `英雄 #${score.championId}`

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: compact ? '2px 0' : '6px 8px',
      background: compact ? 'none' : 'rgba(255,255,255,0.05)',
      borderRadius: '4px',
      marginBottom: compact ? 0 : '4px',
    }}>
      <span style={{
        width: compact ? '20px' : '28px', height: compact ? '20px' : '28px',
        background: '#e84057', borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: compact ? '10px' : '12px', fontWeight: 'bold',
        color: '#fff', flexShrink: 0,
      }}>
        {score.score}
      </span>
      <span style={{ flex: 1, fontWeight: compact ? 'normal' : '600' }}>{name}</span>
      {!compact && (
        <span style={{ fontSize: '11px', color: '#888' }}>
          协{score.synergy} | 克{score.counter} | 强{score.meta}
        </span>
      )}
    </div>
  )
}

function CompositionAnalysis({ scores }: { scores: ChampionScore[] }) {
  const top5 = scores.slice(0, 5)
  const apChamps = top5.filter(s => championMetaData.damageTypes[String(s.championId)] === 'ap').length
  const adCount = top5.length - apChamps

  return (
    <div style={{ fontSize: '11px', color: '#888', lineHeight: 1.6 }}>
      <div>Top 5 推荐中: AP {apChamps} | AD {adCount}</div>
      {apChamps === 0 ? <div style={{ color: '#f38ba8' }}>⚠ 无 AP 选择，阵容可能缺法伤</div> : null}
      {adCount === 0 ? <div style={{ color: '#f38ba8' }}>⚠ 无 AD 选择，阵容可能缺物伤</div> : null}
    </div>
  )
}

// --- 分组逻辑 ---

function groupByPosition(scores: ChampionScore[], assigned: string) {
  const byPosition: Record<string, ChampionScore[]> = {}
  for (const s of scores) {
    const meta = championMetaData.champions[String(s.championId)]
    const positions = meta?.positions ?? []
    for (const pos of positions) {
      if (!byPosition[pos]) byPosition[pos] = []
      byPosition[pos].push(s)
    }
  }

  // 推荐位：有分配位置→该位置排名；无→全部
  const recommended = assigned && byPosition[assigned]
    ? byPosition[assigned]
    : scores

  return { recommended, byPosition }
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/giao1907/Project/Lux
git add src/components/RecommendationPanel.tsx
git commit -m "feat: add recommendation detail panel component"
```

---

### Task 15: 入口 + 注入点 + 样式

**Files:**
- Create: `src/index.tsx`
- Create: `src/styles/index.css`

- [ ] **Step 1: 编写插件入口 index.tsx**

```typescript
/// <reference path="../pengu.d.ts" />
declare const __PLUGIN_VERSION__: string

import { createRoot } from 'react-dom/client'
import { createLogger } from '@/lib/logger'
import { lcu } from '@/lib/lcu'
import { store } from '@/lib/store'
import { injector } from '@/lib/InjectorManager'
import {
  startRecommendation,
  stopRecommendation,
  setOnScoresUpdated,
  setOnClearRecommendation,
} from '@/lib/features/champion-recommendation'
import { tryInjectBadges, tryHighlightChampion } from '@/components/ChampionBadgeOverlay'
import type { ChampionScore } from '@/lib/scorer'
import '@/styles/index.css'
import { createPortal } from 'react-dom'
import { RecommendationPanel } from '@/components/RecommendationPanel'
import { createElement, useState, useCallback } from 'react'
import type { Root } from 'react-dom/client'

const PLUGIN_NAME = 'Lux'
const PLUGIN_VERSION = __PLUGIN_VERSION__
const CONTAINER_ID = 'lux-root'

export const logger = createLogger({ name: PLUGIN_NAME, version: PLUGIN_VERSION })

interface LuxRuntime {
  container: HTMLDivElement | null
  root: Root | null
}

function getRuntime(): LuxRuntime {
  if (!(window as Record<string, unknown>).__LUX_RUNTIME__) {
    (window as Record<string, unknown>).__LUX_RUNTIME__ = { container: null, root: null }
  }
  return (window as Record<string, unknown>).__LUX_RUNTIME__ as LuxRuntime
}

// ==================== 当前推荐状态 ====================
let currentScores: ChampionScore[] = []
let currentUseOpgg = false
let currentPosition = ''

function setRecommendationState(scores: ChampionScore[], useOpgg: boolean, position: string) {
  currentScores = scores
  currentUseOpgg = useOpgg
  currentPosition = position
}

// ==================== 注入点注册 ====================

let badgeInjectTask: (() => boolean) | null = null
let highlightTasks: Array<() => boolean> = []

function updateInjections() {
  // 注销旧的注入任务
  if (badgeInjectTask) injector.unregister(badgeInjectTask)
  highlightTasks.forEach(t => injector.unregister(t))

  if (currentScores.length === 0) return

  // 注册新的角标注入
  badgeInjectTask = tryInjectBadges(currentScores, currentUseOpgg)
  injector.register(badgeInjectTask)

  // 为 Top 3 注册边框高亮注入
  highlightTasks = []
  const top3 = currentScores.slice(0, 3)
  for (const score of top3) {
    const task = tryHighlightChampion(score, currentUseOpgg)
    highlightTasks.push(task)
    injector.register(task)
  }
}

// ==================== 推荐面板 App ====================

function RecommendationApp() {
  const [visible, setVisible] = useState(false)
  const [scores, setScores] = useState<ChampionScore[]>([])
  const [useOpgg, setUseOpgg] = useState(false)
  const [position, setPosition] = useState('')

  const handleClose = useCallback(() => setVisible(false), [])

  // 暴露方法到全局，供功能模块调用
  const luxAppRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    ;(el as Record<string, unknown>).__luxUpdateScores = (s: ChampionScore[], o: boolean, p: string) => {
      setScores(s)
      setUseOpgg(o)
      setPosition(p)
      setVisible(s.length > 0)
    }
    ;(el as Record<string, unknown>).__luxHide = () => setVisible(false)
  }, [])

  return createPortal(
    createElement('div', { ref: luxAppRef }),
    document.body,
  )
}

// ==================== 生命周期 ====================

let penguContext: PenguContext | null = null

export function init(context: PenguContext) {
  penguContext = context
  lcu.bindContext(context)
  logger.printBanner()
}

export function load() {
  logger.info('Plugin loading...')

  store.load()

  // 启动推荐引擎
  startRecommendation()

  // 连接推荐结果到 UI
  setOnScoresUpdated((scores, useOpgg) => {
    setRecommendationState(scores, useOpgg, currentPosition)
    updateInjections()
  })

  setOnClearRecommendation(() => {
    currentScores = []
    if (badgeInjectTask) injector.unregister(badgeInjectTask)
    highlightTasks.forEach(t => injector.unregister(t))
  })

  // 启动全局 DOM 守护
  injector.start()

  // 挂载 React（推荐面板通过快捷键或角标点击唤出）
  mountApp()

  // 监听 F3 快捷键呼出推荐面板
  document.addEventListener('keydown', handleHotkey)

  logger.info('Lux loaded ✓')
}

function handleHotkey(e: KeyboardEvent) {
  if (e.key === 'F3' && !e.ctrlKey && !e.altKey && !e.metaKey) {
    e.preventDefault()
    // 触发面板显隐
    togglePanel()
  }
}

function togglePanel() {
  const panelRoot = document.getElementById('lux-panel-root')
  if (!panelRoot) return
  const isVisible = panelRoot.style.display !== 'none'
  panelRoot.style.display = isVisible ? 'none' : 'block'
}

function mountApp() {
  const runtime = getRuntime()

  let container = document.getElementById(CONTAINER_ID) as HTMLDivElement | null
  if (!container) {
    container = document.createElement('div')
    container.id = CONTAINER_ID
    document.body.appendChild(container)
  }

  runtime.container = container

  if (!runtime.root) {
    runtime.root = createRoot(container)
  }

  // 注：面板不使用 React Portal 渲染到独立 container，
  // 而是直接注入到 champ-select 区域的 DOM 树中
  runtime.root.render(createElement('div', { style: { display: 'none' } }))

  // 面板渲染到 body 下的独立节点
  const panelContainer = document.createElement('div')
  panelContainer.id = 'lux-panel-root'
  document.body.appendChild(panelContainer)
  const panelRoot = createRoot(panelContainer)

  panelRoot.render(
    createElement(RecommendationPanel, {
      scores: [],
      assignedPosition: '',
      useOpgg: true,
      visible: false,
      onClose: () => {},
    }),
  )
}
```

- [ ] **Step 2: 编写样式**

```css
/* src/styles/index.css */

.lux-badge {
  font-family: system-ui, -apple-system, sans-serif;
  transition: transform 0.15s ease;
}

.lux-badge:hover {
  transform: scale(1.2);
}

/* 红色边框高亮 — 强烈推荐 */
[data-lux-highlighted="true"] {
  transition: box-shadow 0.2s ease;
}

/* 推荐面板滚动条 */
#lux-recommendation-panel::-webkit-scrollbar {
  width: 4px;
}

#lux-recommendation-panel::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
}

/* 入口按钮 */
.lux-entry-btn {
  position: fixed;
  bottom: 60px;
  right: 16px;
  width: 40px;
  height: 40px;
  background: rgba(20,20,30,0.9);
  border: 1px solid rgba(240,192,64,0.3);
  border-radius: 50%;
  cursor: pointer;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f0c040;
  font-size: 18px;
  transition: background 0.2s;
}

.lux-entry-btn:hover {
  background: rgba(40,40,60,0.95);
}
```

- [ ] **Step 3: Commit**

```bash
cd /home/giao1907/Project/Lux
git add src/index.tsx src/styles/index.css
git commit -m "feat: add plugin entry point, injections, and styles"
```

---

### Task 16: 集成测试与验证

- [ ] **Step 1: 验证 TypeScript 编译**

Run: `cd /home/giao1907/Project/Lux && npx tsc --noEmit`
Expected: 无类型错误。

- [ ] **Step 2: 验证构建产物**

Run: `npm run build`
Expected: `dist/index.js` 和 `dist/index.css` 生成成功。

- [ ] **Step 3: 安装到 Pengu Loader 并测试**

```bash
# 将构建产物复制到 Pengu Loader 插件目录
# 路径取决于 Pengu Loader 配置中的 loaderPath
cp dist/index.js <loaderPath>/plugins/lux/
cp dist/index.css <loaderPath>/plugins/lux/
```

重启 League Client，进入训练模式的英雄选择，验证：
- [ ] 选人阶段英雄网格出现红色/绿色角标
- [ ] Top 3 推荐英雄有红色边框高亮
- [ ] 按 F3 键或点击角标唤出推荐面板
- [ ] 故意断开网络，验证降级到本地规则（角标变灰色）
- [ ] 离开选人阶段后角标自动清理
- [ ] 快速换人时推荐结果在 500ms 防抖后更新

- [ ] **Step 4: Commit 最终调整**

```bash
cd /home/giao1907/Project/Lux
git add -A
git commit -m "chore: final adjustments after integration testing"
```
