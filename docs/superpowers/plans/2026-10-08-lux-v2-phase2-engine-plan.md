# Lux v2 Phase 2（符文/技能摄入 + 推荐引擎）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Phase 1 数据层之上交付「摄入扩展 + 推荐引擎」：符文/召唤师技能/大乱斗数据的抓取与解析入库，纯函数推荐引擎（排位/征召/盲选/大乱斗评分 + 一句理由 + 大乱斗换留判定 + 内置大乱斗规则表），并以 CLI 冒烟产物收尾。

**Architecture:** 全部为纯 TS 模块（`shared/` 沿用 Phase 1 结构），无 Electron/LCU/UI。摄入侧复用 Phase 1 的 `qq101` 客户端/同步器/数据仓并按同样的 TDD 模式扩展（新增 3 类数据：符文页、召唤师技能组合、大乱斗英雄总览）；引擎侧为纯函数管线 `上下文 → 候选池 → 评分 → 排序 → 理由`，通过 `EngineData` 接口与数据仓解耦（测试用内存假数据，CLI 用真实 `./data`）。英雄元数据（标签/难度/伤害类型）以接口注入——Phase 2 用演示用小型字典，Phase 3 接 LCU 资源接口替换。

**Tech Stack:** TypeScript(ESM) + vitest + tsx（无新增依赖）

**关键约束（继承 Phase 1）：** 一切真实网络请求只允许在允许窗口执行（周一至周五 12:00–14:00、18:00 后，或任意周末）；执行联网步骤前先 `date '+%Y-%m-%d %H:%M %A'` 核对。前次全量同步曾触发腾讯 WAF 限流（HTTP 501，冷却时长未知），联网步骤要克制：先单发一次探活，被拦就停止本轮网络操作、等下个窗口。

**范围说明（用户已确认）：**
- 本计划不含 LCU 集成、Electron/UI、打包（Phase 3 另写计划）。
- 技能加点（`lol_101strategy_skill_point`）侦察已完成但**本阶段不摄入**（v1 面板不展示加点，YAGNI）。
- 大乱斗天赋/召唤师技能 = **内置规则表**（101 无按英雄的大乱斗符文/技能端点，已侦察确认）；规则表内的符文 id 来自「采集代表英雄的 101 符文页」（Task 6 有联网步骤），不从记忆手写。

**侦察结论引用（字段语义权威文档 = `shared/qq101/recon-notes.md`）：**
- 符文：`lol_101strategy_runeinfo?itier=255&version_id=&lane=&championid=` → `rune_top_details`：`#` 记录、`_` 字段 `序号_基石id_副系code_9符文id(csv)_选取率%_胜率%_场次`；响应内乱序，按序号排序。
- 技能：`lol_101strategy_skill` → `data_details`：`#` 记录 `技能1id_技能2id_胜率%_登场率%`；闪现=4、传送=12、点燃=14；按登场率降序。
- 大乱斗：`aram_hero_overview?dtstatdate=YYYYMMDD`（取前一天）→ `listcollect`：`#` 记录、`_` 字段 `英雄id_排名_名次变化_胜率(0-1)_出场率(0-1)_搭档列表_平均死亡秒_参团率(0-1)_伤害占比(0-1)_承伤占比(0-1)`；搭档列表 `champId,选取(0-1),胜率(0-1),rank&…`。注意：大乱斗的比率是 0-1 小数，不能当百分比再除 100。

---

### Task 1: qq101 解析扩展（符文页 / 技能组合 / 大乱斗总览）

**Files:**
- Modify: `shared/qq101/types.ts`
- Modify: `shared/qq101/parse.ts`
- Test: `shared/qq101/parse.test.ts`

- [ ] **Step 1: 追加类型到 `shared/qq101/types.ts` 末尾**

```ts
export interface Qq101RunePage {
  /** 榜单序号（1 = 使用最多） */
  rank: number
  keystoneId: number
  /** 副系 code：jm=精密 zj/zz=主宰 ws=巫术 jj=坚决 qd=启迪 */
  subStyleCode: string
  /** 9 个符文 id：主系 4 + 副系 2 + 属性碎片 3 */
  runeIds: number[]
  pickRate: number | null
  winRate: number | null
  games: number | null
}

export interface Qq101SpellCombo {
  spellIds: [number, number]
  winRate: number | null
  pickRate: number | null
}

export interface Qq101AramPartner {
  championId: number
  pickRate: number | null
  winRate: number | null
  rank: number | null
}

export interface Qq101AramHero {
  championId: number
  rank: number | null
  rankChange: string
  winRate: number | null
  pickRate: number | null
  bestPartners: Qq101AramPartner[]
  avgDeathTime: number | null
  avgParticipation: number | null
  avgDamageRatio: number | null
  avgTankRatio: number | null
}
```

- [ ] **Step 2: 追加失败测试到 `shared/qq101/parse.test.ts`**

把顶部 import 改为：

```ts
import {
  extractQq101Inner,
  parseQq101Versions,
  parseQq101TierList,
  parseQq101Matchups,
  parseQq101Synergies,
  parseQq101RunePages,
  parseQq101SpellCombos,
  parseQq101AramOverview,
} from './parse'
import versionlistFixture from './fixtures/versionlist.json'
import tierlistFixture from './fixtures/tierlist-all.json'
import confrontFixture from './fixtures/confront-84-middle.json'
import partnerFixture from './fixtures/partner-84-middle.json'
import runeinfoFixture from './fixtures/recon-runeinfo-84-mid-20261008.json'
import skillFixture from './fixtures/recon-skill-84-mid-20261008.json'
import aramFixture from './fixtures/recon-aram-hero-overview-20261008.json'
```

在文件末尾追加：

```ts
describe('parseQq101RunePages', () => {
  it('解析符文页并按序号排序（fixture 响应内乱序）', () => {
    const pages = parseQq101RunePages(runeinfoFixture)
    expect(pages).toHaveLength(12)
    const top = pages[0]
    expect(top.rank).toBe(1)
    expect(top.keystoneId).toBe(8112)
    expect(top.subStyleCode).toBe('jj')
    expect(top.runeIds).toEqual([8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001])
    expect(top.pickRate).toBeCloseTo(0.4415, 4)
    expect(top.winRate).toBeCloseTo(0.4782, 4)
    expect(top.games).toBe(154640)
    const ranks = pages.map(p => p.rank)
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it('畸形输入返回空数组', () => {
    expect(parseQq101RunePages({ code: 1 })).toEqual([])
    expect(parseQq101RunePages({ code: 0, data: { result: 'not json' } })).toEqual([])
  })
})

describe('parseQq101SpellCombos', () => {
  it('解析技能组合并按登场率降序（fixture：点燃+闪现 90.6% 应在前）', () => {
    const combos = parseQq101SpellCombos(skillFixture)
    expect(combos).toHaveLength(2)
    expect(combos[0].spellIds).toEqual([14, 4])
    expect(combos[0].winRate).toBeCloseTo(0.4877, 4)
    expect(combos[0].pickRate).toBeCloseTo(0.906, 4)
    expect(combos[1].spellIds).toEqual([12, 4])
  })

  it('畸形输入返回空数组', () => {
    expect(parseQq101SpellCombos({ code: 1 })).toEqual([])
  })
})

describe('parseQq101AramOverview', () => {
  it('解析大乱斗英雄总览（fixture 173 条，首条为排名第 1）', () => {
    const heroes = parseQq101AramOverview(aramFixture)
    expect(heroes).toHaveLength(173)
    const first = heroes[0]
    expect(first.championId).toBe(22)
    expect(first.rank).toBe(1)
    expect(first.rankChange).toBe('未变化')
    expect(first.winRate).toBeCloseTo(0.5456, 4)
    expect(first.pickRate).toBeCloseTo(0.1539, 4)
    expect(first.bestPartners.length).toBeGreaterThan(10)
    expect(first.bestPartners[0]).toEqual({ championId: 25, pickRate: 0.0616, winRate: 0.5897, rank: 1 })
    expect(first.avgDeathTime).toBeCloseTo(233.001, 3)
    expect(first.avgParticipation).toBeCloseTo(0.6663, 4)
    expect(first.avgDamageRatio).toBeCloseTo(0.2108, 4)
    expect(first.avgTankRatio).toBeCloseTo(0.1654, 4)
  })

  it('畸形输入返回空数组', () => {
    expect(parseQq101AramOverview({ code: 1 })).toEqual([])
  })
})
```

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run shared/qq101/parse.test.ts`
Expected: FAIL（`parseQq101RunePages is not a function`）

- [ ] **Step 4: 实现三个解析函数（`shared/qq101/parse.ts`）**

顶部 import 的类型改为：

```ts
import type {
  Qq101AramHero,
  Qq101Matchup,
  Qq101RunePage,
  Qq101SpellCombo,
  Qq101Synergy,
  Qq101TierList,
} from './types'
```

文件末尾追加：

```ts
export function parseQq101RunePages(response: unknown): Qq101RunePage[] {
  const payload = parseInner<{ rune_top_details?: string }>(response)
  if (!payload) return []

  const pages = splitRecords(payload.rune_top_details).flatMap(record => {
    const fields = record.split('_')
    if (fields.length < 7) return []
    const rank = toNumber(fields[0])
    const keystoneId = toNumber(fields[1])
    if (rank === null || keystoneId === null) return []
    return [{
      rank,
      keystoneId,
      subStyleCode: (fields[2] ?? '').toLowerCase(),
      runeIds: (fields[3] ?? '')
        .split(',')
        .map(id => toNumber(id))
        .filter((id): id is number => id !== null),
      pickRate: percentToRatio(fields[4]),
      winRate: percentToRatio(fields[5]),
      games: toNumber(fields[6]),
    }]
  })

  return pages.sort((a, b) => a.rank - b.rank)
}

export function parseQq101SpellCombos(response: unknown): Qq101SpellCombo[] {
  const payload = parseInner<{ data_details?: string }>(response)
  if (!payload) return []

  const combos = splitRecords(payload.data_details).flatMap(record => {
    const fields = record.split('_')
    if (fields.length < 4) return []
    const a = toNumber(fields[0])
    const b = toNumber(fields[1])
    if (a === null || b === null) return []
    return [{
      spellIds: [a, b] as [number, number],
      winRate: percentToRatio(fields[2]),
      pickRate: percentToRatio(fields[3]),
    }]
  })

  return combos.sort((a, b) => (b.pickRate ?? 0) - (a.pickRate ?? 0))
}

export function parseQq101AramOverview(response: unknown): Qq101AramHero[] {
  const payload = parseInner<{ listcollect?: string }>(response)
  if (!payload) return []

  return (payload.listcollect ?? '')
    .split(/[#|]/)
    .filter(Boolean)
    .flatMap(record => {
      const fields = record.split('_')
      const championId = toNumber(fields[0])
      if (championId === null) return []
      const bestPartners = (fields[5] ?? '').split('&').flatMap(entry => {
        if (!entry) return []
        const p = entry.split(',')
        const partnerId = toNumber(p[0])
        if (partnerId === null) return []
        return [{
          championId: partnerId,
          pickRate: toNumber(p[1]),
          winRate: toNumber(p[2]),
          rank: toNumber(p[3]),
        }]
      })
      return [{
        championId,
        rank: toNumber(fields[1]),
        rankChange: fields[2] ?? '',
        winRate: toNumber(fields[3]),
        pickRate: toNumber(fields[4]),
        bestPartners,
        avgDeathTime: toNumber(fields[6]),
        avgParticipation: toNumber(fields[7]),
        avgDamageRatio: toNumber(fields[8]),
        avgTankRatio: toNumber(fields[9]),
      }]
    })
}
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run shared/qq101/parse.test.ts`
Expected: PASS（18 条）

Run: `npm run typecheck`
Expected: 0 错误。

- [ ] **Step 6: 提交**

```bash
git add shared/qq101/types.ts shared/qq101/parse.ts shared/qq101/parse.test.ts
git commit -m "feat: parse qq101 rune pages, spell combos and aram overview"
```

---

### Task 2: 端点与客户端扩展

**Files:**
- Modify: `shared/qq101/endpoints.ts`
- Modify: `shared/qq101/client.ts`
- Test: `shared/qq101/client.test.ts`

- [ ] **Step 1: 追加失败测试（`shared/qq101/client.test.ts`）**

顶部 import 改为：

```ts
import { describe, expect, it, vi } from 'vitest'
import { ApiTimeBlockedError, createQq101Client } from './client'
import { aramDateString } from './endpoints'
import tierlistFixture from './fixtures/tierlist-all.json'
import confrontFixture from './fixtures/confront-84-middle.json'
import partnerFixture from './fixtures/partner-84-middle.json'
import versionlistFixture from './fixtures/versionlist.json'
import runeinfoFixture from './fixtures/recon-runeinfo-84-mid-20261008.json'
import skillFixture from './fixtures/recon-skill-84-mid-20261008.json'
import aramFixture from './fixtures/recon-aram-hero-overview-20261008.json'
```

文件末尾追加：

```ts
describe('extended endpoints', () => {
  it('getRunePages 请求 runeinfo 路径与 championid', async () => {
    const calls: string[] = []
    const client = createQq101Client({ fetchImpl: okFetch(runeinfoFixture, calls) })
    const pages = await client.getRunePages('16.19', 'MIDDLE', 84)
    expect(pages![0].keystoneId).toBe(8112)
    expect(calls[0]).toContain('lol_101strategy_runeinfo')
    expect(calls[0]).toContain('championid=84')
    expect(calls[0]).toContain('lane=MIDDLE')
  })

  it('getSpellCombos 请求 skill 路径', async () => {
    const calls: string[] = []
    const client = createQq101Client({ fetchImpl: okFetch(skillFixture, calls) })
    const combos = await client.getSpellCombos('16.19', 'MIDDLE', 84)
    expect(combos![0].pickRate).toBeCloseTo(0.906, 4)
    expect(calls[0]).toContain('lol_101strategy_skill?')
  })

  it('getAramOverview 请求 dtstatdate 参数', async () => {
    const calls: string[] = []
    const client = createQq101Client({ fetchImpl: okFetch(aramFixture, calls) })
    const heroes = await client.getAramOverview('20261007')
    expect(heroes).toHaveLength(173)
    expect(calls[0]).toContain('aram_hero_overview')
    expect(calls[0]).toContain('dtstatdate=20261007')
  })
})

describe('aramDateString', () => {
  it('返回前一天的 YYYYMMDD（含跨月）', () => {
    expect(aramDateString(new Date(2026, 9, 8))).toBe('20261007')
    expect(aramDateString(new Date(2026, 10, 1))).toBe('20261031')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/qq101/client.test.ts`
Expected: FAIL（`getRunePages` 不存在 / `aramDateString` 不存在）

- [ ] **Step 3: 追加端点（`shared/qq101/endpoints.ts` 末尾）**

```ts
export const ARAM_OVERVIEW_PATH = '/go/battle_info/odp_proxy/aram_hero_overview'

export function aramOverviewUrl(dtstatdate: string): string {
  const params = new URLSearchParams({ dtstatdate })
  return `${QQ101_ORIGIN}${ARAM_OVERVIEW_PATH}?${params.toString()}`
}

/** 大乱斗榜单取「前一天」的日期串（YYYYMMDD，本地时区） */
export function aramDateString(now: Date): string {
  const d = new Date(now)
  d.setDate(d.getDate() - 1)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}${m}${day}`
}
```

- [ ] **Step 4: 扩展客户端（`shared/qq101/client.ts`）**

import 改为：

```ts
import { isApiAllowed } from '../timegate'
import type { Qq101Lane } from '../positions'
import { aramOverviewUrl, RIFT_PATH, riftUrl, versionsUrl } from './endpoints'
import {
  parseQq101AramOverview,
  parseQq101Matchups,
  parseQq101RunePages,
  parseQq101SpellCombos,
  parseQq101Synergies,
  parseQq101TierList,
  parseQq101Versions,
} from './parse'
import type {
  Qq101AramHero,
  Qq101Matchup,
  Qq101RunePage,
  Qq101SpellCombo,
  Qq101Synergy,
  Qq101TierList,
} from './types'
```

`Qq101Client` 接口追加：

```ts
  getRunePages(patch: string, lane: Qq101Lane, championId: number): Promise<Qq101RunePage[] | null>
  getSpellCombos(patch: string, lane: Qq101Lane, championId: number): Promise<Qq101SpellCombo[] | null>
  getAramOverview(dtstatdate: string): Promise<Qq101AramHero[] | null>
```

返回对象追加：

```ts
    getRunePages: (patch, lane, championId) =>
      request(riftUrl(`${RIFT_PATH}_runeinfo`, patch, lane, championId), parseQq101RunePages),
    getSpellCombos: (patch, lane, championId) =>
      request(riftUrl(`${RIFT_PATH}_skill`, patch, lane, championId), parseQq101SpellCombos),
    getAramOverview: dtstatdate =>
      request(aramOverviewUrl(dtstatdate), parseQq101AramOverview),
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run shared/qq101/client.test.ts`
Expected: PASS（10 条）

- [ ] **Step 6: 提交**

```bash
git add shared/qq101/endpoints.ts shared/qq101/client.ts shared/qq101/client.test.ts
git commit -m "feat: add runeinfo/spell/aram endpoints to qq101 client"
```

---

### Task 3: 数据仓扩展（符文 / 技能 / 大乱斗 + lane 键放宽）

**Files:**
- Modify: `shared/warehouse/store.ts`
- Test: `shared/warehouse/store.test.ts`

- [ ] **Step 1: 追加失败测试（`shared/warehouse/store.test.ts`）**

import 改为：

```ts
import type { Qq101AramHero, Qq101RunePage, Qq101SpellCombo, Qq101TierList } from '../qq101/types'
```

`describe('warehouse')` 内末尾追加：

```ts
  it('runes/spells 按 版本+位置+英雄 存取', () => {
    const wh = createWarehouse(root)
    const runes: Qq101RunePage[] = [{
      rank: 1, keystoneId: 8112, subStyleCode: 'jj', runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
      pickRate: 0.4415, winRate: 0.4782, games: 154640,
    }]
    const spells: Qq101SpellCombo[] = [{ spellIds: [14, 4], winRate: 0.4877, pickRate: 0.906 }]
    wh.saveRunes('16.19', 'MIDDLE', 84, runes)
    wh.saveSpells('16.19', 'MIDDLE', 84, spells)
    expect(wh.hasRunes('16.19', 'MIDDLE', 84)).toBe(true)
    expect(wh.loadRunes('16.19', 'MIDDLE', 84)).toEqual(runes)
    expect(wh.loadSpells('16.19', 'MIDDLE', 84)).toEqual(spells)
    expect(wh.hasSpells('16.19', 'TOP', 84)).toBe(false)
  })

  it('tier 支持 ALL 键（盲选/规则模式用）', () => {
    const wh = createWarehouse(root)
    wh.saveTier('16.19', 'ALL', sampleTier)
    expect(wh.hasTier('16.19', 'ALL')).toBe(true)
    expect(wh.loadTier('16.19', 'ALL')).toEqual(sampleTier)
  })

  it('大乱斗总览按数据日期存取，manifest 记录 aramDate', () => {
    const wh = createWarehouse(root)
    const heroes: Qq101AramHero[] = [{
      championId: 22, rank: 1, rankChange: '未变化', winRate: 0.5456, pickRate: 0.1539,
      bestPartners: [], avgDeathTime: 233.001, avgParticipation: 0.6663, avgDamageRatio: 0.2108, avgTankRatio: 0.1654,
    }]
    expect(wh.hasAram('20261007')).toBe(false)
    wh.saveAram('20261007', heroes)
    expect(wh.hasAram('20261007')).toBe(true)
    expect(wh.loadAram('20261007')).toEqual(heroes)

    const m: WarehouseManifest = { patch: '16.19', dataDate: '20261007', updatedAt: '2026-10-08T12:00:00.000Z', aramDate: '20261007' }
    wh.writeManifest(m)
    expect(wh.readManifest()).toEqual(m)
  })
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/warehouse/store.test.ts`
Expected: FAIL（`wh.saveRunes is not a function`）

- [ ] **Step 3: 实现（`shared/warehouse/store.ts`）**

1. import 类型改为：

```ts
import type { Qq101AramHero, Qq101Matchup, Qq101RunePage, Qq101SpellCombo, Qq101Synergy, Qq101TierList } from '../qq101/types'

export type LaneKey = Qq101Lane | 'ALL'
```

2. `WarehouseManifest` 追加：

```ts
  /** 大乱斗总览的数据日期（YYYYMMDD），未同步过则缺省 */
  aramDate?: string
```

3. `Warehouse` 接口中 tier 相关签名改用 `LaneKey` 并追加新方法：

```ts
  hasTier(patch: string, lane: LaneKey): boolean
  loadTier(patch: string, lane: LaneKey): Qq101TierList | null
  saveTier(patch: string, lane: LaneKey, data: Qq101TierList): void
```

```ts
  hasRunes(patch: string, lane: Qq101Lane, championId: number): boolean
  loadRunes(patch: string, lane: Qq101Lane, championId: number): Qq101RunePage[] | null
  saveRunes(patch: string, lane: Qq101Lane, championId: number, rows: Qq101RunePage[]): void
  hasSpells(patch: string, lane: Qq101Lane, championId: number): boolean
  loadSpells(patch: string, lane: Qq101Lane, championId: number): Qq101SpellCombo[] | null
  saveSpells(patch: string, lane: Qq101Lane, championId: number, rows: Qq101SpellCombo[]): void
  hasAram(date: string): boolean
  loadAram(date: string): Qq101AramHero[] | null
  saveAram(date: string, rows: Qq101AramHero[]): void
```

4. `createWarehouse` 内部路径函数：`tierFile` 参数类型改为 `LaneKey`；新增：

```ts
  const runesFile = (patch: string, lane: Qq101Lane, id: number) => join(patchDir(patch), `runes-${lane}-${id}.json`)
  const spellsFile = (patch: string, lane: Qq101Lane, id: number) => join(patchDir(patch), `spells-${lane}-${id}.json`)
  const aramFile = (date: string) => join(base, `aram-${date}.json`)
```

5. 返回对象追加：

```ts
    hasRunes: (patch, lane, id) => existsSync(runesFile(patch, lane, id)),
    loadRunes: (patch, lane, id) => readJson<Qq101RunePage[]>(runesFile(patch, lane, id)),
    saveRunes: (patch, lane, id, rows) => writeJsonAtomic(runesFile(patch, lane, id), rows),
    hasSpells: (patch, lane, id) => existsSync(spellsFile(patch, lane, id)),
    loadSpells: (patch, lane, id) => readJson<Qq101SpellCombo[]>(spellsFile(patch, lane, id)),
    saveSpells: (patch, lane, id, rows) => writeJsonAtomic(spellsFile(patch, lane, id), rows),
    hasAram: date => existsSync(aramFile(date)),
    loadAram: date => readJson<Qq101AramHero[]>(aramFile(date)),
    saveAram: (date, rows) => writeJsonAtomic(aramFile(date), rows),
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/warehouse/store.test.ts`
Expected: PASS（7 条）

Run: `npm run test`
Expected: 全量 PASS（其它文件不受影响）。

- [ ] **Step 5: 提交**

```bash
git add shared/warehouse/store.ts shared/warehouse/store.test.ts
git commit -m "feat: extend warehouse with runes, spells, aram overview and ALL lane key"
```

---

### Task 4: 同步器扩展（ALL 榜单 + 符文/技能逐英雄 + 大乱斗总览）

**Files:**
- Modify: `shared/qq101/sync.ts`
- Test: `shared/qq101/sync.test.ts`

- [ ] **Step 1: 扩展测试（`shared/qq101/sync.test.ts`）**

1. import 改为：

```ts
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { ApiTimeBlockedError, type Qq101Client } from './client'
import { syncRiftData } from './sync'
import type { Qq101AramHero, Qq101Matchup, Qq101RunePage, Qq101SpellCombo, Qq101Synergy, Qq101TierList } from './types'
import { createWarehouse, type Warehouse } from '../warehouse/store'
import type { Qq101Lane } from '../positions'
```

2. `FakeCall` 与 fake client 扩展：

```ts
interface FakeCall {
  kind: 'tier' | 'matchups' | 'synergies' | 'runes' | 'spells' | 'aram'
  lane: Qq101Lane | 'ALL' | null
  championId?: number
}
```

`createFakeClient` 的 getTierList 不变（lane 参数原样 push）；追加方法：

```ts
    async getRunePages(_patch, lane, championId): Promise<Qq101RunePage[] | null> {
      if (remaining-- <= 0) throw new ApiTimeBlockedError(new Date())
      calls.push({ kind: 'runes', lane, championId })
      if (opts.failPairs || opts.failChampions?.includes(championId)) return null
      return [{ rank: 1, keystoneId: 8112, subStyleCode: 'jj', runeIds: [8112], pickRate: 0.4, winRate: 0.5, games: 100 }]
    },
    async getSpellCombos(_patch, lane, championId): Promise<Qq101SpellCombo[] | null> {
      if (remaining-- <= 0) throw new ApiTimeBlockedError(new Date())
      calls.push({ kind: 'spells', lane, championId })
      if (opts.failPairs || opts.failChampions?.includes(championId)) return null
      return [{ spellIds: [4, 14], winRate: 0.48, pickRate: 0.9 }]
    },
    async getAramOverview(_dtstatdate): Promise<Qq101AramHero[] | null> {
      calls.push({ kind: 'aram', lane: null })
      if (opts.failPairs) return null
      return [{
        championId: 22, rank: 1, rankChange: '未变化', winRate: 0.5456, pickRate: 0.1539,
        bestPartners: [], avgDeathTime: 233, avgParticipation: 0.66, avgDamageRatio: 0.21, avgTankRatio: 0.16,
      }]
    },
```

3. 既有用例适配：

- 「首次同步」：`calls.filter(c => c.kind === 'tier')` 期望改为 `toHaveLength(2)`（ALL + MIDDLE）；并追加：

```ts
    expect(calls.filter(c => c.kind === 'runes')).toHaveLength(3)
    expect(calls.filter(c => c.kind === 'spells')).toHaveLength(3)
    expect(wh.hasTier('16.19', 'ALL')).toBe(true)
    expect(wh.hasRunes('16.19', 'MIDDLE', 84)).toBe(true)
    expect(wh.hasSpells('16.19', 'MIDDLE', 711)).toBe(true)
    expect(result.runes).toMatchObject({ fetched: 3, failed: 0 })
    expect(result.spells).toMatchObject({ fetched: 3, failed: 0 })
```

- 「二次同步」：`second.calls.filter(c => c.kind !== 'tier')` 改为：

```ts
    expect(second.calls.filter(c => c.kind !== 'tier' && c.kind !== 'aram')).toHaveLength(0)
```

- 「对位/协同只按各位置自己的榜单英雄取数」：`pairCalls` 改为：

```ts
    const pairCalls = calls.filter(c => c.kind === 'matchups' || c.kind === 'synergies')
```

- 「熔断」：`calls.filter(c => c.kind !== 'tier')` 改为：

```ts
    expect(calls.filter(c => c.kind !== 'tier' && c.kind !== 'aram')).toHaveLength(3)
```

（首轮 3 个 worker 各发出 1 个 matchups 后即熔断，符文/技能不再发出。）

4. 追加新用例：

```ts
  it('大乱斗总览单发一次并写 manifest.aramDate', async () => {
    const { client, calls } = createFakeClient()
    const result = await syncRiftData({
      client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'],
      now: () => new Date(2026, 9, 8, 13, 0),
    })
    expect(result.aram).toBe('synced')
    expect(calls.filter(c => c.kind === 'aram')).toHaveLength(1)
    expect(wh.hasAram('20261007')).toBe(true)
    expect(wh.readManifest()?.aramDate).toBe('20261007')
  })

  it('大乱斗总览已是最新日期则跳过', async () => {
    wh.writeManifest({ patch: '16.19', dataDate: '2026-10-08', updatedAt: 'x', aramDate: '20261007' })
    wh.saveAram('20261007', [])
    const { client, calls } = createFakeClient()
    const result = await syncRiftData({
      client, warehouse: wh, isAllowed: () => true, lanes: ['MIDDLE'],
      now: () => new Date(2026, 9, 8, 13, 0),
    })
    expect(result.aram).toBe('skipped')
    expect(calls.filter(c => c.kind === 'aram')).toHaveLength(0)
  })
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/qq101/sync.test.ts`
Expected: FAIL（`result.runes` undefined / aram 相关断言失败）

- [ ] **Step 3: 实现（`shared/qq101/sync.ts`）**

1. import 追加：`import { aramDateString } from './endpoints'`。

2. `SyncResult` 追加字段，初始化对应：

```ts
  runes: { fetched: number; failed: number }
  spells: { fetched: number; failed: number }
  aram: 'synced' | 'skipped' | 'failed'
```

```ts
    runes: { fetched: 0, failed: 0 },
    spells: { fetched: 0, failed: 0 },
    aram: 'skipped',
```

3. 版本之后、lanes 循环之前，追加 ALL 榜单抓取：

```ts
  // 2a) ALL 梯度榜（盲选强度 / 规则模式候选池）
  try {
    const allTier = await client.getTierList(patch, 'ALL')
    if (allTier && allTier.champions.length > 0) {
      warehouse.saveTier(patch, 'ALL', allTier)
      if (!dataDate && allTier.date) dataDate = allTier.date
    } else {
      anythingFailed = true
    }
  } catch (error) {
    catchBlocked(error)
  }
  if (blocked) {
    result.status = 'blocked'
    result.blockedUntil = nextAllowedTime(now()).toISOString()
    return result
  }
```

（`dataDate`/`anythingFailed` 的声明需上移到版本步骤之后：把原 `const championIds = new Set...` 区块开头的 `let dataDate = ''` / `let anythingFailed = false` 提前到 ALL 抓取之前。）

4. job 类型与构造（同一批 (lane, champion) 上有四种可选抓取）：

```ts
  const jobs: Array<{
    lane: Qq101Lane
    championId: number
    needM: boolean
    needS: boolean
    needR: boolean
    needP: boolean
  }> = []
  for (const lane of lanes) {
    const laneChamps = (championsByLane.get(lane) ?? []).slice(0, limit ?? Number.MAX_SAFE_INTEGER)
    for (const championId of laneChamps) {
      const needM = !(samePatch && warehouse.hasMatchups(patch, lane, championId))
      const needS = !(samePatch && warehouse.hasSynergies(patch, lane, championId))
      const needR = !(samePatch && warehouse.hasRunes(patch, lane, championId))
      const needP = !(samePatch && warehouse.hasSpells(patch, lane, championId))
      if (needM || needS || needR || needP) jobs.push({ lane, championId, needM, needS, needR, needP })
    }
  }
```

5. worker 重写为「对位 → 协同 → 符文 → 技能」四段（每段前检查 `stopRequested()`，逻辑与现有对位/协同一致）：

```ts
  await runPool(jobs, concurrency, async job => {
    if (stopRequested()) return
    try {
      if (job.needM && !stopRequested()) {
        const rows = await client.getMatchups(patch!, job.lane, job.championId)
        if (rows && rows.length > 0) {
          warehouse.saveMatchups(patch!, job.lane, job.championId, rows)
          result.matchups.fetched++
          consecutiveFailures = 0
        } else {
          result.matchups.failed++
          noteFailure()
        }
      }
      if (job.needS && !stopRequested()) {
        const rows = await client.getSynergies(patch!, job.lane, job.championId)
        if (rows && rows.length > 0) {
          warehouse.saveSynergies(patch!, job.lane, job.championId, rows)
          result.synergies.fetched++
          consecutiveFailures = 0
        } else {
          result.synergies.failed++
          noteFailure()
        }
      }
      if (job.needR && !stopRequested()) {
        const rows = await client.getRunePages(patch!, job.lane, job.championId)
        if (rows && rows.length > 0) {
          warehouse.saveRunes(patch!, job.lane, job.championId, rows)
          result.runes.fetched++
          consecutiveFailures = 0
        } else {
          result.runes.failed++
          noteFailure()
        }
      }
      if (job.needP && !stopRequested()) {
        const rows = await client.getSpellCombos(patch!, job.lane, job.championId)
        if (rows && rows.length > 0) {
          warehouse.saveSpells(patch!, job.lane, job.championId, rows)
          result.spells.fetched++
          consecutiveFailures = 0
        } else {
          result.spells.failed++
          noteFailure()
        }
      }
    } catch (error) {
      catchBlocked(error)
      if (blocked) anythingFailed = true
    }
    done++
    options.onProgress?.(done, total)
  })
```

6. worker 池之后、`if (blocked)` 收尾之前，追加大乱斗总览（单发不参与熔断）：

```ts
  // 3.5) 大乱斗总览（单发，按日期跳过）
  let aramDateForManifest: string | undefined
  if (!blocked) {
    const aramDate = aramDateString(now())
    if (samePatch && manifest?.aramDate === aramDate && warehouse.hasAram(aramDate)) {
      result.aram = 'skipped'
    } else {
      try {
        const heroes = await client.getAramOverview(aramDate)
        if (heroes && heroes.length > 0) {
          warehouse.saveAram(aramDate, heroes)
          result.aram = 'synced'
          aramDateForManifest = aramDate
        } else {
          result.aram = 'failed'
          anythingFailed = true
        }
      } catch (error) {
        catchBlocked(error)
        if (blocked) {
          result.status = 'blocked'
          result.blockedUntil = nextAllowedTime(now()).toISOString()
          return result
        }
        result.aram = 'failed'
        anythingFailed = true
      }
    }
  }
```

（`let aramDateForManifest: string | undefined` 需在 `if (!blocked)` 之外声明以便下面 manifest 使用，如上。）

7. manifest 写入改为：

```ts
  // 4) 完成才写 manifest；无数据日期（上游异常/全空）不写，避免误报 up-to-date
  if (dataDate) {
    warehouse.writeManifest({
      patch,
      dataDate,
      updatedAt: now().toISOString(),
      aramDate: aramDateForManifest ?? manifest?.aramDate,
    })
  }
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/qq101/sync.test.ts`
Expected: PASS（10 条）

Run: `npm run test && npm run typecheck`
Expected: 全量 PASS、0 错误。

- [ ] **Step 5: 提交**

```bash
git add shared/qq101/sync.ts shared/qq101/sync.test.ts
git commit -m "feat: ingest all-tier list, runes, spells and aram overview in sync"
```

---

### Task 5: 英雄元数据（标签 / 伤害类型 / 难度）

**Files:**
- Create: `shared/champions/meta.ts`
- Test: `shared/champions/meta.test.ts`

- [ ] **Step 1: 写失败测试 `shared/champions/meta.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { createChampionIndex, isFrontline, type ChampionMeta } from './meta'

const SAMPLE: ChampionMeta[] = [
  { id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 },
  { id: 57, name: '茂凯', damageType: 'ap', roles: ['tank'], difficulty: 3 },
  { id: 99, name: '拉克丝', damageType: 'ap', roles: ['mage', 'support'], difficulty: 4 },
]

describe('createChampionIndex', () => {
  it('按 id 查询与遍历', () => {
    const index = createChampionIndex(SAMPLE)
    expect(index.get(57)?.name).toBe('茂凯')
    expect(index.get(9999)).toBeNull()
    expect(index.all().map(c => c.id)).toEqual([84, 57, 99])
  })
})

describe('isFrontline', () => {
  it('坦克与战士视为前排；空值返回 false', () => {
    expect(isFrontline(SAMPLE[1])).toBe(true)
    expect(isFrontline(SAMPLE[0])).toBe(false)
    expect(isFrontline({ id: 1, name: 'x', damageType: 'ad', roles: ['fighter'], difficulty: 5 })).toBe(true)
    expect(isFrontline(null)).toBe(false)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/champions/meta.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `shared/champions/meta.ts`**

```ts
// 英雄元数据：Phase 2 由调用方注入（演示字典 / 测试假数据）；
// Phase 3 接 LCU 资源接口后替换数据来源，接口不变。
export type ChampionRole = 'fighter' | 'tank' | 'mage' | 'assassin' | 'marksman' | 'support'

export type DamageType = 'ad' | 'ap' | 'mixed'

export interface ChampionMeta {
  id: number
  name: string
  damageType: DamageType
  roles: ChampionRole[]
  /** 官方难度 1-10（越高越难） */
  difficulty: number
}

export interface ChampionIndex {
  get(id: number): ChampionMeta | null
  all(): ChampionMeta[]
}

export function createChampionIndex(list: ChampionMeta[]): ChampionIndex {
  const byId = new Map(list.map(c => [c.id, c]))
  return {
    get: id => byId.get(id) ?? null,
    all: () => [...byId.values()],
  }
}

export function isFrontline(meta: ChampionMeta | null): boolean {
  if (!meta) return false
  return meta.roles.includes('tank') || meta.roles.includes('fighter')
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/champions/meta.test.ts`
Expected: PASS（2 条）

- [ ] **Step 5: 提交**

```bash
git add shared/champions/meta.ts shared/champions/meta.test.ts
git commit -m "feat: add champion metadata model (roles, damage type, difficulty)"
```

---

### Task 6: 大乱斗内置规则表（符文 id 来自真实采集）

**Files:**
- Create: `shared/qq101/fixtures/recon-rule-{tank-57,mage-112,marksman-81,support-117,fighter-122}-20261008.json`（采集产物）
- Create: `shared/champions/aram-rules.ts`
- Test: `shared/champions/aram-rules.test.ts`

- [ ] **Step 1: 采集代表英雄符文样本（仅允许时段）**

Run: `date '+%Y-%m-%d %H:%M %A'`
不在允许窗口 → 跳过 Step 1-2（本任务后续 Step 也无法完成真实值填充），先执行其他任务，等窗口回来做完本任务的 Step 1-4 再提交。

```bash
B='https://mlol.qt.qq.com/go/battle_info/odp_proxy/lol_101strategy_runeinfo'
for pair in "tank:57:TOP" "mage:112:MIDDLE" "marksman:81:BOTTOM" "support:117:SUPPORT" "fighter:122:TOP"; do
  role="${pair%%:*}"; rest="${pair#*:}"; champ="${rest%%:*}"; lane="${rest##*:}"
  curl -s --max-time 15 "$B?itier=255&version_id=16.19&lane=$lane&championid=$champ" -o "shared/qq101/fixtures/recon-rule-$role-$champ-20261008.json"
  sleep 1
done
head -c 100 shared/qq101/fixtures/recon-rule-*.json
```

Expected: 5 个文件，每个开头为 `{"code":0,...`。若出现 HTML（WAF 501 页）→ **停止本轮**，等下个允许窗口再试。

- [ ] **Step 2: 提取每个英雄的第 1 号符文页**

Run:

```bash
node -e '
const fs=require("fs");
for(const f of fs.readdirSync("shared/qq101/fixtures").filter(n=>n.startsWith("recon-rule-"))){
  const raw=JSON.parse(fs.readFileSync("shared/qq101/fixtures/"+f,"utf8"));
  const fv=raw.data._fieldValues; const inner=JSON.parse(fv[Object.keys(fv)[0]]);
  const recs=inner.rune_top_details.split("#").map(r=>r.split("_"));
  const top=recs.find(c=>Number(c[0])===1);
  console.log(f, "=> keystone", top[1], "| runes", top[3]);
}'
```

Expected: 5 行输出，各含基石 id 与 9 个符文 id。把这些值逐字抄进 Step 4 的规则表（刺客行用已有 fixture 的已知值：`8112 | 8112,8143,8140,8106,8444,8451,5008,5008,5001`）。

- [ ] **Step 3: 写失败测试 `shared/champions/aram-rules.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { aramRuleFor, ARAM_RULES } from './aram-rules'
import { createChampionIndex, type ChampionMeta } from './meta'

const META: ChampionMeta[] = [
  { id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 },
  { id: 57, name: '茂凯', damageType: 'ap', roles: ['tank'], difficulty: 3 },
  { id: 112, name: '维克托', damageType: 'ap', roles: ['mage'], difficulty: 5 },
  { id: 99, name: '拉克丝', damageType: 'ap', roles: ['mage', 'support'], difficulty: 4 },
  { id: 122, name: '德莱厄斯', damageType: 'ad', roles: ['fighter'], difficulty: 6 },
  { id: 81, name: '伊泽瑞尔', damageType: 'ad', roles: ['marksman'], difficulty: 5 },
]
const index = createChampionIndex(META)

describe('aramRuleFor', () => {
  it('按角色归组到对应规则', () => {
    expect(aramRuleFor(84, index).key).toBe('assassin')
    expect(aramRuleFor(57, index).key).toBe('tank')
    expect(aramRuleFor(112, index).key).toBe('mage')
    expect(aramRuleFor(81, index).key).toBe('marksman')
    expect(aramRuleFor(122, index).key).toBe('fighter')
  })

  it('辅助优先于法师（多角色取 support）', () => {
    expect(aramRuleFor(99, index).key).toBe('support')
  })

  it('未知英雄回退到 fighter 规则', () => {
    expect(aramRuleFor(9999, index).key).toBe('fighter')
  })

  it('每条规则的符文页与技能结构完整', () => {
    for (const rule of Object.values(ARAM_RULES)) {
      expect(rule.runeIds).toHaveLength(9)
      expect(rule.spellIds).toEqual([4, 32]) // 闪现 + 标记
      expect(rule.keystoneId).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 4: 实现 `shared/champions/aram-rules.ts`**

（把 `TODO-采集的基石id` / `TODO-采集的符文id串` 替换为 Step 2 输出的实际数字，格式同刺客行；**测试通过前不得提交**。）

```ts
// 大乱斗内置规则表：101 无按英雄的大乱斗符文/技能数据（2026-10-08 侦察确认），
// 这里按英雄定位给出「代表英雄的 101 峡谷符文页」（采集样本见 qq101/fixtures/recon-rule-*），
// 技能统一为 闪现(4) + 标记/冲刺(32)。全部为可调配置。
import type { ChampionIndex, ChampionRole } from './meta'

export type AramRuleKey = ChampionRole

export interface AramRule {
  key: AramRuleKey
  label: string
  /** 来源（哪个英雄的峡谷符文页） */
  sourceChampionId: number
  keystoneId: number
  runeIds: number[]
  spellIds: [number, number]
}

export const ARAM_RULES: Record<AramRuleKey, AramRule> = {
  assassin: {
    key: 'assassin', label: '刺客',
    sourceChampionId: 84, // 采集于 recon-runeinfo-84-mid-20261008.json 第 1 页
    keystoneId: 8112,
    runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
    spellIds: [4, 32],
  },
  mage: {
    key: 'mage', label: '法师',
    sourceChampionId: 112, // 采集于 recon-rule-mage-112-20261008.json 第 1 页
    keystoneId: TODO-采集的基石id,
    runeIds: [TODO-采集的符文id串],
    spellIds: [4, 32],
  },
  tank: {
    key: 'tank', label: '坦克',
    sourceChampionId: 57, // 采集于 recon-rule-tank-57-20261008.json 第 1 页
    keystoneId: TODO-采集的基石id,
    runeIds: [TODO-采集的符文id串],
    spellIds: [4, 32],
  },
  marksman: {
    key: 'marksman', label: '射手',
    sourceChampionId: 81, // 采集于 recon-rule-marksman-81-20261008.json 第 1 页
    keystoneId: TODO-采集的基石id,
    runeIds: [TODO-采集的符文id串],
    spellIds: [4, 32],
  },
  support: {
    key: 'support', label: '辅助',
    sourceChampionId: 117, // 采集于 recon-rule-support-117-20261008.json 第 1 页
    keystoneId: TODO-采集的基石id,
    runeIds: [TODO-采集的符文id串],
    spellIds: [4, 32],
  },
  fighter: {
    key: 'fighter', label: '战士',
    sourceChampionId: 122, // 采集于 recon-rule-fighter-122-20261008.json 第 1 页
    keystoneId: TODO-采集的基石id,
    runeIds: [TODO-采集的符文id串],
    spellIds: [4, 32],
  },
}

// 优先级：前排/开团优先（坦克→辅助），避免开团型辅助被路由到艾黎保护页；
// 纯保护型辅助（仅 support 角色）不受影响。全员冻结，防止下游就地修改共享数组。
const PRIORITY: AramRuleKey[] = ['tank', 'support', 'assassin', 'mage', 'marksman', 'fighter']

Object.freeze(ARAM_RULES)
for (const rule of Object.values(ARAM_RULES)) {
  Object.freeze(rule.runeIds)
  Object.freeze(rule.spellIds)
  Object.freeze(rule)
}

export function aramRuleFor(championId: number, index: ChampionIndex): AramRule {
  const meta = index.get(championId)
  if (meta) {
    for (const key of PRIORITY) {
      if (meta.roles.includes(key)) return ARAM_RULES[key]
    }
  }
  return ARAM_RULES.fighter
}
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run shared/champions/aram-rules.test.ts`
Expected: PASS（4 条）

- [ ] **Step 6: 提交**

```bash
git add shared/qq101/fixtures/recon-rule-*.json shared/champions/aram-rules.ts shared/champions/aram-rules.test.ts
git commit -m "feat: add builtin aram rules sourced from captured rune pages"
```

---

### Task 7: 引擎数据适配（EngineData）

**Files:**
- Create: `shared/engine/data.ts`
- Test: `shared/engine/data.test.ts`

- [ ] **Step 1: 写失败测试 `shared/engine/data.test.ts`**

```ts
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEngineData } from './data'
import { createWarehouse, type Warehouse } from '../warehouse/store'
import { createChampionIndex } from '../champions/meta'
import type { Qq101TierList } from '../qq101/types'

const INDEX = createChampionIndex([
  { id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 },
])

const TIER: Qq101TierList = {
  date: '20261007',
  champions: [{ rank: 1, championId: 84, strengthTier: 'T1', position: 'mid', winRate: 0.52, pickRate: 0.1, banRate: 0.05, counterChampionIds: [] }],
}

describe('createEngineData', () => {
  let root: string
  let wh: Warehouse
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'lux-engine-')); wh = createWarehouse(root) })

  it('未同步（无 manifest）时一切返回 null', () => {
    const data = createEngineData(wh, INDEX)
    expect(data.tierList('MIDDLE')).toBeNull()
    expect(data.tierList('ALL')).toBeNull()
    expect(data.matchups('MIDDLE', 84)).toBeNull()
    expect(data.aramOverview()).toBeNull()
  })

  it('有 manifest 时按版本读取各类数据', () => {
    wh.writeManifest({ patch: '16.19', dataDate: '20261007', updatedAt: 'x', aramDate: '20261007' })
    wh.saveTier('16.19', 'MIDDLE', TIER)
    wh.saveMatchups('16.19', 'MIDDLE', 84, [{ championId: 711, winRate: 0.55, favorable: true }])
    wh.saveRunes('16.19', 'MIDDLE', 84, [{ rank: 1, keystoneId: 8112, subStyleCode: 'jj', runeIds: [8112], pickRate: 0.4, winRate: 0.5, games: 100 }])
    wh.saveSpells('16.19', 'MIDDLE', 84, [{ spellIds: [14, 4], winRate: 0.48, pickRate: 0.9 }])
    wh.saveAram('20261007', [])

    const data = createEngineData(wh, INDEX)
    expect(data.tierList('MIDDLE')?.champions).toHaveLength(1)
    expect(data.matchups('MIDDLE', 84)).toHaveLength(1)
    expect(data.runes('MIDDLE', 84)?.[0].keystoneId).toBe(8112)
    expect(data.spells('MIDDLE', 84)?.[0].spellIds).toEqual([14, 4])
    expect(data.synergies('MIDDLE', 84)).toBeNull()
    expect(data.aramOverview()).toEqual([])
    expect(data.champion(84)?.name).toBe('阿卡丽')
    expect(data.champion(999)).toBeNull()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/engine/data.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `shared/engine/data.ts`**

```ts
// 引擎与数据仓的解耦层：引擎只依赖本接口（测试用内存假数据，运行时用数据仓）。
import type { Qq101Lane } from '../positions'
import type {
  Qq101AramHero,
  Qq101Matchup,
  Qq101RunePage,
  Qq101SpellCombo,
  Qq101Synergy,
  Qq101TierList,
} from '../qq101/types'
import type { LaneKey, Warehouse } from '../warehouse/store'
import type { ChampionIndex, ChampionMeta } from '../champions/meta'

export interface EngineData {
  tierList(lane: LaneKey): Qq101TierList | null
  matchups(lane: Qq101Lane, championId: number): Qq101Matchup[] | null
  synergies(lane: Qq101Lane, championId: number): Qq101Synergy[] | null
  runes(lane: Qq101Lane, championId: number): Qq101RunePage[] | null
  spells(lane: Qq101Lane, championId: number): Qq101SpellCombo[] | null
  aramOverview(): Qq101AramHero[] | null
  champion(id: number): ChampionMeta | null
}

export function createEngineData(warehouse: Warehouse, index: ChampionIndex): EngineData {
  const manifest = warehouse.readManifest()
  const patch = manifest?.patch ?? null
  const aramDate = manifest?.aramDate ?? null

  return {
    tierList: lane => (patch ? warehouse.loadTier(patch, lane) : null),
    matchups: (lane, id) => (patch ? warehouse.loadMatchups(patch, lane, id) : null),
    synergies: (lane, id) => (patch ? warehouse.loadSynergies(patch, lane, id) : null),
    runes: (lane, id) => (patch ? warehouse.loadRunes(patch, lane, id) : null),
    spells: (lane, id) => (patch ? warehouse.loadSpells(patch, lane, id) : null),
    aramOverview: () => (aramDate ? warehouse.loadAram(aramDate) : null),
    champion: id => index.get(id),
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/engine/data.test.ts`
Expected: PASS（2 条）

- [ ] **Step 5: 提交**

```bash
git add shared/engine/data.ts shared/engine/data.test.ts
git commit -m "feat: add engine data adapter over warehouse"
```

---

### Task 8: 引擎类型与配置

**Files:**
- Create: `shared/engine/types.ts`
- Create: `shared/engine/config.ts`

（纯类型与常量，不写测试，由后续任务的测试覆盖；本任务末尾跑 typecheck 即提交。）

- [ ] **Step 1: 写 `shared/engine/types.ts`**

```ts
import type { InternalPosition } from '../positions'

export type QueueId = 420 | 440 | 400 | 430 | 450

export interface ChampPick {
  championId: number
  position?: InternalPosition
}

export interface DraftContext {
  queueId: QueueId
  myPosition?: InternalPosition
  allies: ChampPick[]
  enemies: ChampPick[]
  bans?: number[]
  /** 已拥有英雄（设置开启时用于候选池过滤）；缺省 = 不过滤 */
  ownedChampionIds?: number[]
  /** 熟练度 0-100（Phase 3 由 LCU 提供）；缺省 = 无 */
  proficiency?: Record<number, number>
}

export type FactorKey = 'matchup' | 'strength' | 'composition' | 'synergy' | 'beginner'

export type ReasonDetail =
  | { kind: 'matchup'; enemyChampionId: number; winRate: number }
  | { kind: 'synergy'; allyChampionId: number; winRate: number }
  | { kind: 'strength'; winRate: number | null; tier: string }
  | { kind: 'composition'; text: string }
  | { kind: 'beginner'; difficulty: number }

export interface FactorResult {
  key: FactorKey
  /** null = 缺数据（计分按 50 中性） */
  score: number | null
  weight: number
  contribution: number
  detail?: ReasonDetail
}

export interface ChampionRecommendation {
  championId: number
  score: number
  factors: FactorResult[]
  dominantFactor: FactorKey | null
  reason: string
  /** 有任一激活因素缺数据时为 true */
  partialData: boolean
}

export interface RuneAdvice {
  keystoneId: number
  runeIds: number[]
  source: 'qq101' | 'builtin'
}

export interface SpellAdvice {
  spellIds: [number, number]
  source: 'qq101' | 'builtin'
}

export interface RiftAdvice {
  primary: ChampionRecommendation
  alternates: ChampionRecommendation[]
  runes: RuneAdvice | null
  spells: SpellAdvice | null
  /** 整仓未就绪时为 true（规则模式：仅阵容契合 + 新手友好参与评分） */
  ruleMode: boolean
}

export interface AramJudgeInput {
  current: number
  bench: number[]
  diceLeft: number
  /** 己方已选英雄 id（大乱斗选人可见）；缺省 = 未知（阵容契合按中性计） */
  allies?: number[]
  /** 敌方可见英雄 id；缺省 = 未知 */
  enemies?: number[]
}

export interface AramJudgeResult {
  action: 'keep' | 'swap' | 'reroll'
  current: ChampionRecommendation
  bench: ChampionRecommendation[]
  swapTo: ChampionRecommendation | null
  reason: string
  /** 给「留下或换到」的那名英雄的内置大乱斗符文/技能 */
  runes: RuneAdvice | null
  spells: SpellAdvice | null
}
```

- [ ] **Step 2: 写 `shared/engine/config.ts`**

```ts
// 引擎调参集中在此文件（初始值为设计文档 2026-10-08 §5.2/§5.3 的给定值）。
import type { FactorKey, QueueId } from './types'

export type FactorWeights = Partial<Record<FactorKey, number>>

export const WEIGHTS_BY_QUEUE: Record<QueueId, FactorWeights> = {
  420: { matchup: 30, strength: 25, composition: 20, synergy: 15, beginner: 10 },
  440: { matchup: 30, strength: 25, composition: 20, synergy: 15, beginner: 10 },
  400: { matchup: 30, strength: 25, composition: 20, synergy: 15, beginner: 10 },
  430: { strength: 35, composition: 45, beginner: 20 },
  450: { strength: 40, composition: 35, beginner: 25 },
}

/** 整仓未就绪时的规则模式权重（仅保留两项） */
export const RULE_MODE_WEIGHTS: FactorWeights = { composition: 70, beginner: 30 }

export const NEUTRAL_SCORE = 50

/** 对位/协同折算：score = 50 + (winRate - 0.5) * MATCHUP_SCALE，截断 0-100 */
export const MATCHUP_SCALE = 250

/** 大乱斗强度折算（绝对）：score = 50 + (winRate - 0.5) * ARAM_WINRATE_SCALE */
export const ARAM_WINRATE_SCALE = 500

/** 阵容契合规则的加减分 */
export const COMPOSITION_DELTAS = {
  fillsMissingAP: 15,
  fillsMissingAD: 15,
  fillsMissingFrontline: 15,
  extraFrontline: -5,
  tankyVsAssassins: 10,
  squishyVsAssassins: -10,
} as const

/** 大乱斗换/留阈值（设计 §5.3） */
export const ARAM_SWAP_GAP = 8
export const ARAM_WEAK_SCORE = 55

/** 推荐展示数量：主推 1 + 备选 2 */
export const ALTERNATE_COUNT = 2
```

- [ ] **Step 3: 验证与提交**

Run: `npm run typecheck`
Expected: 0 错误。

```bash
git add shared/engine/types.ts shared/engine/config.ts
git commit -m "feat: add engine types and tunable config"
```

---

### Task 9: 候选池

**Files:**
- Create: `shared/engine/candidates.ts`
- Test: `shared/engine/candidates.test.ts`

- [ ] **Step 1: 写失败测试 `shared/engine/candidates.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { buildCandidatePool, toQq101Lane } from './candidates'
import type { DraftContext, QueueId } from './types'
import type { EngineData } from './data'
import { createChampionIndex } from '../champions/meta'
import type { Qq101TierList } from '../qq101/types'

const TIER: Qq101TierList = {
  date: 'x',
  champions: [
    { rank: 1, championId: 101, strengthTier: 'T1', position: 'mid', winRate: 0.5, pickRate: 0.1, banRate: 0.05, counterChampionIds: [] },
    { rank: 2, championId: 84, strengthTier: 'T1', position: 'mid', winRate: 0.5, pickRate: 0.1, banRate: 0.05, counterChampionIds: [] },
    { rank: 3, championId: 711, strengthTier: 'T2', position: 'mid', winRate: 0.5, pickRate: 0.1, banRate: 0.05, counterChampionIds: [] },
    { rank: 4, championId: 112, strengthTier: 'T2', position: 'mid', winRate: 0.5, pickRate: 0.1, banRate: 0.05, counterChampionIds: [] },
  ],
}

function makeData(overrides: Partial<EngineData> = {}): EngineData {
  return {
    tierList: () => null,
    matchups: () => null,
    synergies: () => null,
    runes: () => null,
    spells: () => null,
    aramOverview: () => null,
    champion: id => ({ id, name: `英雄${id}`, damageType: 'ap', roles: ['mage'], difficulty: 5 }),
    ...overrides,
  }
}

function ctx(queueId: QueueId, extra: Partial<DraftContext> = {}): DraftContext {
  return { queueId, allies: [], enemies: [], ...extra }
}

describe('toQq101Lane', () => {
  it('内部位置 → 101 lane', () => {
    expect(toQq101Lane('mid')).toBe('MIDDLE')
    expect(toQq101Lane('utility')).toBe('SUPPORT')
    expect(toQq101Lane(undefined)).toBeNull()
  })
})

describe('buildCandidatePool', () => {
  it('征召：来自该位置梯度榜，剔除双方已选与 Ban', () => {
    const data = makeData({ tierList: lane => (lane === 'MIDDLE' ? TIER : null) })
    const pool = buildCandidatePool(
      ctx(420, {
        myPosition: 'mid',
        allies: [{ championId: 101 }],
        enemies: [{ championId: 711, position: 'mid' }],
        bans: [112],
      }),
      data,
    )
    expect(pool).toEqual([84])
  })

  it('已拥有过滤：提供 ownedChampionIds 时仅保留其中', () => {
    const data = makeData({ tierList: () => TIER })
    const pool = buildCandidatePool(ctx(420, { myPosition: 'mid', ownedChampionIds: [84, 112] }), data)
    expect(pool).toEqual([84, 112])
  })

  it('盲选：用 ALL 榜且不限制位置', () => {
    const data = makeData({ tierList: lane => (lane === 'ALL' ? TIER : null) })
    const pool = buildCandidatePool(ctx(430), data)
    expect(pool).toEqual([101, 84, 711, 112])
  })

  it('无榜单数据（规则模式）：回退到英雄字典全集', () => {
    const index = createChampionIndex([
      { id: 1, name: 'a', damageType: 'ad', roles: ['tank'], difficulty: 3 },
      { id: 2, name: 'b', damageType: 'ap', roles: ['mage'], difficulty: 5 },
    ])
    const data = makeData({ champion: id => index.get(id) })
    const pool = buildCandidatePool(ctx(420, { myPosition: 'mid', allies: [{ championId: 1 }] }), data)
    expect(pool).toEqual([2])
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/engine/candidates.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `shared/engine/candidates.ts`**

```ts
import { toQq101Lane as positionToLane, type InternalPosition, type Qq101Lane } from '../positions'
import type { EngineData } from './data'
import type { DraftContext } from './types'

export function toQq101Lane(position: InternalPosition | undefined): Qq101Lane | null {
  return position ? positionToLane(position) : null
}

export function buildCandidatePool(ctx: DraftContext, data: EngineData): number[] {
  const isBlind = ctx.queueId === 430
  const lane = isBlind ? ('ALL' as const) : toQq101Lane(ctx.myPosition)
  const tierList = lane ? data.tierList(lane) : null
  const base = tierList ? tierList.champions.map(c => c.championId) : allChampionIds(data)

  const exclude = new Set<number>([
    ...ctx.allies.map(p => p.championId),
    ...ctx.enemies.map(p => p.championId),
    ...(ctx.bans ?? []),
  ])

  let pool = base.filter(id => !exclude.has(id))

  if (ctx.ownedChampionIds && ctx.ownedChampionIds.length > 0) {
    const owned = new Set(ctx.ownedChampionIds)
    pool = pool.filter(id => owned.has(id))
  }

  return pool
}

function allChampionIds(data: EngineData): number[] {
  // 1..999 覆盖全部现行英雄 id（最大 ≈950）；Phase 3 接入 LCU 字典时改为注入完整清单。
  const ids: number[] = []
  for (let id = 1; id <= 999; id++) {
    if (data.champion(id)) ids.push(id)
  }
  return ids
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/engine/candidates.test.ts`
Expected: PASS（5 条）

- [ ] **Step 5: 提交**

```bash
git add shared/engine/candidates.ts shared/engine/candidates.test.ts
git commit -m "feat: add candidate pool builder"
```

---

### Task 10: 理由生成

**Files:**
- Create: `shared/engine/reasons.ts`
- Test: `shared/engine/reasons.test.ts`

- [ ] **Step 1: 写失败测试 `shared/engine/reasons.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { buildReason } from './reasons'
import { createChampionIndex } from '../champions/meta'
import type { EngineData } from './data'
import type { FactorResult } from './types'

const INDEX = createChampionIndex([
  { id: 69, name: '卡西奥佩娅', damageType: 'ap', roles: ['mage'], difficulty: 5 },
  { id: 876, name: '莉莉娅', damageType: 'ap', roles: ['fighter'], difficulty: 6 },
])

const data: EngineData = {
  tierList: () => null, matchups: () => null, synergies: () => null,
  runes: () => null, spells: () => null, aramOverview: () => null,
  champion: id => INDEX.get(id),
}

function factor(overrides: Partial<FactorResult>): FactorResult {
  return { key: 'strength', score: 60, weight: 25, contribution: 15, ...overrides }
}

describe('buildReason', () => {
  it('对位好打模板', () => {
    const r = buildReason(factor({ key: 'matchup', detail: { kind: 'matchup', enemyChampionId: 69, winRate: 0.5646 } }), data, '排位')
    expect(r).toBe('对线好打：对 卡西奥佩娅 胜率 56.5%')
  })

  it('对位劣势模板', () => {
    const r = buildReason(factor({ key: 'matchup', detail: { kind: 'matchup', enemyChampionId: 69, winRate: 0.431 } }), data, '排位')
    expect(r).toBe('对线有压力：对 卡西奥佩娅 胜率 43.1%')
  })

  it('协同模板', () => {
    const r = buildReason(factor({ key: 'synergy', detail: { kind: 'synergy', allyChampionId: 876, winRate: 0.58 } }), data, '排位')
    expect(r).toBe('和队友 莉莉娅 是黄金搭档（胜率 58.0%）')
  })

  it('强度模板：有 T 级带括号，无 T 级（大乱斗）不带', () => {
    const r1 = buildReason(factor({ key: 'strength', detail: { kind: 'strength', winRate: 0.52, tier: 'T1' } }), data, '排位')
    expect(r1).toBe('版本强势：排位胜率 52.0%（T1）')
    const r2 = buildReason(factor({ key: 'strength', detail: { kind: 'strength', winRate: 0.546, tier: '' } }), data, '大乱斗')
    expect(r2).toBe('版本强势：大乱斗胜率 54.6%')
  })

  it('阵容模板与新手模板', () => {
    const r1 = buildReason(factor({ key: 'composition', detail: { kind: 'composition', text: '你们缺前排，阿卡丽正好补上' } }), data, '排位')
    expect(r1).toBe('你们缺前排，阿卡丽正好补上')
    const r2 = buildReason(factor({ key: 'beginner', detail: { kind: 'beginner', difficulty: 3 } }), data, '排位')
    expect(r2).toBe('操作上手简单，适合新手')
  })

  it('主导因素为空 → 兜底文案', () => {
    expect(buildReason(null, data, '排位')).toBe('适合当前阵容')
  })

  it('英雄名缺失用兜底命名', () => {
    const r = buildReason(factor({ key: 'matchup', detail: { kind: 'matchup', enemyChampionId: 12345, winRate: 0.6 } }), data, '排位')
    expect(r).toBe('对线好打：对 英雄12345 胜率 60.0%')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/engine/reasons.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `shared/engine/reasons.ts`**

```ts
import type { EngineData } from './data'
import type { FactorResult } from './types'

function championName(id: number, data: EngineData): string {
  return data.champion(id)?.name ?? `英雄${id}`
}

function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

export function buildReason(dominant: FactorResult | null, data: EngineData, modeLabel: string): string {
  const detail = dominant?.detail
  if (!dominant || !detail || dominant.score === null) return '适合当前阵容'

  switch (detail.kind) {
    case 'matchup': {
      const enemy = championName(detail.enemyChampionId, data)
      const prefix = detail.winRate >= 0.5 ? '对线好打' : '对线有压力'
      return `${prefix}：对 ${enemy} 胜率 ${pct(detail.winRate)}`
    }
    case 'synergy':
      return `和队友 ${championName(detail.allyChampionId, data)} 是黄金搭档（胜率 ${pct(detail.winRate)}）`
    case 'strength': {
      const wr = detail.winRate === null ? '—' : pct(detail.winRate)
      const tier = detail.tier ? `（${detail.tier}）` : ''
      return `版本强势：${modeLabel}胜率 ${wr}${tier}`
    }
    case 'composition':
      return detail.text
    case 'beginner':
      return '操作上手简单，适合新手'
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/engine/reasons.test.ts`
Expected: PASS（7 条）

- [ ] **Step 5: 提交**

```bash
git add shared/engine/reasons.ts shared/engine/reasons.test.ts
git commit -m "feat: add deterministic chinese reason templates"
```

---

### Task 11: 评分（五因素 + 汇总）

**Files:**
- Create: `shared/engine/score.ts`
- Test: `shared/engine/score.test.ts`

- [ ] **Step 1: 写失败测试 `shared/engine/score.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { scoreBeginner, scoreChampion, scoreComposition, scoreMatchup, scoreStrength, scoreSynergy } from './score'
import type { EngineData } from './data'
import type { DraftContext } from './types'
import type { Qq101TierList } from '../qq101/types'
import { createChampionIndex } from '../champions/meta'

const INDEX = createChampionIndex([
  { id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 },
  { id: 112, name: '维克托', damageType: 'ap', roles: ['mage'], difficulty: 5 },
  { id: 57, name: '茂凯', damageType: 'ap', roles: ['tank'], difficulty: 3 },
  { id: 81, name: '伊泽瑞尔', damageType: 'ad', roles: ['marksman'], difficulty: 5 },
  { id: 122, name: '德莱厄斯', damageType: 'ad', roles: ['fighter'], difficulty: 6 },
  { id: 86, name: '盖伦', damageType: 'ad', roles: ['fighter', 'tank'], difficulty: 3 },
  { id: 105, name: '菲兹', damageType: 'ap', roles: ['assassin'], difficulty: 6 },
])

const TIER: Qq101TierList = {
  date: 'x',
  champions: [
    { rank: 1, championId: 84, strengthTier: 'T1', position: 'mid', winRate: 0.53, pickRate: 0.10, banRate: 0.05, counterChampionIds: [] },
    { rank: 2, championId: 112, strengthTier: 'T1', position: 'mid', winRate: 0.51, pickRate: 0.08, banRate: 0.05, counterChampionIds: [] },
    { rank: 3, championId: 711, strengthTier: 'T2', position: 'mid', winRate: 0.49, pickRate: 0.06, banRate: 0.05, counterChampionIds: [] },
  ],
}

function makeData(overrides: Partial<EngineData> = {}): EngineData {
  return {
    tierList: () => null,
    matchups: () => null,
    synergies: () => null,
    runes: () => null,
    spells: () => null,
    aramOverview: () => null,
    champion: id => INDEX.get(id),
    ...overrides,
  }
}

const BASE_CTX: DraftContext = { queueId: 420, myPosition: 'mid', allies: [], enemies: [] }

describe('scoreStrength', () => {
  it('按胜率/出场率百分位计分（最高胜率 = 100，唯一最低 = 33.3）', () => {
    const data = makeData({ tierList: () => TIER })
    const r = scoreStrength(84, 'MIDDLE', data)
    expect(r.score).toBe(100)
    expect(r.detail).toEqual({ kind: 'strength', winRate: 0.53, tier: 'T1' })
    expect(scoreStrength(112, 'MIDDLE', data).score).toBe(66.7)
    expect(scoreStrength(711, 'MIDDLE', data).score).toBe(33.3)
    expect(scoreStrength(9999, 'MIDDLE', data).score).toBeNull()
  })
})

describe('scoreMatchup', () => {
  it('好打/难打/未覆盖', () => {
    const data = makeData({
      matchups: (_lane, id) =>
        id === 84
          ? [
              { championId: 69, winRate: 0.5646, favorable: true },
              { championId: 711, winRate: 0.431, favorable: false },
            ]
          : null,
    })
    const good = scoreMatchup(84, 'MIDDLE', [{ championId: 69, position: 'mid' }], data)
    expect(good.score).toBeCloseTo(66.15, 2)
    expect(good.detail).toEqual({ kind: 'matchup', enemyChampionId: 69, winRate: 0.5646 })

    const bad = scoreMatchup(84, 'MIDDLE', [{ championId: 711, position: 'mid' }], data)
    expect(bad.score).toBeCloseTo(32.75, 2)

    const uncovered = scoreMatchup(84, 'MIDDLE', [{ championId: 999, position: 'mid' }], data)
    expect(uncovered.score).toBe(50)
    expect(uncovered.detail).toBeUndefined()
  })

  it('敌方位置未知时对所有敌人取平均', () => {
    const data = makeData({
      matchups: () => [
        { championId: 69, winRate: 0.56, favorable: true },
        { championId: 711, winRate: 0.44, favorable: false },
      ],
    })
    const r = scoreMatchup(84, 'MIDDLE', [{ championId: 69 }, { championId: 711 }], data)
    expect(r.score).toBeCloseTo(50, 1)
  })

  it('对位表缺数据 → null', () => {
    expect(scoreMatchup(84, 'MIDDLE', [{ championId: 69 }], makeData()).score).toBeNull()
  })
})

describe('scoreSynergy', () => {
  it('队友在协同表 → 按胜率折算；未覆盖 → 50；缺表 → null', () => {
    const data = makeData({
      synergies: () => [{ championId: 876, winRate: 0.58, games: 100 }],
    })
    const r = scoreSynergy(84, 'MIDDLE', [{ championId: 876 }], data)
    expect(r.score).toBeCloseTo(70, 1)
    expect(r.detail).toEqual({ kind: 'synergy', allyChampionId: 876, winRate: 0.58 })
    expect(scoreSynergy(84, 'MIDDLE', [{ championId: 999 }], data).score).toBe(50)
    expect(scoreSynergy(84, 'MIDDLE', [{ championId: 876 }], makeData()).score).toBeNull()
  })
})

describe('scoreComposition', () => {
  const data = makeData()

  it('缺法术伤害时法师加分', () => {
    const r = scoreComposition(112, { ...BASE_CTX, allies: [{ championId: 81 }] }, data)
    expect(r.score).toBe(65)
    expect(r.detail).toEqual({ kind: 'composition', text: '你们缺法术伤害，维克托正好补上' })
  })

  it('队友已有法师且自身也是法师 → 中性', () => {
    const r = scoreComposition(112, { ...BASE_CTX, allies: [{ championId: 84 }] }, data)
    expect(r.score).toBe(50)
  })

  it('缺前排时坦克加分；前排已两人时再选前排减分', () => {
    const r1 = scoreComposition(57, { ...BASE_CTX, myPosition: 'top', allies: [{ championId: 122 }] }, data)
    expect(r1.score).toBe(65) // +15 缺法术（队友德莱厄斯是 AD）
    const r2 = scoreComposition(57, { ...BASE_CTX, myPosition: 'top', allies: [{ championId: 122 }, { championId: 86 }] }, data)
    expect(r2.score).toBe(60) // +15 缺法术 -5 前排过剩
  })

  it('对面刺客 ≥2：前排坦克加分', () => {
    const enemies = [{ championId: 84 }, { championId: 105 }]
    const r = scoreComposition(57, { ...BASE_CTX, myPosition: 'top', enemies }, data)
    expect(r.score).toBe(60) // +10 扛刺客（队友为空不触发缺口规则）
  })

  it('字典缺 profile → null', () => {
    expect(scoreComposition(9999, BASE_CTX, data).score).toBeNull()
  })
})

describe('scoreBeginner', () => {
  it('按难度折算；提供熟练度时加权', () => {
    const data = makeData()
    expect(scoreBeginner(84, undefined, data).score).toBe(58)
    expect(scoreBeginner(84, { 84: 80 }, data).score).toBeCloseTo(66.8, 1)
    expect(scoreBeginner(9999, undefined, data).score).toBeNull()
  })
})

describe('scoreChampion', () => {
  it('缺数据的因素按 50 计并标记 partialData；主导因素取贡献最大', () => {
    const data = makeData({
      tierList: () => TIER,
      matchups: () => [{ championId: 69, winRate: 0.5646, favorable: true }],
    })
    const rec = scoreChampion(84, { ...BASE_CTX, enemies: [{ championId: 69, position: 'mid' }] }, data, { modeLabel: '排位' })
    expect(rec.partialData).toBe(true) // synergy/runes 未提供 → synergy null
    expect(rec.score).toBeGreaterThan(50)
    const keys = rec.factors.map(f => f.key).sort()
    expect(keys).toEqual(['beginner', 'composition', 'matchup', 'strength', 'synergy'])
    expect(rec.dominantFactor).toBe('strength') // 25 > matchup 19.5
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/engine/score.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `shared/engine/score.ts`**

```ts
import { toQq101Lane, type Qq101Lane } from '../positions'
import type { ChampionMeta } from '../champions/meta'
import { isFrontline } from '../champions/meta'
import { buildReason } from './reasons'
import { COMPOSITION_DELTAS, MATCHUP_SCALE, NEUTRAL_SCORE, WEIGHTS_BY_QUEUE, type FactorWeights } from './config'
import type { EngineData } from './data'
import type {
  ChampPick,
  ChampionRecommendation,
  DraftContext,
  FactorKey,
  FactorResult,
  QueueId,
  ReasonDetail,
} from './types'

const clamp = (n: number): number => Math.max(0, Math.min(100, n))
const round1 = (n: number): number => Math.round(n * 10) / 10

export interface FactorOutcome {
  score: number | null
  detail?: ReasonDetail
}

function percentile(values: number[], mine: number): number {
  if (values.length === 0) return 0.5
  return values.filter(v => v <= mine).length / values.length
}

export function scoreStrength(championId: number, lane: Qq101Lane | 'ALL', data: EngineData): FactorOutcome {
  const tierList = data.tierList(lane)
  const record = tierList?.champions.find(c => c.championId === championId)
  if (!tierList || !record || record.winRate === null) return { score: null }

  const winRates = tierList.champions.map(c => c.winRate).filter((v): v is number => v !== null)
  const pickRates = tierList.champions.map(c => c.pickRate).filter((v): v is number => v !== null)
  const winPct = percentile(winRates, record.winRate)
  const pickPct = record.pickRate === null ? 0.5 : percentile(pickRates, record.pickRate)

  return {
    score: round1(clamp(100 * (0.7 * winPct + 0.3 * pickPct))),
    detail: { kind: 'strength', winRate: record.winRate, tier: record.strengthTier },
  }
}

function matchupTargets(ctx: DraftContext): ChampPick[] {
  const atPosition = ctx.enemies.filter(e => e.position && e.position === ctx.myPosition)
  return atPosition.length > 0 ? atPosition : ctx.enemies
}

export function scoreMatchup(
  championId: number,
  lane: Qq101Lane,
  enemies: ChampPick[],
  data: EngineData,
): FactorOutcome {
  const rows = data.matchups(lane, championId)
  if (!rows) return { score: null }
  if (enemies.length === 0) return { score: NEUTRAL_SCORE }

  let best: { championId: number; winRate: number; score: number } | null = null
  let sum = 0
  for (const enemy of enemies) {
    const entry = rows.find(r => r.championId === enemy.championId)
    const score = entry && entry.winRate !== null
      ? clamp(NEUTRAL_SCORE + (entry.winRate - 0.5) * MATCHUP_SCALE)
      : NEUTRAL_SCORE
    sum += score
    if (
      entry && entry.winRate !== null &&
      (!best || Math.abs(score - NEUTRAL_SCORE) > Math.abs(best.score - NEUTRAL_SCORE))
    ) {
      best = { championId: entry.championId, winRate: entry.winRate, score }
    }
  }

  const detail: ReasonDetail | undefined = best && best.score !== NEUTRAL_SCORE
    ? { kind: 'matchup', enemyChampionId: best.championId, winRate: best.winRate }
    : undefined
  return { score: clamp(sum / enemies.length), detail }
}

export function scoreSynergy(
  championId: number,
  lane: Qq101Lane,
  allies: ChampPick[],
  data: EngineData,
): FactorOutcome {
  const rows = data.synergies(lane, championId)
  if (!rows) return { score: null }
  if (allies.length === 0) return { score: NEUTRAL_SCORE }

  let best: { championId: number; winRate: number } | null = null
  let sum = 0
  for (const ally of allies) {
    const entry = rows.find(r => r.championId === ally.championId)
    const score = entry && entry.winRate !== null
      ? clamp(NEUTRAL_SCORE + (entry.winRate - 0.5) * MATCHUP_SCALE)
      : NEUTRAL_SCORE
    sum += score
    if (entry && entry.winRate !== null && (!best || entry.winRate > best.winRate)) {
      best = { championId: entry.championId, winRate: entry.winRate }
    }
  }

  const detail: ReasonDetail | undefined = best && best.winRate > 0.5
    ? { kind: 'synergy', allyChampionId: best.championId, winRate: best.winRate }
    : undefined
  return { score: round1(clamp(sum / allies.length)), detail }
}

export function scoreComposition(championId: number, ctx: DraftContext, data: EngineData): FactorOutcome {
  const meta = data.champion(championId)
  if (!meta) return { score: null }

  const allyMetas = ctx.allies
    .map(a => data.champion(a.championId))
    .filter((m): m is ChampionMeta => m !== null)
  const enemyMetas = ctx.enemies
    .map(e => data.champion(e.championId))
    .filter((m): m is ChampionMeta => m !== null)

  const deltas: Array<{ delta: number; text: string }> = []
  const d = COMPOSITION_DELTAS

  if (allyMetas.length > 0) {
    const apCount = allyMetas.filter(m => m.damageType === 'ap').length
    const adCount = allyMetas.filter(m => m.damageType === 'ad').length
    const frontlineCount = allyMetas.filter(m => isFrontline(m)).length

    if (apCount === 0 && meta.damageType === 'ap') {
      deltas.push({ delta: d.fillsMissingAP, text: `你们缺法术伤害，${meta.name}正好补上` })
    }
    if (adCount === 0 && meta.damageType === 'ad') {
      deltas.push({ delta: d.fillsMissingAD, text: `你们缺物理伤害，${meta.name}正好补上` })
    }
    if (frontlineCount === 0 && isFrontline(meta)) {
      deltas.push({ delta: d.fillsMissingFrontline, text: `你们缺前排，${meta.name}正好补上` })
    }
    if (frontlineCount >= 2 && isFrontline(meta)) {
      deltas.push({ delta: d.extraFrontline, text: '' })
    }
  }

  const enemyAssassins = enemyMetas.filter(m => m.roles.includes('assassin')).length
  if (enemyAssassins >= 2) {
    if (isFrontline(meta)) {
      deltas.push({ delta: d.tankyVsAssassins, text: `对面刺客多，${meta.name}扛得住` })
    } else {
      deltas.push({ delta: d.squishyVsAssassins, text: '' })
    }
  }

  const total = deltas.reduce((acc, item) => acc + item.delta, 0)
  const bestText = deltas
    .filter(item => item.delta > 0 && item.text)
    .sort((a, b) => b.delta - a.delta)[0]?.text

  return {
    score: clamp(NEUTRAL_SCORE + total),
    detail: bestText ? { kind: 'composition', text: bestText } : undefined,
  }
}

export function scoreBeginner(
  championId: number,
  proficiency: Record<number, number> | undefined,
  data: EngineData,
): FactorOutcome {
  const meta = data.champion(championId)
  if (!meta) return { score: null }

  const difficultyScore = clamp(100 - (meta.difficulty - 1) * 7)
  const prof = proficiency?.[championId]
  const score = prof === undefined ? difficultyScore : 0.6 * difficultyScore + 0.4 * clamp(prof)

  return { score: round1(score), detail: { kind: 'beginner', difficulty: meta.difficulty } }
}

export interface ScoreOptions {
  modeLabel: string
  weights?: FactorWeights
  /** 强度来源（'ALL' 用于盲选；null = 不评强度）。缺省 = 由 ctx.myPosition 推导 */
  strengthLane?: Qq101Lane | 'ALL' | null
  /** 对位/协同来源（null = 不计这两个因素）。缺省 = 由 ctx.myPosition 推导 */
  pairLane?: Qq101Lane | null
  /** 覆盖强度因素（大乱斗由 aram.ts 提供） */
  strengthOverride?: FactorOutcome | null
}

export function scoreChampion(
  championId: number,
  ctx: DraftContext,
  data: EngineData,
  options: ScoreOptions,
): ChampionRecommendation {
  const weights = options.weights ?? WEIGHTS_BY_QUEUE[ctx.queueId as QueueId] ?? {}
  const defaultLane = toQq101Lane(ctx.myPosition ?? '')
  const strengthLane = options.strengthLane === undefined ? defaultLane : options.strengthLane
  const pairLane = options.pairLane === undefined ? defaultLane : options.pairLane

  const outcomes: Record<FactorKey, FactorOutcome> = {
    strength: options.strengthOverride
      ?? (strengthLane ? scoreStrength(championId, strengthLane, data) : { score: null }),
    matchup: pairLane ? scoreMatchup(championId, pairLane, matchupTargets(ctx), data) : { score: null },
    synergy: pairLane ? scoreSynergy(championId, pairLane, ctx.allies, data) : { score: null },
    composition: scoreComposition(championId, ctx, data),
    beginner: scoreBeginner(championId, ctx.proficiency, data),
  }

  const factors: FactorResult[] = (Object.keys(outcomes) as FactorKey[])
    .filter(key => (weights[key] ?? 0) > 0)
    .map(key => {
      const weight = weights[key]!
      const score = outcomes[key].score
      return {
        key,
        score,
        weight,
        contribution: round1(((score ?? NEUTRAL_SCORE) / 100) * weight),
        detail: outcomes[key].detail,
      }
    })

  const weightSum = factors.reduce((acc, f) => acc + f.weight, 0)
  const total = weightSum === 0
    ? NEUTRAL_SCORE
    : clamp(factors.reduce((acc, f) => acc + (f.score ?? NEUTRAL_SCORE) * f.weight, 0) / weightSum)

  const dominant = [...factors]
    .filter(f => f.score !== null)
    .sort((a, b) => b.contribution - a.contribution)[0]
  const dominantFactor = dominant && dominant.score !== NEUTRAL_SCORE ? dominant.key : null

  return {
    championId,
    score: round1(total),
    factors,
    dominantFactor,
    reason: buildReason(
      dominantFactor ? dominant : null,
      data,
      options.modeLabel,
    ),
    partialData: factors.some(f => f.score === null),
  }
}

export function scoreAll(
  championIds: number[],
  ctx: DraftContext,
  data: EngineData,
  options: ScoreOptions,
): ChampionRecommendation[] {
  return championIds
    .map(id => scoreChampion(id, ctx, data, options))
    .sort((a, b) => b.score - a.score)
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/engine/score.test.ts`
Expected: PASS（12 条）

- [ ] **Step 5: 提交**

```bash
git add shared/engine/score.ts shared/engine/score.test.ts
git commit -m "feat: add five-factor champion scoring"
```

---

### Task 12: 编排 recommendRift

**Files:**
- Create: `shared/engine/recommend.ts`
- Test: `shared/engine/recommend.test.ts`

- [ ] **Step 1: 写失败测试 `shared/engine/recommend.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { recommendRift } from './recommend'
import { createChampionIndex } from '../champions/meta'
import type { EngineData } from './data'
import type { DraftContext } from './types'
import type { Qq101TierList } from '../qq101/types'

const INDEX = createChampionIndex([
  { id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 },
  { id: 112, name: '维克托', damageType: 'ap', roles: ['mage'], difficulty: 5 },
  { id: 711, name: '薇克丝', damageType: 'ap', roles: ['mage'], difficulty: 4 },
  { id: 101, name: '泽拉斯', damageType: 'ap', roles: ['mage'], difficulty: 5 },
])

const TIER: Qq101TierList = {
  date: '20261007',
  champions: [
    { rank: 1, championId: 84, strengthTier: 'T1', position: 'mid', winRate: 0.53, pickRate: 0.10, banRate: 0.05, counterChampionIds: [] },
    { rank: 2, championId: 112, strengthTier: 'T1', position: 'mid', winRate: 0.51, pickRate: 0.08, banRate: 0.05, counterChampionIds: [] },
    { rank: 3, championId: 711, strengthTier: 'T2', position: 'mid', winRate: 0.47, pickRate: 0.06, banRate: 0.05, counterChampionIds: [] },
  ],
}

function makeData(overrides: Partial<EngineData> = {}): EngineData {
  return {
    tierList: lane => (lane === 'MIDDLE' ? TIER : null),
    matchups: (_lane, id) => (id === 84 ? [{ championId: 711, winRate: 0.56, favorable: true }] : null),
    synergies: () => null,
    runes: (_lane, id) => (id === 84 ? [{ rank: 1, keystoneId: 8112, subStyleCode: 'jj', runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001], pickRate: 0.44, winRate: 0.48, games: 100 }] : null),
    spells: (_lane, id) => (id === 84 ? [{ spellIds: [14, 4], winRate: 0.49, pickRate: 0.9 }] : null),
    aramOverview: () => null,
    champion: id => INDEX.get(id),
    ...overrides,
  }
}

const CTX: DraftContext = {
  queueId: 420,
  myPosition: 'mid',
  allies: [{ championId: 101, position: 'utility' }],
  enemies: [{ championId: 711, position: 'mid' }],
}

describe('recommendRift', () => {
  it('排位：主推 + 备选排序，附着符文与技能', () => {
    const advice = recommendRift(CTX, makeData())
    expect(advice.ruleMode).toBe(false)
    expect(advice.primary.championId).toBe(84)
    expect(advice.primary.reason).toContain('版本强势')
    expect(advice.alternates.length).toBeLessThanOrEqual(2)
    expect(advice.runes).toEqual({
      keystoneId: 8112,
      runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
      source: 'qq101',
    })
    expect(advice.spells).toEqual({ spellIds: [14, 4], source: 'qq101' })
    expect(advice.primary.partialData).toBe(true) // 协同表缺失
  })

  it('无任何榜单数据 → 规则模式（仅阵容+新手），候选来自英雄字典', () => {
    const data = makeData({ tierList: () => null, matchups: () => null, runes: () => null, spells: () => null })
    const advice = recommendRift(CTX, data)
    expect(advice.ruleMode).toBe(true)
    expect(advice.primary.championId).toBeDefined()
    expect(advice.runes).toBeNull()
    expect(advice.primary.factors.every(f => f.key === 'composition' || f.key === 'beginner')).toBe(true)
  })

  it('盲选：用 ALL 榜，不附着符文技能', () => {
    const data = makeData({ tierList: lane => (lane === 'ALL' ? TIER : null) })
    const advice = recommendRift({ queueId: 430, allies: [], enemies: [] }, data)
    expect(advice.ruleMode).toBe(false)
    expect(advice.runes).toBeNull()
    expect(advice.spells).toBeNull()
    expect(advice.primary).toBeDefined()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/engine/recommend.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `shared/engine/recommend.ts`**

```ts
import type { Qq101Lane } from '../positions'
import { ALTERNATE_COUNT, RULE_MODE_WEIGHTS, WEIGHTS_BY_QUEUE } from './config'
import { buildCandidatePool, toQq101Lane } from './candidates'
import type { EngineData } from './data'
import { scoreAll } from './score'
import type { DraftContext, QueueId, RiftAdvice, RuneAdvice, SpellAdvice } from './types'

const MODE_LABELS: Record<QueueId, string> = {
  420: '排位', 440: '排位', 400: '征召', 430: '匹配', 450: '大乱斗',
}

export function recommendRift(ctx: DraftContext, data: EngineData): RiftAdvice {
  const isBlind = ctx.queueId === 430
  const lane = isBlind ? null : toQq101Lane(ctx.myPosition)
  const strengthLane: Qq101Lane | 'ALL' = isBlind || lane === null ? 'ALL' : lane
  const ruleMode = data.tierList(strengthLane) === null

  const pool = buildCandidatePool(ctx, data)
  if (pool.length === 0) {
    throw new Error('候选池为空：请检查英雄字典与榜单数据')
  }

  const ranked = scoreAll(pool, ctx, data, {
    modeLabel: MODE_LABELS[ctx.queueId] ?? '对局',
    weights: ruleMode ? RULE_MODE_WEIGHTS : WEIGHTS_BY_QUEUE[ctx.queueId],
    strengthLane: ruleMode ? null : strengthLane,
    pairLane: ruleMode || isBlind ? null : lane,
  })

  const [primary, ...rest] = ranked

  let runes: RuneAdvice | null = null
  let spells: SpellAdvice | null = null
  if (!ruleMode && lane) {
    const pages = data.runes(lane, primary.championId)
    if (pages && pages.length > 0) {
      runes = { keystoneId: pages[0].keystoneId, runeIds: pages[0].runeIds, source: 'qq101' }
    }
    const combos = data.spells(lane, primary.championId)
    if (combos && combos.length > 0) {
      spells = { spellIds: combos[0].spellIds, source: 'qq101' }
    }
  }

  return {
    primary,
    alternates: rest.slice(0, ALTERNATE_COUNT),
    runes,
    spells,
    ruleMode,
  }
}
```

（注意：`FactorWeights` 在实现中并未直接引用——若 typecheck 因 `noUnusedLocals` 报错（当前配置为 false 不报），可删掉该 import。保留 import 亦可。）

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/engine/recommend.test.ts`
Expected: PASS（3 条）

- [ ] **Step 5: 提交**

```bash
git add shared/engine/recommend.ts shared/engine/recommend.test.ts
git commit -m "feat: add rift recommendation orchestrator with rule-mode fallback"
```

---

### Task 13: 大乱斗换/留判定 + 内置符文技能

**Files:**
- Create: `shared/engine/aram.ts`
- Test: `shared/engine/aram.test.ts`

- [ ] **Step 1: 写失败测试 `shared/engine/aram.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { judgeAram } from './aram'
import { createChampionIndex } from '../champions/meta'
import type { EngineData } from './data'
import type { Qq101AramHero } from '../qq101/types'

const INDEX = createChampionIndex([
  { id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 },
  { id: 112, name: '维克托', damageType: 'ap', roles: ['mage'], difficulty: 5 },
  { id: 57, name: '茂凯', damageType: 'ap', roles: ['tank'], difficulty: 3 },
  { id: 711, name: '薇克丝', damageType: 'ap', roles: ['mage'], difficulty: 4 },
])

function aramHero(championId: number, winRate: number): Qq101AramHero {
  return {
    championId, rank: 1, rankChange: '未变化', winRate, pickRate: 0.1,
    bestPartners: [], avgDeathTime: 200, avgParticipation: 0.6, avgDamageRatio: 0.2, avgTankRatio: 0.1,
  }
}

// 强度（50 + (wr-0.5)*500）：84=90, 112=70, 57=50, 711=30
const OVERVIEW = [aramHero(84, 0.58), aramHero(112, 0.54), aramHero(57, 0.50), aramHero(711, 0.46)]

function makeData(overrides: Partial<EngineData> = {}): EngineData {
  return {
    tierList: () => null,
    matchups: () => null,
    synergies: () => null,
    runes: () => null,
    spells: () => null,
    aramOverview: () => OVERVIEW,
    champion: id => INDEX.get(id),
    ...overrides,
  }
}

describe('judgeAram', () => {
  it('备战席明显更强 → 建议换，附着内置符文技能', () => {
    const r = judgeAram({ current: 711, bench: [57, 84], diceLeft: 2 }, makeData())
    expect(r.action).toBe('swap')
    expect(r.swapTo?.championId).toBe(84)
    expect(r.reason).toContain('建议换')
    expect(r.runes).toEqual({
      keystoneId: 8112,
      runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
      source: 'builtin',
    })
    expect(r.spells).toEqual({ spellIds: [4, 32], source: 'builtin' })
  })

  it('当前就是最好的 → 留着', () => {
    const r = judgeAram({ current: 84, bench: [711], diceLeft: 2 }, makeData())
    expect(r.action).toBe('keep')
    expect(r.swapTo).toBeNull()
    expect(r.reason).toContain('留着')
  })

  it('全员弱且有骰子 → 掷骰子', () => {
    const weak = makeData({
      aramOverview: () => [aramHero(84, 0.40), aramHero(711, 0.40)],
    })
    const r = judgeAram({ current: 84, bench: [711], diceLeft: 1 }, weak)
    expect(r.action).toBe('reroll')
    expect(r.reason).toContain('掷骰子')
  })

  it('全员弱但无骰子 → 留着', () => {
    const weak = makeData({
      aramOverview: () => [aramHero(84, 0.40), aramHero(711, 0.40)],
    })
    const r = judgeAram({ current: 84, bench: [711], diceLeft: 0 }, weak)
    expect(r.action).toBe('keep')
  })

  it('无大乱斗榜单数据也能工作（中性强度），符文仍来自内置规则', () => {
    const r = judgeAram({ current: 84, bench: [112], diceLeft: 0 }, makeData({ aramOverview: () => null }))
    expect(r.action).toBe('keep')
    expect(r.runes?.source).toBe('builtin')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/engine/aram.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `shared/engine/aram.ts`**

```ts
// 大乱斗换/留/掷骰子判定：对「当前 + 备战席」用大乱斗权重评分；
// 强度用大乱斗榜的绝对折算（相对百分位在这里没有意义：名次总有人第一）。
import { aramRuleFor } from '../champions/aram-rules'
import { createChampionIndex, type ChampionMeta } from '../champions/meta'
import { ARAM_SWAP_GAP, ARAM_WEAK_SCORE, ARAM_WINRATE_SCALE, WEIGHTS_BY_QUEUE } from './config'
import type { EngineData } from './data'
import { scoreChampion, type FactorOutcome } from './score'
import type { AramJudgeInput, AramJudgeResult, ChampionRecommendation, DraftContext } from './types'

const METRICS_CLAMP = (n: number): number => Math.max(0, Math.min(100, n))

export function scoreAramStrength(championId: number, data: EngineData): FactorOutcome {
  const heroes = data.aramOverview()
  if (!heroes || heroes.length === 0) return { score: null }
  const record = heroes.find(h => h.championId === championId)
  if (!record || record.winRate === null) return { score: null }
  return {
    score: Math.round(METRICS_CLAMP(50 + (record.winRate - 0.5) * ARAM_WINRATE_SCALE) * 10) / 10,
    detail: { kind: 'strength', winRate: record.winRate, tier: '' },
  }
}

export function judgeAram(input: AramJudgeInput, data: EngineData): AramJudgeResult {
  const ctx: DraftContext = {
    queueId: 450,
    allies: (input.allies ?? []).map(championId => ({ championId })),
    enemies: (input.enemies ?? []).map(championId => ({ championId })),
  }
  const weights = WEIGHTS_BY_QUEUE[450]

  const scoreOf = (championId: number): ChampionRecommendation =>
    scoreChampion(championId, ctx, data, {
      modeLabel: '大乱斗',
      weights,
      strengthLane: null,
      pairLane: null,
      strengthOverride: scoreAramStrength(championId, data),
    })

  const current = scoreOf(input.current)
  const bench = input.bench.map(scoreOf).sort((a, b) => b.score - a.score)
  const bestBench = bench[0] ?? null

  let action: AramJudgeResult['action'] = 'keep'
  let swapTo: ChampionRecommendation | null = null

  if (bestBench && bestBench.championId !== input.current && bestBench.score - current.score >= ARAM_SWAP_GAP) {
    action = 'swap'
    swapTo = bestBench
  } else if (input.diceLeft > 0 && Math.max(current.score, bestBench?.score ?? -1) < ARAM_WEAK_SCORE) {
    action = 'reroll'
  }

  const chosenId = action === 'swap' && swapTo ? swapTo.championId : input.current
  const index = createChampionIndex(
    [input.current, ...input.bench]
      .map(id => data.champion(id))
      .filter((m): m is ChampionMeta => m !== null),
  )
  const rule = aramRuleFor(chosenId, index)

  const nameOf = (id: number): string => data.champion(id)?.name ?? `英雄${id}`
  const reason =
    action === 'swap' && swapTo
      ? `建议换 ${nameOf(swapTo.championId)}：${swapTo.reason}`
      : action === 'reroll'
        ? '手里英雄都不强，建议掷骰子'
        : `留着 ${nameOf(current.championId)}：手里最好`

  return {
    action,
    current,
    bench,
    swapTo,
    reason,
    runes: { keystoneId: rule.keystoneId, runeIds: [...rule.runeIds], source: 'builtin' },
    spells: { spellIds: [...rule.spellIds] as [number, number], source: 'builtin' },
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/engine/aram.test.ts`
Expected: PASS（5 条）

Run: `npm run test && npm run typecheck`
Expected: 全量 PASS、0 错误。

- [ ] **Step 5: 提交**

```bash
git add shared/engine/aram.ts shared/engine/aram.test.ts
git commit -m "feat: add aram keep/swap/reroll judge with builtin rune rules"
```

---

### Task 14: 演示英雄字典 + 推荐 CLI（冒烟产物）

**Files:**
- Create: `scripts/demo-meta.ts`
- Create: `scripts/recommend-cli.ts`

- [ ] **Step 1: 写 `scripts/demo-meta.ts`**

（Phase 3 接入 LCU 资源接口后废弃；数值仅用于演示，难度取官方 1-10 近似值。）

```ts
// 演示用英雄元数据（Phase 3 由 LCU 资源接口替换）。
import type { ChampionMeta } from '../shared/champions/meta'

export const DEMO_META: ChampionMeta[] = [
  { id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 },
  { id: 112, name: '维克托', damageType: 'ap', roles: ['mage'], difficulty: 5 },
  { id: 711, name: '薇克丝', damageType: 'ap', roles: ['mage'], difficulty: 4 },
  { id: 101, name: '泽拉斯', damageType: 'ap', roles: ['mage'], difficulty: 5 },
  { id: 105, name: '菲兹', damageType: 'ap', roles: ['assassin'], difficulty: 6 },
  { id: 57, name: '茂凯', damageType: 'ap', roles: ['tank'], difficulty: 3 },
  { id: 111, name: '诺提勒斯', damageType: 'ap', roles: ['tank', 'support'], difficulty: 3 },
  { id: 122, name: '德莱厄斯', damageType: 'ad', roles: ['fighter'], difficulty: 6 },
  { id: 86, name: '盖伦', damageType: 'ad', roles: ['fighter', 'tank'], difficulty: 3 },
  { id: 64, name: '李青', damageType: 'ad', roles: ['fighter'], difficulty: 9 },
  { id: 81, name: '伊泽瑞尔', damageType: 'ad', roles: ['marksman'], difficulty: 5 },
  { id: 22, name: '艾希', damageType: 'ad', roles: ['marksman'], difficulty: 4 },
  { id: 117, name: '璐璐', damageType: 'ap', roles: ['support'], difficulty: 4 },
  { id: 412, name: '锤石', damageType: 'ad', roles: ['support', 'tank'], difficulty: 8 },
  { id: 99, name: '拉克丝', damageType: 'ap', roles: ['mage', 'support'], difficulty: 4 },
  { id: 90, name: '玛尔扎哈', damageType: 'ap', roles: ['mage'], difficulty: 3 },
  { id: 3, name: '加里奥', damageType: 'ap', roles: ['tank', 'mage'], difficulty: 4 },
  { id: 876, name: '莉莉娅', damageType: 'ap', roles: ['fighter'], difficulty: 6 },
]
```

- [ ] **Step 2: 写 `scripts/recommend-cli.ts`**

```ts
// 推荐引擎冒烟：用 ./data 数据仓 + 演示英雄字典跑两个场景。
// 用法：npx tsx scripts/recommend-cli.ts --root ./data rift
//       npx tsx scripts/recommend-cli.ts --root ./data aram
import { readFileSync } from 'node:fs'
import { createWarehouse } from '../shared/warehouse/store'
import { createEngineData, type EngineData } from '../shared/engine/data'
import { createChampionIndex } from '../shared/champions/meta'
import { recommendRift } from '../shared/engine/recommend'
import { judgeAram } from '../shared/engine/aram'
import { parseQq101AramOverview } from '../shared/qq101/parse'
import { DEMO_META } from './demo-meta'
import type { DraftContext } from '../shared/engine/types'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const root = arg('root') ?? './data'
const scenario = process.argv.includes('aram') ? 'aram' : 'rift'

const warehouse = createWarehouse(root)
const index = createChampionIndex(DEMO_META)
let data: EngineData = createEngineData(warehouse, index)

if (scenario === 'aram' && data.aramOverview() === null) {
  // ./data 尚无大乱斗总览（等允许窗口补同步）时，退回已入库的侦察样本
  const sample = JSON.parse(readFileSync('shared/qq101/fixtures/recon-aram-hero-overview-20261008.json', 'utf-8'))
  const heroes = parseQq101AramOverview(sample)
  data = { ...data, aramOverview: () => heroes }
  console.log('[cli] 提示：数据仓无大乱斗总览，使用侦察样本代替')
}

if (scenario === 'rift') {
  const ctx: DraftContext = {
    queueId: 420,
    myPosition: 'mid',
    allies: [
      { championId: 111, position: 'utility' },
      { championId: 64, position: 'jungle' },
    ],
    enemies: [
      { championId: 112, position: 'mid' },
      { championId: 86, position: 'top' },
      { championId: 81, position: 'bot' },
      { championId: 117, position: 'utility' },
    ],
    bans: [105],
  }
  const advice = recommendRift(ctx, data)
  if (advice.ruleMode) console.log('[cli] 提示：数据仓榜单缺失，规则模式输出')
  console.log('=== 排位·中单 推荐 ===')
  console.log(JSON.stringify(advice, null, 2))
} else {
  const result = judgeAram({
    current: 711,
    bench: [84, 57, 22],
    diceLeft: 2,
    allies: [90, 111, 22, 412],
    enemies: [105, 64],
  }, data)
  console.log('=== 大乱斗 换/留 判定 ===')
  console.log(JSON.stringify(result, null, 2))
}
```

- [ ] **Step 3: 冒烟运行（离线，随时可跑）**

Run: `npx tsx scripts/recommend-cli.ts --root ./data rift`
Expected: 输出 JSON；`primary` 含 `championId / score / reason`；当前 `./data` 数据部分缺失时 `partialData: true` 属预期。

Run: `npx tsx scripts/recommend-cli.ts --root ./data aram`
Expected: 输出判定 JSON（`action` ∈ keep/swap/reroll，`runes.source = "builtin"`），若数据仓无大乱斗数据会先打印「使用侦察样本代替」。

若 rift 场景抛「候选池为空」：检查 `./data/qq101/16.19/tier-MIDDLE.json` 是否存在（Phase 1 冒烟已写入；若 `./data` 被清空，可在允许窗口重跑 `npm run sync -- --root ./data --lanes MIDDLE --limit 3`）。

- [ ] **Step 4: typecheck + 全量测试**

Run: `npm run typecheck && npm run test`
Expected: 0 错误、全部 PASS。

- [ ] **Step 5: 提交**

```bash
git add scripts/demo-meta.ts scripts/recommend-cli.ts
git commit -m "feat: add recommend cli smoke with demo champion metadata"
```

---

### Task 15: 全量同步补齐（仅允许时段；可选但建议）

**背景：** Phase 1 全量同步曾触发 WAF（501），`./data` 仅有部分数据；新增符文/技能/大乱斗摄入后全量约 1.4k 请求（每位置英雄 ≈ 236 英雄位 × 4 类 + 榜单 6 + 大乱斗 1）。**执行前提：探活通过。**

- [ ] **Step 1: 探活（仅允许时段）**

Run: `date '+%Y-%m-%d %H:%M %A'`
不在允许窗口 → 跳过本任务，留给下个窗口。

```bash
curl -s -o /dev/null -w '%{http_code}\n' --max-time 15 'https://mlol.qt.qq.com/go/database/versionlist?zone=lol&from=h5'
```

Expected: `200`。若为 `501`（WAF 未解禁）→ **停止本任务**，下个允许窗口再来。

- [ ] **Step 2: 分位置分批同步（保守节奏）**

```bash
npm run sync -- --root ./data --lanes MIDDLE,TOP --interval 800 --concurrency 2
```

Expected: `status` 为 `synced` 或 `partial`；单批约 4–6 分钟。若触发熔断（大量连续失败）→ 立即停止，改日再试。

- [ ] **Step 3: 剩余位置**

```bash
npm run sync -- --root ./data --lanes JUNGLE,BOTTOM,SUPPORT --interval 800 --concurrency 2
```

- [ ] **Step 4: 用真实数据重跑 CLI 冒烟**

Run: `npx tsx scripts/recommend-cli.ts --root ./data rift` 与 `npx tsx scripts/recommend-cli.ts --root ./data aram`
Expected: `partialData` 覆盖面显著改善；大乱斗不再提示「使用侦察样本」。

（`./data` 为 git 忽略目录，本任务无提交。）

---

## 完成后状态（Phase 2 交付物）

- 摄入扩展：符文页/召唤师技能/大乱斗总览的端点到入库全链路（解析、客户端、数据仓、同步器，全部有单测）；同步器新增 ALL 榜单抓取
- 引擎：`shared/engine/`（types/config/data/candidates/reasons/score/recommend/aram）——纯函数、可离线测试；420/440/400/430 评分 + 大乱斗换留判定 + 中文理由 + 规则模式降级
- 大乱斗内置规则表（符文 id 来自真实采集，样本入库 `recon-rule-*`）
- `scripts/recommend-cli.ts`：离线冒烟入口
- 遗留：`./data` 全量数据补齐视 WAF 解禁情况（Task 15）；Phase 3（LCU 集成、小窗 UI、打包）另行立项

## 风险与注意

- **WAF**：任何联网任务先探活；被拦即停，绝不重试轰炸。CLI 默认 500ms/并发 3，全量建议 800ms/并发 2。
- **两套强度口径**：峡谷用 `scoreStrength`（同位置内百分位）；大乱斗用 `scoreAramStrength`（对 50% 胜率的绝对折算）——别混用。
- **大乱斗的比率不是百分比**：`parseQq101AramOverview` 直接 `toNumber`（0-1 小数），区别于梯队/符文/技能的「0-100 字符串 → percentToRatio」。
- **规则表维护**：`ARAM_RULES` 的 9 个符文 id 来自采集样本；若 101 改版，重跑 Task 6 Step 1-2 更新。
