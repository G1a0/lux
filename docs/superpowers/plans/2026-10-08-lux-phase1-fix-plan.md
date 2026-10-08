# Lux Phase 1 修复 实现计划

> **Status (2026-10-08):** Task 1–9 已完成（提交 13a9c9f..945abe9，之后追加 node_modules/dist 取消跟踪提交；49 个单测通过，`npm run build` 通过）。Task 10 游戏内验收待用户执行。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让选人推荐在国服客户端真正可用：修 LCU 事件处理、换 101.qq.com 国服数据源、英雄元数据运行时从客户端加载、补单测。

**Architecture:** 新增 `qq101`（数据源客户端 + 纯解析器）、`positions`（三套位置值域映射）、`champion-data`（英雄名/伤害类型/位置运行时加载 + DataStore 缓存）、`candidates`（纯函数：会话解析、候选筛选）。重构 `scorer` 为数据源无关，重写 `champion-recommendation` 的事件处理与编排。测试用 vitest + 真实响应 fixtures。

**Tech Stack:** TypeScript, React 19, Vite 6, Pengu Loader Runtime, vitest

**Spec:** `docs/superpowers/specs/2026-10-08-lux-phase1-fix-design.md`

**约定：**
- 位置值域三层：LCU（`middle`/`bottom`）→ 内部（`mid`/`bot`）→ QQ101（`MIDDLE`/`BOTTOM`）。映射只经 `positions.ts`。
- 外部数据失败一律"该维度中性 50 / dataSource 降级为 local"，不抛错到 UI。
- 每个 Task 结束运行 `npx vitest run`，必须全绿再提交。Task 6 之后消费方还没改完时 `npm run build`（tsc）可能暂时报错，属预期，Task 8 末修复。
- `DataStore` 是 Pengu 注入的全局；模块内访问一律 `typeof DataStore === 'undefined'` 守卫（测试环境不存在）。

---

## 文件结构

| 文件 | 职责 | 动作 |
|---|---|---|
| `vitest.config.mts` | vitest 配置（node 环境、`@` alias） | 新建 |
| `src/test/fixtures/qq101/*.json` | 真实响应 fixtures（已采集，2026-10-08，patch 16.19） | 已存在，待提交 |
| `src/lib/positions.ts` | 位置值域类型与三种映射 | 新建 |
| `src/lib/qq101.ts` | QQ101 解析器 + 请求客户端 + patch 缓存 | 新建 |
| `src/lib/champion-data.ts` | 英雄名/伤害类型/位置加载与缓存 | 新建 |
| `src/lib/candidates.ts` | `extractGameState`、`pickCandidates`、统计转换（纯函数） | 新建 |
| `src/lib/utils.ts` | 增加 `mapWithConcurrency` | 修改 |
| `src/lib/scorer.ts` | 数据源无关评分引擎 | 重写 |
| `src/lib/lcu.ts` | 事件回调恢复 `LCUEventMessage` | 修改 |
| `src/lib/features/champion-recommendation.ts` | 事件处理 + 编排（重算、SR 白名单、缓存） | 重写 |
| `src/components/RecommendationPanel.tsx` | 新数据源接入 | 修改 |
| `src/components/ChampionBadgeOverlay.tsx` | `dataSource` 参数 | 修改 |
| `src/index.tsx` | 回调签名透传 | 修改 |
| `src/types/champion.ts` | 新元数据类型（旧 `ChampionMeta` 删除） | 重写 |
| 删除 | `src/lib/opgg-api.ts`、`src/data/champion-meta.json`、`scripts/import-champion-meta.ts` | 删除 |

---

### Task 1: vitest 基建 + fixtures

**Files:**
- Modify: `package.json`
- Create: `vitest.config.mts`
- Create: `src/test/fixtures/qq101/README.md`
- Add: `src/test/fixtures/qq101/versionlist.json`、`tierlist-all.json`、`confront-84-middle.json`、`partner-84-middle.json`（已采集）

- [ ] **Step 1: 安装 vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: 加 test 脚本**

`package.json` scripts 增加：

```json
"test": "vitest run"
```

- [ ] **Step 3: 写 vitest 配置**

`vitest.config.mts`：

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: 写 fixtures 说明**

`src/test/fixtures/qq101/README.md`：

```markdown
# QQ101 响应 fixtures

采集时间：2026-10-08，国服 patch 16.19。来源：https://mlol.qt.qq.com

- `versionlist.json` — GET /go/database/versionlist?zone=lol&from=h5
- `tierlist-all.json` — GET /go/battle_info/odp_proxy/lol_101strategy?itier=255&version_id=16.19&lane=ALL&sort_metric=1&sort_order=2
- `confront-84-middle.json` — GET .../lol_101strategy_confront?itier=255&version_id=16.19&lane=MIDDLE&championid=84（阿卡丽中路对位）
- `partner-84-middle.json` — GET .../lol_101strategy_partner?itier=255&version_id=16.19&lane=MIDDLE&championid=84（阿卡丽中路协同）

注意：上游数据随时间变化，这些文件只用于解析器回归测试，断言数值以采集快照为准。
```

- [ ] **Step 5: 验证 vitest 可运行**

Run: `npx vitest run`
Expected: 无测试文件时 vitest 退出码非 0 或提示 "No test files found"；只要 vitest 本身能启动即可。随后删除临时用例（如创建过）。

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.mts src/test/fixtures/qq101
git commit -m "test: add vitest setup and QQ101 response fixtures"
```

---

### Task 2: 位置映射模块

**Files:**
- Create: `src/lib/positions.ts`
- Test: `src/lib/positions.test.ts`

- [ ] **Step 1: 写失败测试**

`src/lib/positions.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import {
  normalizeLcuPosition,
  toQq101Lane,
  fromQq101Position,
  POSITION_ORDER,
  POSITION_LABELS,
} from '@/lib/positions'

describe('normalizeLcuPosition', () => {
  it('maps LCU values to internal positions', () => {
    expect(normalizeLcuPosition('top')).toBe('top')
    expect(normalizeLcuPosition('jungle')).toBe('jungle')
    expect(normalizeLcuPosition('middle')).toBe('mid')
    expect(normalizeLcuPosition('bottom')).toBe('bot')
    expect(normalizeLcuPosition('utility')).toBe('utility')
  })

  it('accepts internal values as-is', () => {
    expect(normalizeLcuPosition('mid')).toBe('mid')
    expect(normalizeLcuPosition('bot')).toBe('bot')
  })

  it('returns empty string for unknown or missing values', () => {
    expect(normalizeLcuPosition('')).toBe('')
    expect(normalizeLcuPosition(undefined)).toBe('')
    expect(normalizeLcuPosition('fill')).toBe('')
  })
})

describe('toQq101Lane', () => {
  it('maps internal positions to QQ101 lane values', () => {
    expect(toQq101Lane('top')).toBe('TOP')
    expect(toQq101Lane('jungle')).toBe('JUNGLE')
    expect(toQq101Lane('mid')).toBe('MIDDLE')
    expect(toQq101Lane('bot')).toBe('BOTTOM')
    expect(toQq101Lane('utility')).toBe('SUPPORT')
  })

  it('returns null when position is unknown', () => {
    expect(toQq101Lane('')).toBeNull()
  })
})

describe('fromQq101Position', () => {
  it('maps QQ101 position strings to internal positions', () => {
    expect(fromQq101Position('TOP')).toBe('top')
    expect(fromQq101Position('MIDDLE')).toBe('mid')
    expect(fromQq101Position('BOTTOM')).toBe('bot')
    expect(fromQq101Position('SUPPORT')).toBe('utility')
    expect(fromQq101Position('JUNGLE')).toBe('jungle')
  })

  it('returns empty string for unknown values', () => {
    expect(fromQq101Position('NONE')).toBe('')
    expect(fromQq101Position('')).toBe('')
  })
})

describe('constants', () => {
  it('exposes label constants', () => {
    expect(POSITION_ORDER).toEqual(['top', 'jungle', 'mid', 'bot', 'utility'])
    expect(POSITION_LABELS.mid).toBe('中路')
    expect(POSITION_LABELS.utility).toBe('辅助')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/lib/positions.test.ts`
Expected: FAIL — Cannot find module '@/lib/positions'

- [ ] **Step 3: 实现**

`src/lib/positions.ts`：

```ts
// src/lib/positions.ts
// 三层位置值域：LCU(middle/bottom) → 内部(mid/bot) → QQ101(MIDDLE/BOTTOM)

export type InternalPosition = 'top' | 'jungle' | 'mid' | 'bot' | 'utility'

export const POSITION_ORDER: readonly InternalPosition[] = ['top', 'jungle', 'mid', 'bot', 'utility']

export const POSITION_LABELS: Record<string, string> = {
  top: '上路',
  jungle: '打野',
  mid: '中路',
  bot: '下路',
  utility: '辅助',
}

export function normalizeLcuPosition(raw: string | undefined): InternalPosition | '' {
  switch (raw) {
    case 'top': return 'top'
    case 'jungle': return 'jungle'
    case 'middle': case 'mid': return 'mid'
    case 'bottom': case 'bot': return 'bot'
    case 'utility': case 'support': return 'utility'
    default: return ''
  }
}

export type Qq101Lane = 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'SUPPORT'

export function toQq101Lane(position: InternalPosition | ''): Qq101Lane | null {
  switch (position) {
    case 'top': return 'TOP'
    case 'jungle': return 'JUNGLE'
    case 'mid': return 'MIDDLE'
    case 'bot': return 'BOTTOM'
    case 'utility': return 'SUPPORT'
    default: return null
  }
}

export function fromQq101Position(raw: string): InternalPosition | '' {
  switch (raw) {
    case 'TOP': return 'top'
    case 'JUNGLE': return 'jungle'
    case 'MIDDLE': return 'mid'
    case 'BOTTOM': return 'bot'
    case 'SUPPORT': return 'utility'
    default: return ''
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/lib/positions.test.ts`
Expected: PASS（10 个用例）

- [ ] **Step 5: Commit**

```bash
git add src/lib/positions.ts src/lib/positions.test.ts
git commit -m "feat: add position mapping module for LCU/internal/QQ101 domains"
```

---

### Task 3: QQ101 解析器

**Files:**
- Create: `src/lib/qq101.ts`
- Test: `src/lib/qq101.test.ts`

- [ ] **Step 1: 写失败测试**

`src/lib/qq101.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import {
  extractQq101Inner,
  parseQq101Versions,
  parseQq101TierList,
  parseQq101Matchups,
  parseQq101Synergies,
} from '@/lib/qq101'
import versionlistFixture from '@/test/fixtures/qq101/versionlist.json'
import tierlistFixture from '@/test/fixtures/qq101/tierlist-all.json'
import confrontFixture from '@/test/fixtures/qq101/confront-84-middle.json'
import partnerFixture from '@/test/fixtures/qq101/partner-84-middle.json'

describe('extractQq101Inner', () => {
  it('extracts the inner JSON string from data.result', () => {
    const response = { code: 0, data: { result: '{"a":1}' } }
    expect(extractQq101Inner(response)).toBe('{"a":1}')
  })

  it('falls back to _fieldValues', () => {
    const response = { code: 0, data: { _fieldValues: { R17968: '{"b":2}' } } }
    expect(extractQq101Inner(response)).toBe('{"b":2}')
  })

  it('returns null on non-zero code or missing payload', () => {
    expect(extractQq101Inner({ code: 1, data: { result: '{}' } })).toBeNull()
    expect(extractQq101Inner({ code: 0, data: { result: '' } })).toBeNull()
    expect(extractQq101Inner(null)).toBeNull()
    expect(extractQq101Inner('nope')).toBeNull()
  })
})

describe('parseQq101Versions', () => {
  it('parses patch names from fixture', () => {
    const versions = parseQq101Versions(versionlistFixture)
    expect(versions[0]).toBe('16.19')
    expect(versions.length).toBeGreaterThan(5)
  })

  it('returns empty array on malformed input', () => {
    expect(parseQq101Versions({ code: 0, data: 'nope' })).toEqual([])
  })
})

describe('parseQq101TierList', () => {
  it('parses fixture records', () => {
    const { date, champions } = parseQq101TierList(tierlistFixture)
    expect(date).toBe('20261007')
    expect(champions.length).toBeGreaterThan(100)
  })

  it('parses champion 112 (Viktor) record precisely', () => {
    const { champions } = parseQq101TierList(tierlistFixture)
    const viktor = champions.find(c => c.championId === 112)
    expect(viktor).toBeDefined()
    expect(viktor!.strengthTier).toBe('T1')
    expect(viktor!.position).toBe('mid')
    expect(viktor!.winRate).toBeCloseTo(0.5233, 4)
    expect(viktor!.pickRate).toBeCloseTo(0.0853, 4)
    expect(viktor!.counterChampionIds).toEqual([101, 84, 805])
  })

  it('returns empty result on malformed input', () => {
    expect(parseQq101TierList({ code: 1 })).toEqual({ date: '', champions: [] })
    expect(parseQq101TierList({ code: 0, data: { result: 'not json' } })).toEqual({ date: '', champions: [] })
  })
})

describe('parseQq101Matchups', () => {
  it('parses favorable and unfavorable matchups from fixture', () => {
    const matchups = parseQq101Matchups(confrontFixture)
    const cassio = matchups.find(m => m.championId === 69)
    expect(cassio).toBeDefined()
    expect(cassio!.favorable).toBe(true)
    expect(cassio!.winRate).toBeCloseTo(0.5646, 4)

    const vex = matchups.find(m => m.championId === 711)
    expect(vex).toBeDefined()
    expect(vex!.favorable).toBe(false)
    expect(vex!.winRate).toBeCloseTo(0.431, 4)
  })

  it('returns empty array on malformed input', () => {
    expect(parseQq101Matchups({ code: 1 })).toEqual([])
    expect(parseQq101Matchups({ code: 0, data: { result: '' } })).toEqual([])
  })
})

describe('parseQq101Synergies', () => {
  it('parses synergies from fixture', () => {
    const synergies = parseQq101Synergies(partnerFixture)
    expect(synergies.length).toBeGreaterThan(0)
    const lillia = synergies.find(s => s.championId === 876)
    expect(lillia).toBeDefined()
    expect(lillia!.winRate).toBeCloseTo(0.5413, 4)
    expect(lillia!.games).toBe(6285)
  })

  it('returns empty array on malformed input', () => {
    expect(parseQq101Synergies({ code: 1 })).toEqual([])
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/lib/qq101.test.ts`
Expected: FAIL — Cannot find module '@/lib/qq101'

- [ ] **Step 3: 实现解析器（本任务只写解析部分）**

`src/lib/qq101.ts`：

```ts
// src/lib/qq101.ts
// 101.qq.com(腾讯官方) 数据源。响应外层: {code, data: {result: "<JSON字符串">}}
// 记录格式: '#' 分隔记录、'_' 分隔字段、百分比为 0-100 数值

import { fromQq101Position, type InternalPosition } from '@/lib/positions'

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

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/lib/qq101.test.ts`
Expected: PASS（12 个用例；数值均来自真实 fixture）

- [ ] **Step 5: Commit**

```bash
git add src/lib/qq101.ts src/lib/qq101.test.ts
git commit -m "feat: add QQ101 response parsers with fixture-based tests"
```

---

### Task 4: QQ101 请求客户端 + patch 缓存

**Files:**
- Modify: `src/lib/utils.ts`（加 `mapWithConcurrency`）
- Modify: `src/lib/qq101.ts`（加请求部分）
- Test: `src/lib/utils.test.ts`、`src/lib/qq101-client.test.ts`

- [ ] **Step 1: 写 utils 的失败测试**

`src/lib/utils.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { mapWithConcurrency } from '@/lib/utils'

describe('mapWithConcurrency', () => {
  it('preserves result order', async () => {
    const results = await mapWithConcurrency([3, 1, 2], 2, async n => n * 10)
    expect(results).toEqual([30, 10, 20])
  })

  it('never exceeds the concurrency limit', async () => {
    let active = 0
    let peak = 0
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async () => {
      active++
      peak = Math.max(peak, active)
      await new Promise(resolve => setTimeout(resolve, 5))
      active--
      return null
    })
    expect(peak).toBe(2)
  })

  it('handles empty input', async () => {
    expect(await mapWithConcurrency([], 3, async n => n)).toEqual([])
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/lib/utils.test.ts`
Expected: FAIL — mapWithConcurrency is not exported

- [ ] **Step 3: 实现 mapWithConcurrency**

`src/lib/utils.ts` 末尾追加：

```ts
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index])
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker)
  await Promise.all(workers)
  return results
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/lib/utils.test.ts`
Expected: PASS

- [ ] **Step 5: 写请求客户端失败测试**

`src/lib/qq101-client.test.ts`：

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getPatch,
  getTierList,
  getMatchups,
  getSynergies,
  resetPatchCacheForTest,
} from '@/lib/qq101'
import tierlistFixture from '@/test/fixtures/qq101/tierlist-all.json'
import confrontFixture from '@/test/fixtures/qq101/confront-84-middle.json'
import partnerFixture from '@/test/fixtures/qq101/partner-84-middle.json'
import versionlistFixture from '@/test/fixtures/qq101/versionlist.json'

const storeStub = new Map<string, unknown>()

beforeEach(() => {
  storeStub.clear()
  resetPatchCacheForTest()
  ;(globalThis as Record<string, unknown>).DataStore = {
    get: (key: string) => storeStub.get(key),
    set: (key: string, value: unknown) => { storeStub.set(key, value); return true },
    has: (key: string) => storeStub.has(key),
    remove: (key: string) => storeStub.delete(key),
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

function mockFetchOnce(payload: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok: true,
    json: async () => payload,
  } as Response)
}

describe('getPatch', () => {
  it('fetches and caches the latest patch', async () => {
    const spy = mockFetchOnce(versionlistFixture)
    expect(await getPatch()).toBe('16.19')
    expect(await getPatch()).toBe('16.19')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('returns null when the request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'))
    expect(await getPatch()).toBeNull()
  })
})

describe('getTierList', () => {
  it('parses a successful response', async () => {
    mockFetchOnce(tierlistFixture)
    const result = await getTierList('16.19')
    expect(result).not.toBeNull()
    expect(result!.champions.length).toBeGreaterThan(100)
    const url = (globalThis.fetch as unknown as { mock: { calls: string[][] } }).mock.calls[0][0]
    expect(String(url)).toContain('lane=ALL')
    expect(String(url)).toContain('version_id=16.19')
  })

  it('returns null on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('boom'))
    expect(await getTierList('16.19')).toBeNull()
  })
})

describe('getMatchups / getSynergies', () => {
  it('builds lane and champion params for matchups', async () => {
    mockFetchOnce(confrontFixture)
    const matchups = await getMatchups('16.19', 'MIDDLE', 84)
    expect(matchups).not.toBeNull()
    expect(matchups!.some(m => m.championId === 711)).toBe(true)
    const url = String((globalThis.fetch as unknown as { mock: { calls: string[][] } }).mock.calls[0][0])
    expect(url).toContain('lol_101strategy_confront')
    expect(url).toContain('lane=MIDDLE')
    expect(url).toContain('championid=84')
  })

  it('builds params for synergies', async () => {
    mockFetchOnce(partnerFixture)
    const synergies = await getSynergies('16.19', 'MIDDLE', 84)
    expect(synergies).not.toBeNull()
    expect(synergies!.some(s => s.championId === 876)).toBe(true)
    const url = String((globalThis.fetch as unknown as { mock: { calls: string[][] } }).mock.calls[0][0])
    expect(url).toContain('lol_101strategy_partner')
    expect(url).toContain('championid=84')
  })
})
```

- [ ] **Step 6: 运行确认失败**

Run: `npx vitest run src/lib/qq101-client.test.ts`
Expected: FAIL — getPatch/getTierList 等未导出

- [ ] **Step 7: 实现请求客户端**

`src/lib/qq101.ts` 末尾追加：

```ts
// ---------- 请求客户端 ----------

const QQ101_ORIGIN = 'https://mlol.qt.qq.com'
const RIFT_PATH = '/go/battle_info/odp_proxy/lol_101strategy'
const ALL_TIERS = 255
const REQUEST_TIMEOUT_MS = 3000
const PATCH_CACHE_KEY = 'lux.qq101.patch'
const PATCH_CACHE_TTL_MS = 12 * 60 * 60 * 1000

import type { Qq101Lane } from '@/lib/positions'

let memoryPatch: string | null = null

export function resetPatchCacheForTest() {
  memoryPatch = null
}

function readStoredPatch(): string | null {
  try {
    if (typeof DataStore === 'undefined') return null
    const entry = DataStore.get<{ name?: unknown; ts?: unknown }>(PATCH_CACHE_KEY)
    if (!entry || typeof entry.name !== 'string' || typeof entry.ts !== 'number') return null
    return Date.now() - entry.ts < PATCH_CACHE_TTL_MS ? entry.name : null
  } catch {
    return null
  }
}

function writeStoredPatch(name: string) {
  try {
    if (typeof DataStore === 'undefined') return
    DataStore.set(PATCH_CACHE_KEY, { name, ts: Date.now() })
  } catch {
    // 持久化失败不影响本次会话
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`QQ101 responded ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function riftUrl(path: string, patch: string, lane: Qq101Lane | 'ALL', championId?: number): string {
  const params = new URLSearchParams({
    itier: String(ALL_TIERS),
    version_id: patch,
    lane,
    ...(championId === undefined ? {} : { championid: String(championId) }),
  })
  return `${QQ101_ORIGIN}${path}?${params.toString()}`
}

export async function getPatch(): Promise<string | null> {
  if (memoryPatch) return memoryPatch
  const stored = readStoredPatch()
  if (stored) {
    memoryPatch = stored
    return stored
  }
  try {
    const versions = parseQq101Versions(await fetchJson(`${QQ101_ORIGIN}/go/database/versionlist?zone=lol&from=h5`))
    const patch = versions[0] ?? null
    if (patch) {
      memoryPatch = patch
      writeStoredPatch(patch)
    }
    return patch
  } catch {
    return null
  }
}

export async function getTierList(patch: string): Promise<Qq101TierList | null> {
  try {
    return parseQq101TierList(await fetchJson(riftUrl(RIFT_PATH, patch, 'ALL')))
  } catch {
    return null
  }
}

export async function getMatchups(
  patch: string,
  lane: Qq101Lane,
  championId: number,
): Promise<Qq101Matchup[] | null> {
  try {
    return parseQq101Matchups(await fetchJson(riftUrl(`${RIFT_PATH}_confront`, patch, lane, championId)))
  } catch {
    return null
  }
}

export async function getSynergies(
  patch: string,
  lane: Qq101Lane,
  championId: number,
): Promise<Qq101Synergy[] | null> {
  try {
    return parseQq101Synergies(await fetchJson(riftUrl(`${RIFT_PATH}_partner`, patch, lane, championId)))
  } catch {
    return null
  }
}
```

注意：把文件顶部 Task 3 的 import 合并为（`Qq101Lane` 供请求客户端使用）：

```ts
import { fromQq101Position, type InternalPosition, type Qq101Lane } from '@/lib/positions'
```

- [ ] **Step 8: 运行确认通过**

Run: `npx vitest run src/lib/qq101-client.test.ts src/lib/utils.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/qq101.ts src/lib/qq101-client.test.ts src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat: add QQ101 HTTP client with patch cache and concurrency helper"
```

---

### Task 5: champion-data 英雄元数据模块

**Files:**
- Modify: `src/types/champion.ts`
- Create: `src/lib/champion-data.ts`
- Test: `src/lib/champion-data.test.ts`

- [ ] **Step 1: 更新类型文件**

`src/types/champion.ts`（保留旧 `ChampionMeta` 直到 Task 9 清理，避免中途类型断裂）：

```ts
// src/types/champion.ts

/** @deprecated 静态英雄表已废弃，仅过渡期保留，Task 清理时删除 */
export interface ChampionMeta {
  champions: Record<string, { name: string; enName: string; positions: string[] }>
  positionOrder: string[]
  positionLabels: Record<string, string>
  damageTypes: Record<string, string>
}

export type DamageType = 'ap' | 'ad' | 'mixed'

export interface ChampionMetaEntry {
  name: string
  alias: string
}
```

- [ ] **Step 2: 写失败测试**

`src/lib/champion-data.test.ts`：

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  toDamageType,
  ensureChampionSummary,
  getChampionName,
  ensureDamageTypes,
  getDamageType,
  getDamageTypeMap,
  resetChampionDataForTest,
} from '@/lib/champion-data'

const storeStub = new Map<string, unknown>()

beforeEach(() => {
  storeStub.clear()
  ;(globalThis as Record<string, unknown>).DataStore = {
    get: (key: string) => storeStub.get(key),
    set: (key: string, value: unknown) => { storeStub.set(key, value); return true },
    has: (key: string) => storeStub.has(key),
    remove: (key: string) => storeStub.delete(key),
  }
  resetChampionDataForTest()
})

afterEach(() => vi.restoreAllMocks())

describe('toDamageType', () => {
  it('maps LCU damage type constants', () => {
    expect(toDamageType('kDamageTypeMagic')).toBe('ap')
    expect(toDamageType('kDamageTypePhysical')).toBe('ad')
    expect(toDamageType('kDamageTypeMixed')).toBe('mixed')
    expect(toDamageType('kDamageTypeTrue')).toBeNull()
    expect(toDamageType(undefined)).toBeNull()
  })
})

describe('ensureChampionSummary', () => {
  it('loads, caches in memory and persists', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: -1, name: '无', alias: 'None' },
        { id: 84, name: '阿卡丽', alias: 'Akali' },
      ],
    } as Response)

    await ensureChampionSummary()
    expect(getChampionName(84)).toBe('阿卡丽')
    expect(getChampionName(999)).toBe('英雄 #999')
    await ensureChampionSummary()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('throws on failure so caller can decide', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 500 } as Response)
    await expect(ensureChampionSummary()).rejects.toThrow()
  })
})

describe('ensureDamageTypes + getDamageTypeMap', () => {
  it('lazily fetches missing ids and skips cached ones', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/champions/84.json')) {
        return { ok: true, json: async () => ({ tacticalInfo: { damageType: 'kDamageTypeMagic' } }) } as Response
      }
      return { ok: false, status: 404 } as Response
    })

    await ensureDamageTypes([84, 999])
    expect(getDamageType(84)).toBe('ap')
    expect(getDamageType(999)).toBeUndefined()
    expect(spy).toHaveBeenCalledTimes(2)

    await ensureDamageTypes([84])
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('builds a map for known ids only', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/champions/84.json')) {
        return { ok: true, json: async () => ({ tacticalInfo: { damageType: 'kDamageTypeMagic' } }) } as Response
      }
      return { ok: false, status: 404 } as Response
    })
    await ensureDamageTypes([84])
    const map = getDamageTypeMap([84, 999])
    expect(map.get(84)).toBe('ap')
    expect(map.has(999)).toBe(false)
  })
})
```

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run src/lib/champion-data.test.ts`
Expected: FAIL — Cannot find module '@/lib/champion-data'

- [ ] **Step 4: 实现**

`src/lib/champion-data.ts`：

```ts
// src/lib/champion-data.ts
// 英雄元数据运行时加载：名字来自客户端 champion-summary，伤害类型懒加载自 champion 详情
// 数据都在客户端本地（/lol-game-data/assets），不走外网

import type { DamageType, ChampionMetaEntry } from '@/types/champion'
import type { InternalPosition } from '@/lib/positions'
import { mapWithConcurrency } from '@/lib/utils'

const SUMMARY_PATH = '/lol-game-data/assets/v1/champion-summary.json'
const SUMMARY_CACHE_KEY = 'lux.championSummary'
const SUMMARY_TTL_MS = 24 * 60 * 60 * 1000
const DAMAGE_TYPES_KEY = 'lux.damageTypes'
const DETAIL_CONCURRENCY = 8

let summaryCache: Map<number, ChampionMetaEntry> | null = null
let damageTypesCache: Map<number, DamageType> | null = null
let positionsCache: Map<number, InternalPosition[]> = new Map()

export function resetChampionDataForTest() {
  summaryCache = null
  damageTypesCache = null
  positionsCache = new Map()
}

function dataStoreGet<T>(key: string): T | undefined {
  try {
    return typeof DataStore === 'undefined' ? undefined : DataStore.get<T>(key)
  } catch {
    return undefined
  }
}

function dataStoreSet(key: string, value: unknown) {
  try {
    if (typeof DataStore !== 'undefined') DataStore.set(key, value)
  } catch {
    // 持久化失败不影响本次会话
  }
}

export function toDamageType(raw: unknown): DamageType | null {
  if (raw === 'kDamageTypeMagic') return 'ap'
  if (raw === 'kDamageTypePhysical') return 'ad'
  if (raw === 'kDamageTypeMixed') return 'mixed'
  return null
}

export async function ensureChampionSummary(): Promise<void> {
  if (summaryCache) return

  const cached = dataStoreGet<{ ts?: number; champions?: Record<string, ChampionMetaEntry> }>(SUMMARY_CACHE_KEY)
  if (cached && typeof cached.ts === 'number' && Date.now() - cached.ts < SUMMARY_TTL_MS && cached.champions) {
    summaryCache = new Map(Object.entries(cached.champions).map(([id, entry]) => [Number(id), entry]))
    return
  }

  const res = await fetch(SUMMARY_PATH, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`champion-summary responded ${res.status}`)
  const data = await res.json() as Array<{ id: number; name: string; alias: string }>

  const champions: Record<string, ChampionMetaEntry> = {}
  for (const champ of data) {
    if (champ.id > 0 && champ.name) champions[String(champ.id)] = { name: champ.name, alias: champ.alias ?? '' }
  }

  summaryCache = new Map(Object.entries(champions).map(([id, entry]) => [Number(id), entry]))
  dataStoreSet(SUMMARY_CACHE_KEY, { ts: Date.now(), champions })
}

export function getChampionName(id: number): string {
  return summaryCache?.get(id)?.name ?? `英雄 #${id}`
}

function loadStoredDamageTypes(): Map<number, DamageType> {
  const stored = dataStoreGet<Record<string, DamageType>>(DAMAGE_TYPES_KEY) ?? {}
  return new Map(Object.entries(stored).map(([id, type]) => [Number(id), type]))
}

export async function ensureDamageTypes(ids: number[]): Promise<void> {
  if (!damageTypesCache) damageTypesCache = loadStoredDamageTypes()

  const missing = ids.filter(id => !damageTypesCache!.has(id))
  if (missing.length === 0) return

  let added = false
  await mapWithConcurrency(missing, DETAIL_CONCURRENCY, async id => {
    try {
      const res = await fetch(`/lol-game-data/assets/v1/champions/${id}.json`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) return
      const detail = await res.json() as { tacticalInfo?: { damageType?: string } }
      const type = toDamageType(detail.tacticalInfo?.damageType)
      if (type) {
        damageTypesCache!.set(id, type)
        added = true
      }
    } catch {
      // 单个英雄失败不影响整体
    }
  })

  if (added) {
    dataStoreSet(DAMAGE_TYPES_KEY, Object.fromEntries(damageTypesCache))
  }
}

export function getDamageType(id: number): DamageType | undefined {
  return damageTypesCache?.get(id)
}

export function getDamageTypeMap(ids: number[]): Map<number, DamageType> {
  const map = new Map<number, DamageType>()
  for (const id of ids) {
    const type = damageTypesCache?.get(id)
    if (type) map.set(id, type)
  }
  return map
}

export function setChampionPositions(map: Map<number, InternalPosition[]>) {
  positionsCache = map
}

export function getChampionPositions(id: number): InternalPosition[] {
  return positionsCache.get(id) ?? []
}
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run src/lib/champion-data.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/champion.ts src/lib/champion-data.ts src/lib/champion-data.test.ts
git commit -m "feat: add runtime champion metadata module (names, damage types, positions)"
```

---

### Task 6: scorer 改造（数据源无关）

**Files:**
- 重写: `src/lib/scorer.ts`
- Test: `src/lib/scorer.test.ts`

- [ ] **Step 1: 写失败测试**

`src/lib/scorer.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { scoreAllChampions, type ChampionTier, type CounterStat, type SynergyStat, type GameState } from '@/lib/scorer'
import type { DamageType } from '@/types/champion'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    allyPicks: [],
    enemyPicks: [],
    allyBans: [],
    enemyBans: [],
    bannedIds: [],
    availableIds: [1, 2, 3],
    assignedPosition: '',
    queueId: 420,
    ...overrides,
  }
}

const noDamage = new Map<number, DamageType>()

describe('scoreAllChampions', () => {
  it('returns neutral scores without external data', () => {
    const scores = scoreAllChampions(makeState(), new Map(), new Map(), new Map(), noDamage, 'local')
    expect(scores).toHaveLength(3)
    for (const s of scores) {
      expect(s.synergy).toBe(50)
      expect(s.counter).toBe(50)
      expect(s.meta).toBe(50)
      expect(s.balance).toBe(50)
    }
  })

  it('uses counter stats against enemy picks', () => {
    const counters = new Map<number, CounterStat[]>([
      [1, [{ opponentChampionId: 99, winRate: 0.55 }]],
    ])
    const state = makeState({ enemyPicks: [99] })
    const scores = scoreAllChampions(state, counters, new Map(), new Map(), noDamage, 'qq101')
    const target = scores.find(s => s.championId === 1)!
    expect(target.counter).toBe(55)
  })

  it('uses synergy stats with ally picks', () => {
    const synergies = new Map<number, SynergyStat[]>([
      [1, [{ allyChampionId: 99, winRate: 0.53 }]],
    ])
    const state = makeState({ allyPicks: [99] })
    const scores = scoreAllChampions(state, new Map(), synergies, new Map(), noDamage, 'qq101')
    const target = scores.find(s => s.championId === 1)!
    expect(target.synergy).toBe(53)
  })

  it('maps strength tiers to meta scores', () => {
    const tiers = new Map<number, ChampionTier>([
      [1, { championId: 1, tier: 'T0', winRate: 0.54 }],
      [2, { championId: 2, tier: 'T3', winRate: 0.48 }],
      [3, { championId: 3, tier: 'T9', winRate: 0.5 }],
    ])
    const scores = scoreAllChampions(makeState(), new Map(), new Map(), tiers, noDamage, 'qq101')
    expect(scores.find(s => s.championId === 1)!.meta).toBe(100)
    expect(scores.find(s => s.championId === 2)!.meta).toBe(62)
    expect(scores.find(s => s.championId === 3)!.meta).toBe(50)
  })

  it('penalizes all-AP or all-AD compositions and treats mixed as half', () => {
    const damageTypes = new Map<number, DamageType>([
      [1, 'ap'],
      [2, 'ad'],
      [3, 'mixed'],
    ])
    const state = makeState({ allyPicks: [99] })
    const types = new Map(damageTypes)
    types.set(99, 'ap')
    const scores = scoreAllChampions(state, new Map(), new Map(), new Map(), types, 'qq101')
    // 阿卡丽(1, ap) + 队友(99, ap)：纯 AP → 30
    expect(scores.find(s => s.championId === 1)!.balance).toBe(30)
    // mixed(3) + ap(99)：0.5/1.5 = 33% → 65 档
    expect(scores.find(s => s.championId === 3)!.balance).toBe(65)
    // ad(2) + ap(99)：50% → 100
    expect(scores.find(s => s.championId === 2)!.balance).toBe(100)
  })

  it('filters out picks and bans from candidates', () => {
    const state = makeState({ allyPicks: [1], bannedIds: [2] })
    const scores = scoreAllChampions(state, new Map(), new Map(), new Map(), noDamage, 'qq101')
    expect(scores.map(s => s.championId)).toEqual([3])
  })

  it('sorts by score descending', () => {
    const tiers = new Map<number, ChampionTier>([
      [3, { championId: 3, tier: 'T0', winRate: 0.55 }],
    ])
    const scores = scoreAllChampions(makeState(), new Map(), new Map(), tiers, noDamage, 'qq101')
    expect(scores[0].championId).toBe(3)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/lib/scorer.test.ts`
Expected: FAIL — 'CounterStat' 等新导出不存在 / 签名不符

- [ ] **Step 3: 重写 scorer**

`src/lib/scorer.ts`：

```ts
// src/lib/scorer.ts

import type { DamageType } from '@/types/champion'
import type { InternalPosition } from '@/lib/positions'
import { getCounterScore, getSynergyScore, getMetaScore } from '@/lib/local-rules'

export interface CounterStat {
  opponentChampionId: number
  winRate: number
}

export interface SynergyStat {
  allyChampionId: number
  winRate: number
}

export interface ChampionTier {
  championId: number
  tier: string
  winRate: number | null
}

export type DataSource = 'qq101' | 'local'

export interface ChampionScore {
  championId: number
  score: number
  synergy: number
  counter: number
  meta: number
  balance: number
  tier: 'strong' | 'good' | 'neutral' | 'weak' | 'avoid'
}

export interface GameState {
  allyPicks: number[]
  enemyPicks: number[]
  allyBans: number[]
  enemyBans: number[]
  bannedIds: number[]
  availableIds: number[]
  assignedPosition: InternalPosition | ''
  queueId: number
}

const TIER_SCORES: Record<string, number> = { T0: 100, T1: 90, T2: 78, T3: 62, T4: 48 }

function damageWeight(type: DamageType | undefined): { ap: number; ad: number } {
  if (type === 'ap') return { ap: 1, ad: 0 }
  if (type === 'ad') return { ap: 0, ad: 1 }
  if (type === 'mixed') return { ap: 0.5, ad: 0.5 }
  return { ap: 0, ad: 0 }
}

function computeBalanceScore(
  championId: number,
  allyPicks: number[],
  damageTypes: Map<number, DamageType>,
): number {
  let ap = 0
  let ad = 0
  for (const pick of allyPicks) {
    const weight = damageWeight(damageTypes.get(pick))
    ap += weight.ap
    ad += weight.ad
  }
  const own = damageWeight(damageTypes.get(championId))
  ap += own.ap
  ad += own.ad

  const total = ap + ad
  if (total === 0) return 50

  const apRatio = ap / total
  if (apRatio >= 0.4 && apRatio <= 0.6) return 100
  if (apRatio === 1 || apRatio === 0) return 30
  return 65
}

function findCounterWinRate(counters: CounterStat[] | undefined, enemyId: number): number | null {
  const stat = counters?.find(c => c.opponentChampionId === enemyId)
  return stat ? stat.winRate : null
}

function findSynergyWinRate(synergies: SynergyStat[] | undefined, allyId: number): number | null {
  const stat = synergies?.find(s => s.allyChampionId === allyId)
  return stat ? stat.winRate : null
}

export function scoreAllChampions(
  state: GameState,
  counters: Map<number, CounterStat[]>,
  synergies: Map<number, SynergyStat[]>,
  tiers: Map<number, ChampionTier>,
  damageTypes: Map<number, DamageType>,
  dataSource: DataSource,
): ChampionScore[] {
  const results: ChampionScore[] = []

  for (const championId of state.availableIds) {
    if (state.allyPicks.includes(championId) || state.enemyPicks.includes(championId)) continue
    if (state.bannedIds.includes(championId)) continue

    let synergyScore = 0
    let counterScore = 0
    let metaScore = 0

    if (dataSource === 'qq101') {
      const championCounters = counters.get(championId)
      const championSynergies = synergies.get(championId)

      for (const allyId of state.allyPicks) {
        const wr = findSynergyWinRate(championSynergies, allyId)
        synergyScore += wr !== null ? wr * 100 : 50
      }
      synergyScore = state.allyPicks.length > 0 ? synergyScore / state.allyPicks.length : 50

      for (const enemyId of state.enemyPicks) {
        const wr = findCounterWinRate(championCounters, enemyId)
        counterScore += wr !== null ? wr * 100 : 50
      }
      counterScore = state.enemyPicks.length > 0 ? counterScore / state.enemyPicks.length : 50

      const tier = tiers.get(championId)
      metaScore = tier ? TIER_SCORES[tier.tier] ?? 50 : 50
    } else {
      for (const allyId of state.allyPicks) {
        synergyScore += getSynergyScore(championId, allyId)
      }
      synergyScore = state.allyPicks.length > 0 ? synergyScore / state.allyPicks.length : 50

      for (const enemyId of state.enemyPicks) {
        counterScore += getCounterScore(championId, enemyId)
      }
      counterScore = state.enemyPicks.length > 0 ? counterScore / state.enemyPicks.length : 50

      metaScore = getMetaScore(championId)
    }

    const balanceScore = computeBalanceScore(championId, state.allyPicks, damageTypes)
    const score = synergyScore * 0.35 + counterScore * 0.35 + metaScore * 0.2 + balanceScore * 0.1

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

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/lib/scorer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/scorer.ts src/lib/scorer.test.ts
git commit -m "refactor: make scorer data-source agnostic with tier and mixed damage support"
```

（此时消费方 `champion-recommendation.ts` / `RecommendationPanel.tsx` 还没适配，tsc 会报错，Task 8 修复。）

---

### Task 7: 会话解析/候选筛选（candidates）+ LCU 事件回调修正

**Files:**
- Create: `src/lib/candidates.ts`
- Test: `src/lib/candidates.test.ts`
- Modify: `src/lib/lcu.ts`

- [ ] **Step 1: 写失败测试**

`src/lib/candidates.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { extractGameState, pickCandidates, buildPositionsMap, toCounterStats, toSynergyStats } from '@/lib/candidates'
import type { ChampSelectSession } from '@/types/lcu'
import type { Qq101TierRecord } from '@/lib/qq101'

function makeSession(overrides: Partial<ChampSelectSession> = {}): ChampSelectSession {
  return {
    id: 'session-1',
    localPlayerCellId: 0,
    myTeam: [
      { assignedPosition: 'middle', cellId: 0, championId: 0, championPickIntent: 0, gameName: 'me', summonerId: 1, puuid: 'p1', team: 1, spell1Id: 4, spell2Id: 14 },
      { assignedPosition: 'jungle', cellId: 1, championId: 64, championPickIntent: 0, gameName: 'jg', summonerId: 2, puuid: 'p2', team: 1, spell1Id: 4, spell2Id: 11 },
    ],
    theirTeam: [
      { assignedPosition: 'middle', cellId: 5, championId: 103, championPickIntent: 0, gameName: 'enemy', summonerId: 3, puuid: 'p3', team: 2, spell1Id: 4, spell2Id: 14 },
    ],
    bans: { myTeamBans: [1], theirTeamBans: [2], numBans: 10 },
    queueId: 420,
    timer: { adjustedTimeLeftInPhase: 20000, internalNowInEpochMs: 0, isInfinite: false, phase: 'BAN_PICK', totalTimeInPhase: 30000 },
    ...overrides,
  } as ChampSelectSession
}

describe('extractGameState', () => {
  it('normalizes position and extracts picks/bans', () => {
    const state = extractGameState(makeSession(), [5, 6, 7, 64, 103, 1])
    expect(state.assignedPosition).toBe('mid')
    expect(state.allyPicks).toEqual([64])
    expect(state.enemyPicks).toEqual([103])
    expect(state.bannedIds).toEqual([1, 2])
    // 已选与 ban 被剔除
    expect(state.availableIds).toEqual([5, 6, 7])
    expect(state.queueId).toBe(420)
  })

  it('handles unknown assigned position', () => {
    const session = makeSession({
      myTeam: [{ assignedPosition: '', cellId: 0, championId: 0, championPickIntent: 0, gameName: 'me', summonerId: 1, puuid: 'p1', team: 1, spell1Id: 4, spell2Id: 14 }],
    } as Partial<ChampSelectSession>)
    expect(extractGameState(session, []).assignedPosition).toBe('')
  })
})

describe('pickCandidates', () => {
  const records: Qq101TierRecord[] = [
    { rank: 3, championId: 10, strengthTier: 'T1', position: 'mid', winRate: 0.52, pickRate: 0.08, banRate: 0.1, counterChampionIds: [] },
    { rank: 1, championId: 11, strengthTier: 'T0', position: 'mid', winRate: 0.54, pickRate: 0.09, banRate: 0.2, counterChampionIds: [] },
    { rank: 2, championId: 12, strengthTier: 'T1', position: 'top', winRate: 0.53, pickRate: 0.07, banRate: 0.05, counterChampionIds: [] },
  ]

  it('filters by position and orders by rank', () => {
    expect(pickCandidates([10, 11, 12], records, 'mid')).toEqual([11, 10])
  })

  it('includes all positions when position unknown', () => {
    expect(pickCandidates([10, 11, 12], records, '')).toEqual([11, 12, 10])
  })

  it('only returns pickable champions and respects limit', () => {
    expect(pickCandidates([10, 11], records, 'mid', 1)).toEqual([11])
    expect(pickCandidates([12], records, 'mid')).toEqual([])
  })
})

describe('buildPositionsMap', () => {
  it('collects distinct positions per champion', () => {
    const records: Qq101TierRecord[] = [
      { rank: 1, championId: 84, strengthTier: 'T1', position: 'mid', winRate: null, pickRate: null, banRate: null, counterChampionIds: [] },
      { rank: 2, championId: 84, strengthTier: 'T2', position: 'top', winRate: null, pickRate: null, banRate: null, counterChampionIds: [] },
    ]
    expect(buildPositionsMap(records).get(84)).toEqual(['mid', 'top'])
  })
})

describe('stat conversions', () => {
  it('toCounterStats keeps only entries with winRate', () => {
    expect(toCounterStats([
      { championId: 711, winRate: 0.431, favorable: false },
      { championId: 1, winRate: null, favorable: true },
    ])).toEqual([{ opponentChampionId: 711, winRate: 0.431 }])
  })

  it('toSynergyStats keeps only entries with winRate', () => {
    expect(toSynergyStats([
      { championId: 876, winRate: 0.5413, games: 6285 },
      { championId: 2, winRate: null, games: null },
    ])).toEqual([{ allyChampionId: 876, winRate: 0.5413 }])
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/lib/candidates.test.ts`
Expected: FAIL — Cannot find module '@/lib/candidates'

- [ ] **Step 3: 实现 candidates**

`src/lib/candidates.ts`：

```ts
// src/lib/candidates.ts
// 纯函数：会话 → 对局状态；tier 榜 → 候选列表/位置表；QQ101 原始数据 → 评分输入

import type { ChampSelectSession } from '@/types/lcu'
import type { GameState, CounterStat, SynergyStat, ChampionTier } from '@/lib/scorer'
import type { Qq101TierRecord, Qq101Matchup, Qq101Synergy } from '@/lib/qq101'
import { normalizeLcuPosition, type InternalPosition } from '@/lib/positions'

export const SR_QUEUE_IDS = new Set([400, 420, 430, 440, 480])

export function extractGameState(session: ChampSelectSession, availableIds: number[]): GameState {
  const allyPicks = session.myTeam.filter(p => p.championId > 0).map(p => p.championId)
  const enemyPicks = session.theirTeam.filter(p => p.championId > 0).map(p => p.championId)
  const allyBans = session.bans?.myTeamBans ?? []
  const enemyBans = session.bans?.theirTeamBans ?? []
  const myPlayer = session.myTeam.find(p => p.cellId === session.localPlayerCellId)

  return {
    allyPicks,
    enemyPicks,
    allyBans,
    enemyBans,
    bannedIds: [...new Set([...allyBans, ...enemyBans])],
    availableIds: availableIds.filter(id => !allyPicks.includes(id) && !enemyPicks.includes(id)),
    assignedPosition: normalizeLcuPosition(myPlayer?.assignedPosition),
    queueId: session.queueId,
  }
}

export function pickCandidates(
  availableIds: number[],
  tierChampions: Qq101TierRecord[],
  position: InternalPosition | '',
  limit = 20,
): number[] {
  const available = new Set(availableIds)
  const ordered = [...tierChampions].sort(
    (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER),
  )

  const picked: number[] = []
  const seen = new Set<number>()
  for (const record of ordered) {
    if (!available.has(record.championId) || seen.has(record.championId)) continue
    if (position && record.position !== position) continue
    seen.add(record.championId)
    picked.push(record.championId)
    if (picked.length >= limit) break
  }
  return picked
}

export function findBestTierRecord(
  tierChampions: Qq101TierRecord[],
  championId: number,
  position: InternalPosition | '',
): Qq101TierRecord | null {
  let best: Qq101TierRecord | null = null
  for (const record of tierChampions) {
    if (record.championId !== championId) continue
    if (position && record.position !== position) continue
    if (!best || (record.rank ?? Number.MAX_SAFE_INTEGER) < (best.rank ?? Number.MAX_SAFE_INTEGER)) {
      best = record
    }
  }
  return best
}

export function buildPositionsMap(tierChampions: Qq101TierRecord[]): Map<number, InternalPosition[]> {
  const map = new Map<number, InternalPosition[]>()
  for (const record of tierChampions) {
    if (!record.position) continue
    const list = map.get(record.championId) ?? []
    if (!list.includes(record.position)) list.push(record.position)
    map.set(record.championId, list)
  }
  return map
}

export function toChampionTier(record: Qq101TierRecord): ChampionTier {
  return { championId: record.championId, tier: record.strengthTier, winRate: record.winRate }
}

export function toCounterStats(matchups: Qq101Matchup[]): CounterStat[] {
  return matchups.flatMap(m =>
    m.winRate === null ? [] : [{ opponentChampionId: m.championId, winRate: m.winRate }],
  )
}

export function toSynergyStats(synergies: Qq101Synergy[]): SynergyStat[] {
  return synergies.flatMap(s =>
    s.winRate === null ? [] : [{ allyChampionId: s.championId, winRate: s.winRate }],
  )
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/lib/candidates.test.ts`
Expected: PASS

- [ ] **Step 5: 修正 lcu.ts 事件回调**

`src/lib/lcu.ts` 改为（完整文件）：

```ts
import type { ChampSelectSession, SummonerInfo, LCUEventMessage } from '@/types/lcu'
import { LcuEventUri } from '@/types/lcu'

type EventCallback = (message: LCUEventMessage) => void

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
    // Pengu 文档：socket.observe 的 listener 收到 { data, uri, eventType }
    this.penguContext.socket.observe(uri, (raw: unknown) => {
      const message = raw as LCUEventMessage
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
export type { ChampSelectSession, LCUEventMessage }
```

- [ ] **Step 6: 运行全部测试**

Run: `npx vitest run`
Expected: PASS（positions / qq101 / qq101-client / utils / champion-data / scorer / candidates）

- [ ] **Step 7: Commit**

```bash
git add src/lib/candidates.ts src/lib/candidates.test.ts src/lib/lcu.ts
git commit -m "feat: add candidate selection logic and fix LCU event message handling"
```

---

### Task 8: 重写推荐功能编排 + UI 接入

**Files:**
- 重写: `src/lib/features/champion-recommendation.ts`
- Modify: `src/components/RecommendationPanel.tsx`
- Modify: `src/components/ChampionBadgeOverlay.tsx`
- Modify: `src/index.tsx`

- [ ] **Step 1: 重写 champion-recommendation.ts**

```ts
// src/lib/features/champion-recommendation.ts

import { lcu, LcuEventUri } from '@/lib/lcu'
import type { ChampSelectSession, LCUEventMessage } from '@/lib/lcu'
import {
  scoreAllChampions,
  type ChampionScore,
  type CounterStat,
  type SynergyStat,
  type ChampionTier,
  type DataSource,
} from '@/lib/scorer'
import { getPatch, getTierList, getMatchups, getSynergies, type Qq101TierList } from '@/lib/qq101'
import {
  ensureChampionSummary,
  ensureDamageTypes,
  getDamageTypeMap,
  setChampionPositions,
} from '@/lib/champion-data'
import {
  extractGameState,
  pickCandidates,
  findBestTierRecord,
  buildPositionsMap,
  toChampionTier,
  toCounterStats,
  toSynergyStats,
  SR_QUEUE_IDS,
} from '@/lib/candidates'
import { toQq101Lane, type InternalPosition, type Qq101Lane } from '@/lib/positions'
import { debounce, mapWithConcurrency } from '@/lib/utils'

const CANDIDATE_LIMIT = 20
const FETCH_CONCURRENCY = 5

interface SessionDataCache {
  sessionId: string
  patch: string | null
  tierList: Qq101TierList | null
  counters: Map<string, CounterStat[]>
  synergies: Map<string, SynergyStat[]>
}

let sessionData: SessionDataCache | null = null
let generation = 0

let unsubSession: (() => void) | null = null
let unsubPhase: (() => void) | null = null

let onScoresUpdated: ((scores: ChampionScore[], dataSource: DataSource, position: InternalPosition | '', dataDate: string) => void) | null = null
let onClearRecommendation: (() => void) | null = null

export function setOnScoresUpdated(cb: (scores: ChampionScore[], dataSource: DataSource, position: InternalPosition | '', dataDate: string) => void) {
  onScoresUpdated = cb
}

export function setOnClearRecommendation(cb: () => void) {
  onClearRecommendation = cb
}

async function loadSessionData(sessionId: string): Promise<SessionDataCache> {
  if (sessionData?.sessionId === sessionId) return sessionData
  const patch = await getPatch()
  const tierList = patch ? await getTierList(patch) : null
  sessionData = { sessionId, patch, tierList, counters: new Map(), synergies: new Map() }
  return sessionData
}

async function fetchCounters(data: SessionDataCache, lane: Qq101Lane, championId: number): Promise<void> {
  const key = `${lane}:${championId}`
  if (data.counters.has(key) || !data.patch) return
  const matchups = await getMatchups(data.patch, lane, championId)
  if (matchups !== null) data.counters.set(key, toCounterStats(matchups))
}

async function fetchSynergies(data: SessionDataCache, lane: Qq101Lane, championId: number): Promise<void> {
  const key = `${lane}:${championId}`
  if (data.synergies.has(key) || !data.patch) return
  const synergies = await getSynergies(data.patch, lane, championId)
  if (synergies !== null) data.synergies.set(key, toSynergyStats(synergies))
}

const computeRecommendation = debounce(async (session: ChampSelectSession) => {
  if (session.timer.phase !== 'BAN_PICK' && session.timer.phase !== 'PLANNING') return
  if (!SR_QUEUE_IDS.has(session.queueId)) {
    clearUi()
    return
  }

  const gen = ++generation
  const data = await loadSessionData(session.id)
  if (gen !== generation) return

  const availableIds = await lcu.getPickableChampionIds().catch(() => [] as number[])
  if (gen !== generation || availableIds.length === 0) return

  const state = extractGameState(session, availableIds)
  const position = state.assignedPosition
  const lane = toQq101Lane(position)

  const tierChampions = data.tierList?.champions ?? []
  const hasTierData = tierChampions.length > 0
  const dataSource: DataSource = hasTierData ? 'qq101' : 'local'

  await ensureChampionSummary().catch(() => {})
  if (gen !== generation) return

  if (hasTierData) setChampionPositions(buildPositionsMap(tierChampions))

  const candidateIds = hasTierData
    ? pickCandidates(state.availableIds, tierChampions, position, CANDIDATE_LIMIT)
    : state.availableIds.slice(0, CANDIDATE_LIMIT)

  const tierMap = new Map<number, ChampionTier>()
  if (hasTierData) {
    for (const id of candidateIds) {
      const record = findBestTierRecord(tierChampions, id, position)
      if (record) tierMap.set(id, toChampionTier(record))
    }
  }

  await ensureDamageTypes(candidateIds).catch(() => {})
  if (gen !== generation) return

  const counters = new Map<number, CounterStat[]>()
  const synergies = new Map<number, SynergyStat[]>()

  if (hasTierData && lane) {
    if (state.enemyPicks.length > 0) {
      await mapWithConcurrency(candidateIds, FETCH_CONCURRENCY, async id => {
        await fetchCounters(data, lane, id)
      })
      if (gen !== generation) return
    }
    if (state.allyPicks.length > 0) {
      await mapWithConcurrency(candidateIds, FETCH_CONCURRENCY, async id => {
        await fetchSynergies(data, lane, id)
      })
      if (gen !== generation) return
    }
  }

  for (const id of candidateIds) {
    if (lane) {
      const cachedCounters = data.counters.get(`${lane}:${id}`)
      if (cachedCounters) counters.set(id, cachedCounters)
      const cachedSynergies = data.synergies.get(`${lane}:${id}`)
      if (cachedSynergies) synergies.set(id, cachedSynergies)
    }
  }

  const scores = scoreAllChampions(
    state,
    counters,
    synergies,
    tierMap,
    getDamageTypeMap(candidateIds),
    dataSource,
  )

  onScoresUpdated?.(scores, dataSource, position, data.tierList?.date ?? '')
}, 500)

function clearUi() {
  sessionData = null
  generation++
  onClearRecommendation?.()
}

export function startRecommendation() {
  unsubSession = lcu.observe(LcuEventUri.CHAMP_SELECT_SESSION, (message: LCUEventMessage) => {
    if (message.eventType === 'Delete' || !message.data) {
      clearUi()
      return
    }
    const session = message.data as ChampSelectSession
    if (!session.myTeam || !session.theirTeam || !session.timer) return
    computeRecommendation(session)
  })

  unsubPhase = lcu.observe(LcuEventUri.GAMEFLOW_PHASE_CHANGE, (message: LCUEventMessage) => {
    if (message.data !== 'ChampSelect') {
      clearUi()
    }
  })

  // 插件可能在选人中途加载：主动拉一次当前会话
  void lcu
    .getChampSelectSession()
    .then(session => {
      if (session?.myTeam && session?.timer) computeRecommendation(session)
    })
    .catch(() => {})
}

export function stopRecommendation() {
  unsubSession?.()
  unsubSession = null
  unsubPhase?.()
  unsubPhase = null
  clearUi()
}
```

注意：`Qq101Lane` 与 `InternalPosition` 均已在上方 import 中，`fetchCounters`/`fetchSynergies` 与回调签名都会用到。

- [ ] **Step 2: 改 RecommendationPanel.tsx**

替换头部与数据查询部分（整体文件）：

```tsx
// src/components/RecommendationPanel.tsx

import { createPortal } from 'react-dom'
import type { ChampionScore, DataSource } from '@/lib/scorer'
import { getChampionName, getDamageType, getChampionPositions } from '@/lib/champion-data'
import { POSITION_LABELS, type InternalPosition } from '@/lib/positions'

interface PanelProps {
  scores: ChampionScore[]
  assignedPosition: InternalPosition | ''
  dataSource: DataSource
  dataDate: string
  visible: boolean
  onClose: () => void
}

export function RecommendationPanel({ scores, assignedPosition, dataSource, dataDate, visible, onClose }: PanelProps) {
  if (!visible) return null

  const grouped = groupByPosition(scores, assignedPosition)

  return createPortal(
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
          Lux 推荐
          {dataSource === 'local'
            ? <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>(本地数据)</span>
            : dataDate ? <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>数据 {dataDate}</span> : null}
        </h3>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#888',
          cursor: 'pointer', fontSize: '18px',
        }}>x</button>
      </div>

      <Section title="推荐位">
        {grouped.recommended.slice(0, 3).map(s => (
          <ChampionRow key={s.championId} score={s} />
        ))}
      </Section>

      <Section title="各位置速览">
        {Object.entries(grouped.byPosition).map(([pos, champs]) => {
          const top = champs[0]
          if (!top) return null
          return (
            <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: '#888', minWidth: '32px', fontSize: '12px' }}>
                {POSITION_LABELS[pos] ?? pos}
              </span>
              <ChampionRow score={top} compact />
            </div>
          )
        })}
      </Section>

      <Section title="阵容分析">
        <CompositionAnalysis scores={scores} />
      </Section>
    </div>,
    document.body,
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
  const name = getChampionName(score.championId)

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
          {'协'}{score.synergy} | {'克'}{score.counter} | {'强'}{score.meta}
        </span>
      )}
    </div>
  )
}

function CompositionAnalysis({ scores }: { scores: ChampionScore[] }) {
  const top5 = scores.slice(0, 5)
  const apChamps = top5.filter(s => getDamageType(s.championId) === 'ap').length
  const adCount = top5.filter(s => {
    const type = getDamageType(s.championId)
    return type === 'ad' || type === 'mixed'
  }).length

  return (
    <div style={{ fontSize: '11px', color: '#888', lineHeight: 1.6 }}>
      <div>Top 5 推荐中: AP {apChamps} | AD {adCount}</div>
      {apChamps === 0 ? <div style={{ color: '#f38ba8' }}> 无 AP 选择，阵容可能缺法伤</div> : null}
      {adCount === 0 ? <div style={{ color: '#f38ba8' }}> 无 AD 选择，阵容可能缺物伤</div> : null}
    </div>
  )
}

function groupByPosition(scores: ChampionScore[], assigned: InternalPosition | '') {
  const byPosition: Record<string, ChampionScore[]> = {}
  for (const s of scores) {
    for (const pos of getChampionPositions(s.championId)) {
      if (!byPosition[pos]) byPosition[pos] = []
      byPosition[pos].push(s)
    }
  }

  const recommended = assigned && byPosition[assigned] ? byPosition[assigned] : scores
  return { recommended, byPosition }
}
```

- [ ] **Step 3: 改 ChampionBadgeOverlay.tsx**

`createBadgeElement` / `tryInjectBadges` / `tryHighlightChampion` 的 `useOpgg: boolean` 全部改为 `dataSource: DataSource`（`import type { ChampionScore, DataSource } from '@/lib/scorer'`），并把：

```ts
  if (!useOpgg) {
    badge.style.background = '#888'
  }
```

改为：

```ts
  if (dataSource === 'local') {
    badge.style.background = '#888'
  }
```

title 末行：

```ts
    dataSource === 'qq101' ? '(国服数据)' : '(本地数据)',
```

- [ ] **Step 4: 改 index.tsx**

新增 import：

```ts
import type { ChampionScore, DataSource } from '@/lib/scorer'
import type { InternalPosition } from '@/lib/positions'
```

`updatePanelRender` 完整替换：

```ts
function updatePanelRender(
  scores: ChampionScore[],
  dataSource: DataSource,
  position: InternalPosition | '',
  dataDate: string,
  visible: boolean,
) {
  if (!panelRoot || !panelContainer) return

  panelRoot.render(
    createElement(RecommendationPanel, {
      scores,
      assignedPosition: position,
      dataSource,
      dataDate,
      visible,
      onClose: () => updatePanelRender(scores, dataSource, position, dataDate, false),
    }),
  )
}
```

`updateInjections(scores, dataSource)`、`tryInjectBadges(scores, dataSource)`、`tryHighlightChampion(score, dataSource)` 同步改名（函数签名里的 `useOpgg: boolean` → `dataSource: DataSource`）。

`load()` 中的两个回调：

```ts
  setOnScoresUpdated((scores, dataSource, position, dataDate) => {
    updateInjections(scores, dataSource)
    updatePanelRender(scores, dataSource, position, dataDate, scores.length > 0)
  })

  setOnClearRecommendation(() => {
    if (badgeInjectTask) injector.unregister(badgeInjectTask)
    highlightTasks.forEach(t => injector.unregister(t))
    highlightTasks = []
    updatePanelRender([], 'local', '', '', false)
  })
```

- [ ] **Step 5: 构建 + 全量测试**

Run: `npm run build && npx vitest run`
Expected: tsc 无错、vite build 成功、测试全绿

- [ ] **Step 6: Commit**

```bash
git add src/lib/features/champion-recommendation.ts src/components/RecommendationPanel.tsx src/components/ChampionBadgeOverlay.tsx src/index.tsx
git commit -m "feat: rewrite recommendation orchestration with QQ101 data and live recompute"
```

---

### Task 9: 清理旧数据源 + 终验

**Files:**
- Delete: `src/lib/opgg-api.ts`、`src/data/champion-meta.json`、`scripts/import-champion-meta.ts`
- Modify: `src/types/champion.ts`（删旧 `ChampionMeta`）

- [ ] **Step 1: 确认无引用**

Run: `grep -rn "opgg-api\|championMetaRaw\|champion-meta\|ChampionMeta\b" src/ scripts/ | grep -v champion-data`
Expected: 无输出（champion-data 不引用旧类型）

- [ ] **Step 2: 删除旧文件与旧接口**

```bash
git rm src/lib/opgg-api.ts src/data/champion-meta.json scripts/import-champion-meta.ts
```

`src/types/champion.ts` 删除 `ChampionMeta` 接口，只留：

```ts
// src/types/champion.ts

export type DamageType = 'ap' | 'ad' | 'mixed'

export interface ChampionMetaEntry {
  name: string
  alias: string
}
```

- [ ] **Step 3: 终验**

Run: `npm run build && npx vitest run`
Expected: 全部通过

- [ ] **Step 4: Commit**

```bash
git add src/types/champion.ts
git commit -m "chore: remove legacy OP.GG client and static champion meta"
```

（`git rm` 的删除已在暂存区，`git commit` 会一并提交。）

---

### Task 10: 游戏内验收（用户执行）

- [ ] **Step 1: 启动 dev 模式**

```bash
npm run dev
```

（vite 会把 dev 入口写入 Pengu 插件目录，重启客户端或重载插件）

- [ ] **Step 2: 验收清单**

1. 进入一局排位（或匹配）选人阶段 → 右侧出现「Lux 推荐」面板，标题处显示 `数据 20261007` 样式的日期；英雄名为中文，且分数不是全 50。
2. 敌方陆续选人 → 分数与排序发生变化（同会话重算）。
3. 点击英雄网格 → 角标数字出现，hover 显示维度分解，末行是「(国服数据)」。
4. 选人结束离开 BP → 角标与面板清空。
5. 断网或 QQ101 不可达 → 面板标题显示「(本地数据)」，不报错、不影响客户端。
6. 大乱斗等非 SR 队列 → 不出现面板。

- [ ] **Step 3: 记录问题**

如验收中发现异常，记录：当前队列/位置、控制台日志（含 `[Lux]` 前缀）、面板截图。据此开修复任务。

---

## 已知限制（写入最终交付说明）

- QQ101 对位/协同每个英雄只覆盖最强/最弱各 5 个 / 前 3 个，未覆盖组合按中性 50。
- 匹配盲选/无分配位置时对位、协同不可用（`lane=ALL` 上游返回空），仅 tier + 平衡分。
- 匹配模式使用排位数据近似。
- `/lol-perks/v1/recommended-champion-positions` 未接入（位置表来自 tier 榜）。
