# Lux v2 Phase 1（数据侦察 + 数据层）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Lux v2 独立应用搭好脚手架并交付可运行的 101.qq.com 数据层：时段门控、本地数据仓、Node 客户端、同步器与 CLI。

**Architecture:** 纯 TS 的 `shared/` 模块（解析器/端点/客户端/数据仓/同步器/timeGate，全部可单测）+ `scripts/` CLI；旧 Pengu 插件代码冻结不再构建（仅 positions/qq101/测试/fixtures 迁移进新结构）。同步器只在允许时段出网（工作日 9:00–12:00、14:00–18:00 禁止，全场景约束），选人阶段零外部请求留待 Phase 2。

**Tech Stack:** TypeScript(ESM) + vitest + tsx（跑 CLI）+ node:fs（JSON 快照，无数据库）

**范围说明：** Phase 2（符文/技能摄入、推荐引擎、LCU 集成、小窗 UI、打包）在 Task 0 侦察结论落定后另行编写计划。

**关键约束：** 一切真实网络请求（Task 0 侦察、Task 7 冒烟）只允许在允许窗口执行：周一至周五 12:00–14:00、18:00 之后，或任意周末。执行前先跑 `date '+%Y-%m-%d %H:%M %A'` 核对。

---

### Task 0: 数据侦察（仅允许时段）

**Files:**
- Create: `shared/qq101/fixtures/recon-*.json`（新增样本，按发现命名）
- Create: `shared/qq101/recon-notes.md`
- Modify: `shared/qq101/fixtures/README.md`（若该文件尚在旧位置，先跳过，Task 2 后回来补）

**背景：** 已知端点（解析器已覆盖）：versionlist、`lol_101strategy`（梯度榜）、`_confront`（对位）、`_partner`（协同）。未知：① 符文端点（本地 fixture `fuwen-aram-rank-20261007.json` 来源 URL 未记录）；② 召唤师技能是否有独立端点；③ 大乱斗模式的 mode/queue 参数。本任务的产出是「发现清单 + 新样本 + 字段语义结论」，供 Phase 2 使用。

- [ ] **Step 0: 核对时间窗**

Run: `date '+%Y-%m-%d %H:%M %A'`
允许窗口 = 周一至周五 12:00–14:00 或 18:00 后，或任意周末。
Expected: 若不在窗口内 → **立即停止本任务**，告知用户「数据侦察需等待允许窗口」，其余任务（1 起）可先行执行。

- [ ] **Step 1: 抓取 101 前端资源**

```bash
mkdir -p /tmp/101recon && cd /tmp/101recon
curl -sL 'https://101.qq.com/' -o index.html
grep -oE '(/[^"'"'"' ]+\.js)' index.html | sort -u
```

对列出的每个 js 下载（逐个，间隔 0.3s）：

```bash
for u in <上一步列出的路径>; do
  curl -sL "https://101.qq.com$u" -o "$(basename "$u")"
  sleep 0.3
done
```

Expected: 得到若干 js 文件；若页面是 SPA，js 里会有路由与接口字符串。

- [ ] **Step 2: 在 js 中搜索端点线索**

```bash
grep -l 'lol_101strategy' *.js
grep -oE '"[a-zA-Z0-9_]{0,40}(fuwen|rune|talent)[a-zA-Z0-9_]{0,40}"' *.js | sort -u
grep -oE '"[a-zA-Z0-9_]{0,40}(spell|summoner)[a-zA-Z0-9_]{0,40}"' *.js | sort -u
grep -oE '[a-zA-Z0-9_/]*odp_proxy[a-zA-Z0-9_/]*' *.js | sort -u
grep -o 'R15380' *.js
```

Expected: 找出完整的端点路径与参数名（如 `conftype`、`zone`、`lane`、`mode` 之类）；记下命中文件名与上下文（`grep -o '.\{80\}lol_101strategy.\{120\}' <文件>`）。

- [ ] **Step 3: 构造候选 URL 并验证（逐个试探，间隔 0.5s，总请求数控制在 60 次内）**

候选（按需替换 <ver> 为 16.19，参数名以 Step 2 发现为准）：

```bash
curl -s 'https://mlol.qt.qq.com/go/battle_info/odp_proxy/lol_101strategy_fuwen?itier=255&version_id=<ver>&lane=ALL' | head -c 400
curl -s 'https://mlol.qt.qq.com/go/battle_info/odp_proxy/lol_101strategy?itier=255&version_id=<ver>&lane=ALL&conftype=aram' | head -c 400
```

Expected: 返回 `{"code":0,...}` 且外层形态与已有 fixture（`_fieldValues` / `result`）一致即命中；与本地 `fuwen-aram-rank-20261007.json` 的开头做对比确认同源。
- 符文命中 → 保存为 `shared/qq101/fixtures/recon-fuwen-<日期>.json`
- 大乱斗榜命中 → 保存为 `shared/qq101/fixtures/recon-aram-tier-<日期>.json`
- 技能端点：若 Step 2 找到线索则同样验证并保存；找不到 → 记录「未找到，Phase 2 用内置规则兜底」

- [ ] **Step 4: 写入侦察记录**

Create `shared/qq101/recon-notes.md`：

```markdown
# QQ101 端点侦察（2026-10-08）

- 侦察时间窗：2026-10-08 12:__ – 13:__（允许窗口内）
- 方法：抓 101 前端 js → grep 端点字符串 → curl 试探

## 结论表

| 用途 | URL 模板 | 关键参数 | 样本文件 | 字段语义 |
|---|---|---|---|---|
| 符文（大乱斗） | 待填 | 待填 | recon-fuwen-*.json | 待填（如：`#` 分英雄块，`_` 分字段…） |
| 大乱斗榜 | 待填/未找到 | | | |
| 召唤师技能 | 待填/未找到 | | | |

## 未解决 / 下个窗口继续
- （列点）
```

（执行时把「待填」替换为实际发现；确实没找到的条目写明「未找到 + 已尝试过的候选串」。）

- [ ] **Step 5: 提交**

```bash
mkdir -p shared/qq101/fixtures
git add shared/qq101/fixtures/recon-*.json shared/qq101/recon-notes.md
git commit -m "chore: capture qq101 endpoint recon samples and notes"
```

---

### Task 1: 脚手架 + 迁移 positions（含 fixtures 目录迁移）

**Files:**
- Modify: `package.json`（scripts/deps/description）
- Modify: `tsconfig.json`（整体替换为 app 作用域）
- Modify: `vitest.config.mts`（整体替换）
- Modify: `.gitignore`（加 `data/`）
- Move: `src/lib/positions.ts` → `shared/positions.ts`
- Move: `src/lib/positions.test.ts` → `shared/positions.test.ts`（改 import）
- Move: `src/test/fixtures/qq101/*` → `shared/qq101/fixtures/`

- [ ] **Step 1: 安装依赖**

```bash
npm i -D tsx @types/node
```

Expected: package.json devDependencies 新增 tsx、@types/node。

- [ ] **Step 2: 更新 package.json**

scripts 替换为（删除旧 dev/build/pack 与 `config` 块——旧插件构建不再运行）：

```json
"scripts": {
  "test": "vitest run",
  "typecheck": "tsc --noEmit",
  "sync": "tsx scripts/sync-cli.ts"
}
```

同时把 `"description"` 改为 `"Lux - 英雄联盟新手选人助手（独立应用）"`。

- [ ] **Step 3: 替换 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "moduleDetection": "force",
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["shared", "scripts"]
}
```

- [ ] **Step 4: 替换 vitest.config.mts**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['shared/**/*.test.ts'],
  },
})
```

（旧 `src/**` 测试不再运行——旧插件代码冻结；被迁移模块的测试随迁移继续跑。）

- [ ] **Step 5: .gitignore 追加运行时数据目录**

在 `.gitignore` 末尾加一行：`data/`

- [ ] **Step 6: 迁移 positions**

```bash
mkdir -p shared
git mv src/lib/positions.ts shared/positions.ts
git mv src/lib/positions.test.ts shared/positions.test.ts
```

编辑 `shared/positions.test.ts`：把 `from '@/lib/positions'` 改为 `from './positions'`。`shared/positions.ts` 自身无 import，内容保持原样。

- [ ] **Step 7: 迁移 fixtures 目录**

```bash
mkdir -p shared/qq101/fixtures
git mv src/test/fixtures/qq101/* shared/qq101/fixtures/
```

若 `src/test/fixtures/qq101/fuwen-aram-rank-20261007.json` 是未跟踪文件，用 `mv` 而非 `git mv`，然后 `git add shared/qq101/fixtures/fuwen-aram-rank-20261007.json`。

- [ ] **Step 8: 验证**

Run: `npm run test -- shared/positions.test.ts`（或 `npx vitest run shared/positions.test.ts`）
Expected: PASS（原 positions 全部用例）。
Run: `npm run typecheck`
Expected: 无错误（若此时仅有 positions 一个文件，也应为 0 错误）。

- [ ] **Step 9: 提交**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.mts .gitignore shared/positions.ts shared/positions.test.ts shared/qq101/fixtures
git commit -m "chore: switch project scaffold to app scope, migrate positions and fixtures"
```

---

### Task 2: 迁移 qq101 解析层（拆分为 types / parse / endpoints）

**Files:**
- Move+split: `src/lib/qq101.ts` → `shared/qq101/{types.ts, parse.ts, endpoints.ts}`（原文件删除）
- Move: `src/lib/qq101.test.ts` → `shared/qq101/parse.test.ts`（改 import）
- 说明：`src/lib/qq101-client.test.ts` 保持原状不动（冻结、不再运行；其覆盖由 Task 5 的 Node 版测试取代）

- [ ] **Step 1: 写 types.ts**

Create `shared/qq101/types.ts`：

```ts
import type { InternalPosition } from '../positions'

export interface Qq101TierRecord {
  rank: number | null
  championId: number
  strengthTier: string
  position: InternalPosition | ''
  winRate: number | null
  pickRate: number | null
  banRate: number | null
  counterChampionIds: number[]
}

export interface Qq101TierList {
  date: string
  champions: Qq101TierRecord[]
}

export interface Qq101Matchup {
  championId: number
  winRate: number | null
  favorable: boolean
}

export interface Qq101Synergy {
  championId: number
  winRate: number | null
  games: number | null
}
```

- [ ] **Step 2: 写 parse.ts**

Create `shared/qq101/parse.ts`（内容搬迁自 `src/lib/qq101.ts` 第 1–146 行的解析部分，逐字保留）：

```ts
// shared/qq101/parse.ts
// 101.qq.com(腾讯官方) 数据源解析。响应外层: {code, data: {result: "<JSON字符串">}}
// 记录格式: '#' 分隔记录、'_' 分隔字段、百分比为 0-100 数值

import { fromQq101Position } from '../positions'
import type { Qq101Matchup, Qq101Synergy, Qq101TierList } from './types'

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function percentToRatio(value: string | undefined): number | null {
  const n = toNumber(value)
  return n === null ? null : n / 100
}

function splitRecords(value: string | undefined): string[] {
  return (value ?? '').split('#').filter(Boolean)
}

export function extractQq101Inner(response: unknown): string | null {
  if (typeof response !== 'object' || response === null) return null
  const envelope = response as { code?: unknown; data?: unknown }
  if (envelope.code !== 0) return null

  const { data } = envelope
  if (typeof data === 'string') return data || null
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (typeof record.result === 'string' && record.result) return record.result
    const fields = record._fieldValues
    if (typeof fields === 'object' && fields !== null) {
      const first = Object.values(fields as Record<string, unknown>)[0]
      if (typeof first === 'string' && first) return first
    }
  }
  return null
}

function parseInner<T>(response: unknown): T | null {
  const inner = extractQq101Inner(response)
  if (!inner) return null
  try {
    return JSON.parse(inner) as T
  } catch {
    return null
  }
}

export function parseQq101Versions(response: unknown): string[] {
  const envelope = response as { code?: unknown; data?: unknown } | null
  if (!envelope || envelope.code !== 0 || !Array.isArray(envelope.data)) return []
  return envelope.data.flatMap(item => {
    const name = (item as { name?: unknown } | null)?.name
    return typeof name === 'string' && name ? [name] : []
  })
}

export function parseQq101TierList(response: unknown): Qq101TierList {
  const payload = parseInner<{ dtstatdate?: string; datadetails?: string }>(response)
  if (!payload) return { date: '', champions: [] }

  const champions = splitRecords(payload.datadetails).flatMap(record => {
    const fields = record.split('_')
    const championId = toNumber(fields[1])
    if (championId === null) return []
    return [{
      rank: toNumber(fields[0]),
      championId,
      strengthTier: fields[2] ?? '',
      position: fromQq101Position(fields[3] ?? ''),
      winRate: percentToRatio(fields[4]),
      pickRate: percentToRatio(fields[5]),
      banRate: percentToRatio(fields[6]),
      counterChampionIds: (fields[7] ?? '')
        .split(',')
        .map(id => toNumber(id))
        .filter((id): id is number => id !== null),
    }]
  })

  return { date: payload.dtstatdate ?? '', champions }
}

export function parseQq101Matchups(response: unknown): Qq101Matchup[] {
  const payload = parseInner<{ high_op_details?: string; low_op_details?: string }>(response)
  if (!payload) return []

  const parseList = (value: string | undefined, favorable: boolean) =>
    splitRecords(value).flatMap(record => {
      const fields = record.split('_')
      const championId = toNumber(fields[1])
      if (championId === null) return []
      return [{ championId, winRate: percentToRatio(fields[2]), favorable }]
    })

  return [
    ...parseList(payload.high_op_details, true),
    ...parseList(payload.low_op_details, false),
  ]
}

export function parseQq101Synergies(response: unknown): Qq101Synergy[] {
  const payload = parseInner<{ data_details?: string }>(response)
  if (!payload) return []

  return splitRecords(payload.data_details).flatMap(record => {
    const fields = record.split('_')
    const championId = toNumber(fields[1])
    if (championId === null) return []
    return [{
      championId,
      winRate: percentToRatio(fields[2]),
      games: toNumber(fields[3]),
    }]
  })
}
```

- [ ] **Step 3: 写 endpoints.ts**

Create `shared/qq101/endpoints.ts`：

```ts
// shared/qq101/endpoints.ts
import type { Qq101Lane } from '../positions'

export const QQ101_ORIGIN = 'https://mlol.qt.qq.com'
export const RIFT_PATH = '/go/battle_info/odp_proxy/lol_101strategy'
export const ALL_TIERS = 255

export function versionsUrl(): string {
  return `${QQ101_ORIGIN}/go/database/versionlist?zone=lol&from=h5`
}

export function riftUrl(
  path: string,
  patch: string,
  lane: Qq101Lane | 'ALL',
  championId?: number,
): string {
  const params = new URLSearchParams({
    itier: String(ALL_TIERS),
    version_id: patch,
    lane,
    ...(championId === undefined ? {} : { championid: String(championId) }),
  })
  return `${QQ101_ORIGIN}${path}?${params.toString()}`
}
```

- [ ] **Step 4: 删除旧 qq101.ts 并迁移解析测试**

```bash
git rm src/lib/qq101.ts
git mv src/lib/qq101.test.ts shared/qq101/parse.test.ts
```

编辑 `shared/qq101/parse.test.ts`：
- `from '@/lib/qq101'` → `from './parse'`（解析函数）
- 若引用了 `./endpoints` 的常量/函数则改为 `from './endpoints'`
- fixture 导入 `'@/test/fixtures/qq101/X.json'` → `'./fixtures/X.json'`
- 若有用例调用 fetch 客户端函数（getPatch/getTierList/getMatchups/getSynergies），删除这些用例（其覆盖由 Task 5 取代）

- [ ] **Step 5: 验证**

Run: `npx vitest run shared/qq101/parse.test.ts`
Expected: PASS（解析断言全部保留通过）。

Run: `npm run typecheck`
Expected: 0 错误。

- [ ] **Step 6: 提交**

```bash
git add shared/qq101 src/lib/qq101.ts src/lib/qq101.test.ts
git commit -m "refactor: split qq101 parser into shared/qq101 (types/parse/endpoints)"
```

---

### Task 3: timeGate（时段门控）

**Files:**
- Create: `shared/timegate.ts`
- Test: `shared/timegate.test.ts`

- [ ] **Step 1: 写失败测试**

Create `shared/timegate.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { isApiAllowed, nextAllowedTime } from './timegate'

// 2026-10-05 是周一；2026-10-10 是周六
function at(y: number, m: number, d: number, hh: number, mm: number): Date {
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

describe('isApiAllowed', () => {
  it('工作日 9:00-12:00 禁止', () => {
    expect(isApiAllowed(at(2026, 10, 5, 8, 59))).toBe(true)
    expect(isApiAllowed(at(2026, 10, 5, 9, 0))).toBe(false)
    expect(isApiAllowed(at(2026, 10, 5, 11, 59))).toBe(false)
    expect(isApiAllowed(at(2026, 10, 5, 12, 0))).toBe(true)
  })

  it('工作日 14:00-18:00 禁止', () => {
    expect(isApiAllowed(at(2026, 10, 5, 13, 59))).toBe(true)
    expect(isApiAllowed(at(2026, 10, 5, 14, 0))).toBe(false)
    expect(isApiAllowed(at(2026, 10, 5, 17, 59))).toBe(false)
    expect(isApiAllowed(at(2026, 10, 5, 18, 0))).toBe(true)
  })

  it('周末全天允许', () => {
    expect(isApiAllowed(at(2026, 10, 10, 10, 0))).toBe(true)
    expect(isApiAllowed(at(2026, 10, 11, 15, 0))).toBe(true)
  })
})

describe('nextAllowedTime', () => {
  it('上午禁窗中 → 返回当天 12:00', () => {
    expect(nextAllowedTime(at(2026, 10, 5, 9, 30))).toEqual(at(2026, 10, 5, 12, 0))
  })

  it('下午禁窗中 → 返回当天 18:00', () => {
    expect(nextAllowedTime(at(2026, 10, 5, 17, 30))).toEqual(at(2026, 10, 5, 18, 0))
  })

  it('已允许 → 返回当前分钟（秒清零）', () => {
    expect(nextAllowedTime(at(2026, 10, 5, 20, 15))).toEqual(at(2026, 10, 5, 20, 15))
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/timegate.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

Create `shared/timegate.ts`：

```ts
// shared/timegate.ts
// API 时段硬约束：工作日 9:00-12:00、14:00-18:00 禁止一切外部请求（含开发调试）。
// 所有网络入口必须通过 isApiAllowed；边界语义 [start, end)。

export interface BlockWindow {
  /** JS getDay()：0=周日 … 6=周六 */
  days: number[]
  startMinutes: number
  endMinutes: number
}

export const DEFAULT_BLOCK_WINDOWS: BlockWindow[] = [
  { days: [1, 2, 3, 4, 5], startMinutes: 9 * 60, endMinutes: 12 * 60 },
  { days: [1, 2, 3, 4, 5], startMinutes: 14 * 60, endMinutes: 18 * 60 },
]

export function isApiAllowed(now: Date, windows: BlockWindow[] = DEFAULT_BLOCK_WINDOWS): boolean {
  const day = now.getDay()
  const minutes = now.getHours() * 60 + now.getMinutes()
  return !windows.some(w => w.days.includes(day) && minutes >= w.startMinutes && minutes < w.endMinutes)
}

export function nextAllowedTime(now: Date, windows: BlockWindow[] = DEFAULT_BLOCK_WINDOWS): Date {
  const t = new Date(now)
  t.setSeconds(0, 0)
  for (let i = 0; i <= 8 * 24 * 60; i++) {
    if (isApiAllowed(t, windows)) return new Date(t)
    t.setMinutes(t.getMinutes() + 1)
  }
  return new Date(t)
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/timegate.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add shared/timegate.ts shared/timegate.test.ts
git commit -m "feat: add api time-gate module with boundary tests"
```

---

### Task 4: 本地数据仓（warehouse）

**Files:**
- Create: `shared/warehouse/store.ts`
- Test: `shared/warehouse/store.test.ts`

- [ ] **Step 1: 写失败测试**

Create `shared/warehouse/store.test.ts`：

```ts
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createWarehouse, type WarehouseManifest } from './store'
import type { Qq101TierList } from '../qq101/types'

function tmpRoot(): string {
  return mkdtempSync(join(tmpdir(), 'lux-wh-'))
}

const sampleTier: Qq101TierList = {
  date: '2026-10-08',
  champions: [{ rank: 1, championId: 84, strengthTier: 'T1', position: 'mid', winRate: 0.52, pickRate: 0.1, banRate: 0.05, counterChampionIds: [711] }],
}

describe('warehouse', () => {
  let root: string
  beforeEach(() => { root = tmpRoot() })

  it('manifest 往返', () => {
    const wh = createWarehouse(root)
    expect(wh.readManifest()).toBeNull()
    const m: WarehouseManifest = { patch: '16.19', dataDate: '2026-10-08', updatedAt: '2026-10-08T12:00:00.000Z' }
    wh.writeManifest(m)
    expect(wh.readManifest()).toEqual(m)
  })

  it('tier 保存/读取/存在性', () => {
    const wh = createWarehouse(root)
    expect(wh.hasTier('16.19', 'MIDDLE')).toBe(false)
    expect(wh.loadTier('16.19', 'MIDDLE')).toBeNull()
    wh.saveTier('16.19', 'MIDDLE', sampleTier)
    expect(wh.hasTier('16.19', 'MIDDLE')).toBe(true)
    expect(wh.loadTier('16.19', 'MIDDLE')).toEqual(sampleTier)
    // 不同版本互不影响
    expect(wh.loadTier('16.18', 'MIDDLE')).toBeNull()
  })

  it('matchups/synergies 按 版本+位置+英雄 存取', () => {
    const wh = createWarehouse(root)
    const matchups = [{ championId: 711, winRate: 0.55, favorable: true }]
    const synergies = [{ championId: 876, winRate: 0.58, games: 1200 }]
    expect(wh.hasMatchups('16.19', 'MIDDLE', 84)).toBe(false)
    wh.saveMatchups('16.19', 'MIDDLE', 84, matchups)
    wh.saveSynergies('16.19', 'MIDDLE', 84, synergies)
    expect(wh.loadMatchups('16.19', 'MIDDLE', 84)).toEqual(matchups)
    expect(wh.loadSynergies('16.19', 'MIDDLE', 84)).toEqual(synergies)
    expect(wh.loadMatchups('16.19', 'TOP', 84)).toBeNull()
  })

  it('文件损坏时读取返回 null', () => {
    const wh = createWarehouse(root)
    wh.saveTier('16.19', 'MIDDLE', sampleTier)
    const file = join(root, 'qq101', '16.19', 'tier-MIDDLE.json')
    writeFileSync(file, 'not-json')
    expect(wh.loadTier('16.19', 'MIDDLE')).toBeNull()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/warehouse/store.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

Create `shared/warehouse/store.ts`：

```ts
// shared/warehouse/store.ts
// 本地数据仓：JSON 快照文件（按版本目录）+ 原子写入，不引入数据库。
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Qq101Lane } from '../positions'
import type { Qq101Matchup, Qq101Synergy, Qq101TierList } from '../qq101/types'

export interface WarehouseManifest {
  patch: string
  dataDate: string
  updatedAt: string
}

export interface Warehouse {
  readManifest(): WarehouseManifest | null
  writeManifest(manifest: WarehouseManifest): void
  hasTier(patch: string, lane: Qq101Lane): boolean
  loadTier(patch: string, lane: Qq101Lane): Qq101TierList | null
  saveTier(patch: string, lane: Qq101Lane, data: Qq101TierList): void
  hasMatchups(patch: string, lane: Qq101Lane, championId: number): boolean
  loadMatchups(patch: string, lane: Qq101Lane, championId: number): Qq101Matchup[] | null
  saveMatchups(patch: string, lane: Qq101Lane, championId: number, rows: Qq101Matchup[]): void
  hasSynergies(patch: string, lane: Qq101Lane, championId: number): boolean
  loadSynergies(patch: string, lane: Qq101Lane, championId: number): Qq101Synergy[] | null
  saveSynergies(patch: string, lane: Qq101Lane, championId: number, rows: Qq101Synergy[]): void
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as T
  } catch {
    return null
  }
}

function writeJsonAtomic(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(value))
  renameSync(tmp, file)
}

export function createWarehouse(rootDir: string): Warehouse {
  const base = join(rootDir, 'qq101')
  const patchDir = (patch: string) => join(base, patch)
  const tierFile = (patch: string, lane: Qq101Lane) => join(patchDir(patch), `tier-${lane}.json`)
  const matchupsFile = (patch: string, lane: Qq101Lane, id: number) => join(patchDir(patch), `matchups-${lane}-${id}.json`)
  const synergiesFile = (patch: string, lane: Qq101Lane, id: number) => join(patchDir(patch), `synergies-${lane}-${id}.json`)
  const manifestFile = join(base, 'manifest.json')

  return {
    readManifest: () => readJson<WarehouseManifest>(manifestFile),
    writeManifest: m => writeJsonAtomic(manifestFile, m),
    hasTier: (patch, lane) => existsSync(tierFile(patch, lane)),
    loadTier: (patch, lane) => readJson<Qq101TierList>(tierFile(patch, lane)),
    saveTier: (patch, lane, data) => writeJsonAtomic(tierFile(patch, lane), data),
    hasMatchups: (patch, lane, id) => existsSync(matchupsFile(patch, lane, id)),
    loadMatchups: (patch, lane, id) => readJson<Qq101Matchup[]>(matchupsFile(patch, lane, id)),
    saveMatchups: (patch, lane, id, rows) => writeJsonAtomic(matchupsFile(patch, lane, id), rows),
    hasSynergies: (patch, lane, id) => existsSync(synergiesFile(patch, lane, id)),
    loadSynergies: (patch, lane, id) => readJson<Qq101Synergy[]>(synergiesFile(patch, lane, id)),
    saveSynergies: (patch, lane, id, rows) => writeJsonAtomic(synergiesFile(patch, lane, id), rows),
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/warehouse/store.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add shared/warehouse/store.ts shared/warehouse/store.test.ts
git commit -m "feat: add local warehouse (json snapshot store)"
```

---

### Task 5: Node 客户端（可注入 fetch / timeGate / 节流）

**Files:**
- Create: `shared/qq101/client.ts`
- Test: `shared/qq101/client.test.ts`

- [ ] **Step 1: 写失败测试**

Create `shared/qq101/client.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'
import { ApiTimeBlockedError, createQq101Client } from './client'
import tierlistFixture from './fixtures/tierlist-all.json'
import confrontFixture from './fixtures/confront-84-middle.json'
import partnerFixture from './fixtures/partner-84-middle.json'
import versionlistFixture from './fixtures/versionlist.json'

function okFetch(payload: unknown, calls: string[]) {
  return vi.fn(async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return { ok: true, json: async () => payload } as Response
  }) as unknown as typeof fetch
}

describe('createQq101Client', () => {
  it('getPatch 解析版本并缓存（两次调用只发一次请求）', async () => {
    const calls: string[] = []
    const client = createQq101Client({ fetchImpl: okFetch(versionlistFixture, calls) })
    expect(await client.getPatch()).toBe('16.19')
    expect(await client.getPatch()).toBe('16.19')
    expect(calls).toHaveLength(1)
  })

  it('getTierList 请求参数包含 lane 与版本', async () => {
    const calls: string[] = []
    const client = createQq101Client({ fetchImpl: okFetch(tierlistFixture, calls) })
    const tier = await client.getTierList('16.19', 'ALL')
    expect(tier).not.toBeNull()
    expect(tier!.champions.length).toBeGreaterThan(100)
    expect(calls[0]).toContain('lane=ALL')
    expect(calls[0]).toContain('version_id=16.19')
  })

  it('getMatchups / getSynergies 构造 championid 参数', async () => {
    const callsA: string[] = []
    const a = createQq101Client({ fetchImpl: okFetch(confrontFixture, callsA) })
    const matchups = await a.getMatchups('16.19', 'MIDDLE', 84)
    expect(matchups!.some(m => m.championId === 711)).toBe(true)
    expect(callsA[0]).toContain('lol_101strategy_confront')
    expect(callsA[0]).toContain('championid=84')

    const callsB: string[] = []
    const b = createQq101Client({ fetchImpl: okFetch(partnerFixture, callsB) })
    const synergies = await b.getSynergies('16.19', 'MIDDLE', 84)
    expect(synergies!.some(s => s.championId === 876)).toBe(true)
    expect(callsB[0]).toContain('lol_101strategy_partner')
  })

  it('禁窗内调用抛 ApiTimeBlockedError', async () => {
    const client = createQq101Client({
      fetchImpl: okFetch(versionlistFixture, []),
      isAllowed: () => false,
      now: () => new Date(2026, 9, 5, 10, 0),
    })
    await expect(client.getTierList('16.19', 'ALL')).rejects.toBeInstanceOf(ApiTimeBlockedError)
  })

  it('请求失败返回 null', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('offline') }) as unknown as typeof fetch
    const client = createQq101Client({ fetchImpl })
    expect(await client.getTierList('16.19', 'ALL')).toBeNull()
  })

  it('minIntervalMs 控制相邻请求间隔', async () => {
    vi.useFakeTimers()
    try {
      const calls: string[] = []
      const client = createQq101Client({
        fetchImpl: okFetch(tierlistFixture, calls),
        minIntervalMs: 100,
      })
      const p1 = client.getTierList('16.19', 'ALL')
      await vi.advanceTimersByTimeAsync(0)
      expect(calls).toHaveLength(1)
      const p2 = client.getTierList('16.19', 'TOP')
      await vi.advanceTimersByTimeAsync(99)
      expect(calls).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(1)
      expect(calls).toHaveLength(2)
      await Promise.all([p1, p2])
    } finally {
      vi.useRealTimers()
    }
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/qq101/client.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

Create `shared/qq101/client.ts`：

```ts
// shared/qq101/client.ts
// Node 版 101 客户端：可注入 fetch / 时段门控 / 请求节流。
// 时段禁止时抛 ApiTimeBlockedError（绝不静默吞掉）；其他网络错误返回 null。
import { isApiAllowed } from '../timegate'
import type { Qq101Lane } from '../positions'
import { RIFT_PATH, riftUrl, versionsUrl } from './endpoints'
import { parseQq101Matchups, parseQq101Synergies, parseQq101TierList, parseQq101Versions } from './parse'
import type { Qq101Matchup, Qq101Synergy, Qq101TierList } from './types'

export class ApiTimeBlockedError extends Error {
  constructor(now: Date) {
    super(`API 调用被时段限制阻止（工作日 9-12 / 14-18 禁止）：${now.toLocaleString()}`)
    this.name = 'ApiTimeBlockedError'
  }
}

export interface Qq101Client {
  getPatch(): Promise<string | null>
  getTierList(patch: string, lane: Qq101Lane | 'ALL'): Promise<Qq101TierList | null>
  getMatchups(patch: string, lane: Qq101Lane, championId: number): Promise<Qq101Matchup[] | null>
  getSynergies(patch: string, lane: Qq101Lane, championId: number): Promise<Qq101Synergy[] | null>
}

export interface CreateQq101ClientOptions {
  fetchImpl?: typeof fetch
  isAllowed?: (now: Date) => boolean
  now?: () => Date
  timeoutMs?: number
  minIntervalMs?: number
}

export function createQq101Client(options: CreateQq101ClientOptions = {}): Qq101Client {
  const fetchImpl = options.fetchImpl ?? fetch
  const allowed = options.isAllowed ?? isApiAllowed
  const now = options.now ?? (() => new Date())
  const timeoutMs = options.timeoutMs ?? 3000
  const minIntervalMs = options.minIntervalMs ?? 150

  let cachedPatch: string | null = null
  let lastRequestAt = 0

  async function guard(): Promise<void> {
    const t = now()
    if (!allowed(t)) throw new ApiTimeBlockedError(t)
    const wait = lastRequestAt + minIntervalMs - Date.now()
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))
    lastRequestAt = Date.now()
  }

  async function fetchJson(url: string): Promise<unknown> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`QQ101 responded ${res.status}`)
      return await res.json()
    } finally {
      clearTimeout(timer)
    }
  }

  async function request<T>(url: string, parse: (raw: unknown) => T): Promise<T | null> {
    await guard()
    try {
      return parse(await fetchJson(url))
    } catch (error) {
      if (error instanceof ApiTimeBlockedError) throw error
      return null
    }
  }

  return {
    async getPatch(): Promise<string | null> {
      if (cachedPatch) return cachedPatch
      const versions = await request(versionsUrl(), parseQq101Versions)
      if (!versions || versions.length === 0) return null
      cachedPatch = versions[0]
      return cachedPatch
    },
    getTierList: (patch, lane) => request(riftUrl(RIFT_PATH, patch, lane), parseQq101TierList),
    getMatchups: (patch, lane, championId) =>
      request(riftUrl(`${RIFT_PATH}_confront`, patch, lane, championId), parseQq101Matchups),
    getSynergies: (patch, lane, championId) =>
      request(riftUrl(`${RIFT_PATH}_partner`, patch, lane, championId), parseQq101Synergies),
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/qq101/client.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add shared/qq101/client.ts shared/qq101/client.test.ts
git commit -m "feat: add node qq101 client (injectable fetch, time-gate, throttle)"
```

---

### Task 6: 同步器（sync）

**Files:**
- Create: `shared/qq101/sync.ts`
- Test: `shared/qq101/sync.test.ts`

- [ ] **Step 1: 写失败测试**

Create `shared/qq101/sync.test.ts`：

```ts
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { ApiTimeBlockedError, type Qq101Client } from './client'
import { syncRiftData } from './sync'
import type { Qq101Matchup, Qq101Synergy, Qq101TierList } from './types'
import { createWarehouse, type Warehouse } from '../warehouse/store'
import type { Qq101Lane } from '../positions'

// 三个英雄的小型样本，便于断言
const CHAMPS = [84, 711, 876]

interface FakeCall { kind: 'tier' | 'matchups' | 'synergies'; lane: Qq101Lane; championId?: number }

function fakeTier(lane: Qq101Lane, date = '2026-10-08'): Qq101TierList {
  return {
    date,
    champions: CHAMPS.map((id, i) => ({
      rank: i + 1, championId: id, strengthTier: 'T1', position: 'mid',
      winRate: 0.52, pickRate: 0.1, banRate: 0.05, counterChampionIds: [],
    })),
  }
}

function createFakeClient(opts: { failChampions?: number[]; blockAfter?: number } = {}) {
  const calls: FakeCall[] = []
  let remaining = opts.blockAfter ?? Infinity
  const client: Qq101Client = {
    async getPatch() { return '16.19' },
    async getTierList(_patch, lane) {
      calls.push({ kind: 'tier', lane: lane as Qq101Lane })
      return fakeTier(lane as Qq101Lane)
    },
    async getMatchups(_patch, lane, championId): Promise<Qq101Matchup[] | null> {
      if (remaining-- <= 0) throw new ApiTimeBlockedError(new Date())
      calls.push({ kind: 'matchups', lane, championId })
      if (opts.failChampions?.includes(championId)) return null
      return [{ championId: 999, winRate: 0.55, favorable: true }]
    },
    async getSynergies(_patch, lane, championId): Promise<Qq101Synergy[] | null> {
      if (remaining-- <= 0) throw new ApiTimeBlockedError(new Date())
      calls.push({ kind: 'synergies', lane, championId })
      if (opts.failChampions?.includes(championId)) return null
      return [{ championId: 998, winRate: 0.58, games: 100 }]
    },
  }
  return { client, calls }
}

describe('syncRiftData', () => {
  let root: string
  let wh: Warehouse
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'lux-sync-')); wh = createWarehouse(root) })

  it('禁窗时不发任何请求，返回 blocked + 下个允许时间', async () => {
    const { client, calls } = createFakeClient()
    const result = await syncRiftData({
      client, warehouse: wh,
      isAllowed: () => false,
      now: () => new Date(2026, 9, 5, 10, 0), // 周一 10:00
    })
    expect(result.status).toBe('blocked')
    expect(result.blockedUntil).toBe(new Date(2026, 9, 5, 12, 0).toISOString())
    expect(calls).toHaveLength(0)
  })

  it('首次同步：拉 tier + 每英雄对位/协同，写仓并记 manifest', async () => {
    const { client, calls } = createFakeClient()
    const result = await syncRiftData({ client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    expect(result.status).toBe('synced')
    expect(result.patch).toBe('16.19')
    expect(calls.filter(c => c.kind === 'tier')).toHaveLength(1)
    expect(calls.filter(c => c.kind === 'matchups')).toHaveLength(3)
    expect(calls.filter(c => c.kind === 'synergies')).toHaveLength(3)
    expect(wh.hasTier('16.19', 'MIDDLE')).toBe(true)
    expect(wh.hasMatchups('16.19', 'MIDDLE', 84)).toBe(true)
    expect(wh.readManifest()).toMatchObject({ patch: '16.19', dataDate: '2026-10-08' })
  })

  it('二次同步：已存在且版本未变 → up-to-date，不再拉英雄数据（tier 会重刷）', async () => {
    const first = createFakeClient()
    await syncRiftData({ client: first.client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    const second = createFakeClient()
    const result = await syncRiftData({ client: second.client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    expect(result.status).toBe('up-to-date')
    expect(second.calls.filter(c => c.kind !== 'tier')).toHaveLength(0)
  })

  it('个别英雄失败 → partial，计数正确；重跑会补齐', async () => {
    const bad = createFakeClient({ failChampions: [711] })
    const r1 = await syncRiftData({ client: bad.client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    expect(r1.status).toBe('partial')
    expect(r1.matchups).toMatchObject({ fetched: 2, failed: 1 })
    expect(wh.hasMatchups('16.19', 'MIDDLE', 711)).toBe(false)

    const good = createFakeClient()
    const r2 = await syncRiftData({ client: good.client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    expect(r2.status).toBe('synced')
    expect(good.calls.filter(c => c.kind === 'matchups')).toHaveLength(1) // 只补缺失的 711
  })

  it('同步中途进入禁窗 → blocked（保留已写入部分）', async () => {
    const { client } = createFakeClient({ blockAfter: 1 })
    const result = await syncRiftData({ client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'] })
    expect(result.status).toBe('blocked')
    expect(wh.readManifest()).toBeNull() // 未完成不写 manifest
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/qq101/sync.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

Create `shared/qq101/sync.ts`：

```ts
// shared/qq101/sync.ts
// 同步器：只在允许时段运行；按 版本+位置+英雄 增量抓取并写本地数据仓。
// 策略：tier 每次同步都重刷（便宜，5 个请求）；对位/协同按文件存在性跳过（贵）。
import type { Qq101Lane } from '../positions'
import { nextAllowedTime } from '../timegate'
import { ApiTimeBlockedError, type Qq101Client } from './client'
import type { Warehouse } from '../warehouse/store'

export const ALL_LANES: Qq101Lane[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'SUPPORT']

export type SyncStatus = 'blocked' | 'up-to-date' | 'synced' | 'partial'

export interface SyncResult {
  status: SyncStatus
  patch: string | null
  dataDate: string
  matchups: { fetched: number; failed: number }
  synergies: { fetched: number; failed: number }
  blockedUntil?: string
}

export interface SyncOptions {
  client: Qq101Client
  warehouse: Warehouse
  isAllowed?: (now: Date) => boolean
  now?: () => Date
  lanes?: Qq101Lane[]
  championLimitPerLane?: number
  concurrency?: number
  onProgress?: (done: number, total: number) => void
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++]
      await worker(item)
    }
  })
  await Promise.all(runners)
}

export async function syncRiftData(options: SyncOptions): Promise<SyncResult> {
  const { client, warehouse } = options
  const now = options.now ?? (() => new Date())
  const allowed = options.isAllowed ?? (() => true)
  const lanes = options.lanes ?? ALL_LANES
  const limit = options.championLimitPerLane
  const concurrency = options.concurrency ?? 5

  const result: SyncResult = {
    status: 'synced',
    patch: null,
    dataDate: '',
    matchups: { fetched: 0, failed: 0 },
    synergies: { fetched: 0, failed: 0 },
  }

  if (!allowed(now())) {
    result.status = 'blocked'
    result.blockedUntil = nextAllowedTime(now()).toISOString()
    return result
  }

  let blocked = false
  const catchBlocked = (error: unknown): void => {
    if (error instanceof ApiTimeBlockedError) blocked = true
    else throw error
  }

  // 1) 版本
  let patch: string | null = null
  try {
    patch = await client.getPatch()
  } catch (error) {
    catchBlocked(error)
  }
  if (blocked) {
    result.status = 'blocked'
    result.blockedUntil = nextAllowedTime(now()).toISOString()
    return result
  }
  if (!patch) {
    result.status = 'partial'
    return result
  }
  result.patch = patch

  // 2) tier（每次重刷；顺带确定数据日期与各位置英雄集合）
  const championIds = new Set<number>()
  let dataDate = ''
  let anythingFailed = false
  for (const lane of lanes) {
    try {
      const tier = await client.getTierList(patch, lane)
      if (!tier) {
        anythingFailed = true
        continue
      }
      warehouse.saveTier(patch, lane, tier)
      if (!dataDate && tier.date) dataDate = tier.date
      for (const record of tier.champions) championIds.add(record.championId)
    } catch (error) {
      catchBlocked(error)
      if (blocked) break
    }
  }
  if (blocked) {
    result.status = 'blocked'
    result.blockedUntil = nextAllowedTime(now()).toISOString()
    return result
  }
  result.dataDate = dataDate

  // 3) 对位 / 协同（按存在性跳过）
  const champs = [...championIds].slice(0, limit ?? championIds.size)
  const manifest = warehouse.readManifest()
  const samePatch = manifest?.patch === patch
  const dateUnchanged = manifest?.dataDate === dataDate

  const jobs: Array<{ lane: Qq101Lane; championId: number; need: 'both' | 'matchups' | 'synergies' }> = []
  for (const lane of lanes) {
    for (const championId of champs) {
      const needM = !(samePatch && warehouse.hasMatchups(patch, lane, championId))
      const needS = !(samePatch && warehouse.hasSynergies(patch, lane, championId))
      if (needM || needS) jobs.push({ lane, championId, need: needM && needS ? 'both' : needM ? 'matchups' : 'synergies' })
    }
  }

  let done = 0
  const total = jobs.length
  await runPool(jobs, concurrency, async job => {
    if (blocked) return
    try {
      if (job.need !== 'synergies') {
        const rows = await client.getMatchups(patch!, job.lane, job.championId)
        if (rows) {
          warehouse.saveMatchups(patch!, job.lane, job.championId, rows)
          result.matchups.fetched++
        } else {
          result.matchups.failed++
          anythingFailed = true
        }
      }
      if (job.need !== 'matchups') {
        const rows = await client.getSynergies(patch!, job.lane, job.championId)
        if (rows) {
          warehouse.saveSynergies(patch!, job.lane, job.championId, rows)
          result.synergies.fetched++
        } else {
          result.synergies.failed++
          anythingFailed = true
        }
      }
    } catch (error) {
      catchBlocked(error)
      if (blocked) anythingFailed = true
    }
    done++
    options.onProgress?.(done, total)
  })

  if (blocked) {
    result.status = 'blocked'
    result.blockedUntil = nextAllowedTime(now()).toISOString()
    return result
  }

  // 4) 完成才写 manifest
  warehouse.writeManifest({ patch, dataDate, updatedAt: now().toISOString() })

  const nothingToDo = samePatch && dateUnchanged && total === 0
  result.status = anythingFailed ? 'partial' : nothingToDo ? 'up-to-date' : 'synced'
  return result
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/qq101/sync.test.ts`
Expected: PASS。若「二次同步」用例失败，检查 `samePatch` 与数据日期判断（manifest 必须在上一次成功后写入）。

- [ ] **Step 5: 提交**

```bash
git add shared/qq101/sync.ts shared/qq101/sync.test.ts
git commit -m "feat: add rift data sync orchestrator with window gating"
```

---

### Task 7: 同步 CLI + 线上冒烟（仅允许时段）

**Files:**
- Create: `scripts/sync-cli.ts`
- Modify: `shared/qq101/fixtures/README.md`（若 Task 0 已更新则跳过）

- [ ] **Step 1: 实现 CLI**

Create `scripts/sync-cli.ts`：

```ts
// scripts/sync-cli.ts
// 手工/定时跑同步：npx tsx scripts/sync-cli.ts --root ./data --lanes MIDDLE --limit 3
// 禁窗内直接退出（exit 2），绝不发请求。
import { createQq101Client } from '../shared/qq101/client'
import { syncRiftData, ALL_LANES } from '../shared/qq101/sync'
import { createWarehouse } from '../shared/warehouse/store'
import { isApiAllowed, nextAllowedTime } from '../shared/timegate'
import type { Qq101Lane } from '../shared/positions'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main(): Promise<void> {
  const root = arg('root') ?? './data'
  const lanesArg = arg('lanes')
  const lanes = (lanesArg ? lanesArg.split(',') : ALL_LANES) as Qq101Lane[]
  const limit = arg('limit') ? Number(arg('limit')) : undefined

  const now = new Date()
  console.log(`[sync] 当前时间：${now.toLocaleString()}（${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]}）`)

  if (!isApiAllowed(now)) {
    console.error(`[sync] 处于禁窗（工作日 9-12 / 14-18），不发任何请求。下个允许时间：${nextAllowedTime(now).toLocaleString()}`)
    process.exit(2)
  }

  const client = createQq101Client()
  const warehouse = createWarehouse(root)
  console.log(`[sync] 数据目录：${root}，位置：${lanes.join(',')}${limit ? `，每位置英雄上限：${limit}` : ''}`)

  const result = await syncRiftData({
    client,
    warehouse,
    lanes,
    championLimitPerLane: limit,
    onProgress: (done, total) => {
      if (total > 0 && (done === total || done % 20 === 0)) console.log(`[sync] 进度 ${done}/${total}`)
    },
  })
  console.log('[sync] 结果：', JSON.stringify(result, null, 2))
  process.exit(result.status === 'partial' ? 1 : 0)
}

main().catch(error => {
  console.error('[sync] 未处理错误：', error)
  process.exit(1)
})
```

- [ ] **Step 2: 禁窗行为验证（任何时候都能跑，零请求）**

Run（把时间条件构造成禁窗——最简单的方式：周一至周五 9-12/14-18 直接跑即可；否则用假环境变量跳过本步并在允许窗口验证）：

```bash
npm run sync -- --root ./data --lanes MIDDLE --limit 1
```

Expected（若在禁窗）：输出「处于禁窗…下个允许时间」且退出码 2，`./data` 目录不会被创建。

- [ ] **Step 3: 线上冒烟（仅允许时段）**

Run: `date '+%Y-%m-%d %H:%M %A'` 确认在允许窗口内，然后：

```bash
npm run sync -- --root ./data --lanes MIDDLE --limit 3
```

Expected: 输出 patch（如 16.19）、进度、结果 JSON（`status: "synced"`）；`./data/qq101/16.19/` 下出现 `tier-MIDDLE.json` 与少量 `matchups-MIDDLE-*.json` / `synergies-MIDDLE-*.json`；`./data/qq101/manifest.json` 写入。

再跑一次：

```bash
npm run sync -- --root ./data --lanes MIDDLE --limit 3
```

Expected: `status: "up-to-date"`（英雄数据零重拉）。

- [ ] **Step 4: 全量验证（可选，仍在允许窗口内时）**

Run: `npm run sync -- --root ./data`（不带 limit，5 个位置全量；约 1.7k 请求）
Expected: 完成或 partial（个别失败可接受）；耗时数分钟内；再次运行应为 up-to-date。

- [ ] **Step 5: 提交**

```bash
git add scripts/sync-cli.ts
git commit -m "feat: add sync cli with window check"
```

---

## 完成后状态（Phase 1 交付物）

- `shared/`：positions、timegate、qq101/{types,parse,endpoints,client,sync}、warehouse/store —— 全部有单测
- `scripts/sync-cli.ts`：可手工执行的数据同步（禁窗拒绝出网）
- `./data/`：本地数据仓（git 忽略）
- `shared/qq101/recon-notes.md` + `fixtures/recon-*.json`：符文/技能/大乱斗端点侦察结论（供 Phase 2）
- Phase 2 待写：符文/技能摄入、推荐引擎、LCU 集成、小窗 UI、打包
