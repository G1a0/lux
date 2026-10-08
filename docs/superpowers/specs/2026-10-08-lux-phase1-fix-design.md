# Lux Phase 1 修复 — 设计文档

日期：2026-10-08
状态：已批准（用户确认"开工"）

## 背景与问题

Phase 1 推荐功能在游戏内不可用（提交 fe13c8d："当前仅支持排位/匹配，而且功能也有问题"）。经排查（含实测），根因有四个：

1. **OP.GG 接口全部失效**：`lol-api-champion.op.gg/champions/{id}/counters?region=cn` 实测 HTTP 404；`region=cn` 实测 HTTP 422（OP.GG 无国服区）。所有外部数据静默为空 → 全中性分。
2. **LCU 事件形状处理错误**：Pengu 官方文档规定 `socket.observe` 的 listener 收到 `{ data, uri, eventType }`。工作区未提交的改动把回调参数当裸数据用，导致 `session.myTeam` 不存在、推荐从不渲染。
3. **同会话只算一次**：`champion-recommendation.ts` 里 `cache.sessionId === session.id` 提前 return，双方选人变化后分数永远不更新。
4. **英雄数据只有 3 个测试英雄**：面板里绝大多数英雄显示"英雄 #ID"，伤害类型默认 AD，位置分组为空。

## 数据源决策（实测依据）

- **弃用 OP.GG**：无国服数据，接口形态已失效。
- **采用 101.qq.com（腾讯官方，`mlol.qt.qq.com`）**：实测可用，国服数据（数据日期 2026-10-07），覆盖：
  - 版本列表 `/go/database/versionlist?zone=lol&from=h5` → `{"code":0,"data":[{"id":"228","name":"16.19",...}]}`
  - tier 榜 `/go/battle_info/odp_proxy/lol_101strategy?itier=255&version_id={patch}&lane=ALL&sort_metric=1&sort_order=2` → 记录格式 `rank_championId_strengthTier_position_winRate_pickRate_banRate_counterIds_rankChange`（`#` 分隔记录、`_` 分隔字段，百分比为 0-100）
  - 对位 `..._confront?itier=255&version_id={patch}&lane={LANE}&championid={id}` → `high_op_details`（优势对局）/`low_op_details`（劣势对局），格式 `序号_championId_胜率_差值`，各 5 条；**lane 必须是 TOP/JUNGLE/MIDDLE/BOTTOM/SUPPORT，ALL 实测为空**
  - 协同 `..._partner?itier=255&version_id={patch}&lane={LANE}&championid={id}` → `data_details` 格式 `序号_championId_胜率_场次`，约 3 条
  - 响应外层 `{code, data: {result: "<JSON 字符串>"}}`，`code !== 0` 视为失败
- **英雄元数据用客户端自带资源**（无需联网、新英雄自动有数据）：
  - `/lol-game-data/assets/v1/champion-summary.json`（全英雄 id → 中文名/alias）
  - `/lol-game-data/assets/v1/champions/{id}.json` → `tacticalInfo.damageType`（`kDamageTypePhysical` → ad / `kDamageTypeMagic` → ap / `kDamageTypeMixed` → mixed）
- **位置表**来自 tier 榜记录（id → 出现过的位置集合），`/lol-perks/v1/recommended-champion-positions` 仅作兜底（形状未验证）。

## 数据流

```
LCU 事件 {data, uri, eventType} / 插件启动时 GET /lol-champ-select/v1/session
  → 会话解析（位置归一化：middle→mid、bottom→bot；utility→utility）
  → SR 队列白名单 {400,420,430,480,440}，其他队列不启用
  → 候选集 = pickable-champion-ids ∩ QQ101 该位置 tier 榜
      （无分配位置时 = pickable ∩ 全位置榜；对位/协同记中性）
  → 数据获取（并发≤5、3s 超时、AbortController、会话级缓存）：
      patch（DataStore 缓存 12h）
      tier 榜（每会话一次）
      对位（仅敌方有已选人时，逐候选英雄）
      协同（仅己方有已选人时，逐候选英雄）
      英雄元数据（DataStore 按 patch 缓存）
  → scorer（synergy 35% + counter 35% + meta 20% + balance 10%）
  → UI（角标 + 面板，头部显示数据日期）
```

## 模块改动

| 文件 | 改动 |
|---|---|
| `src/lib/lcu.ts` | 事件回调恢复为 `(message: LCUEventMessage)`（`{data,uri,eventType}`，符合 Pengu 文档） |
| `src/lib/features/champion-recommendation.ts` | `message.data` 取会话；`Delete`/null → 清空 UI 与缓存；**每次会话事件都重算**；启动时 GET 一次当前会话；SR 队列白名单；接入 QQ101 |
| `src/lib/qq101.ts`（新） | 版本/tier/对位/协同 客户端 + 纯解析函数；位置映射 |
| `src/lib/champion-data.ts`（新） | 英雄名/伤害类型运行时加载 + DataStore 缓存 + 同步查询接口 |
| `src/lib/scorer.ts` | 类型改名（`CounterStats`/`SynergyStats`/`ChampionTier`）；meta 分按强度档映射（T0→100、T1→90、T2→78、T3→62、T4→48，未知 50，可与胜率组合）；`useOpgg` → `dataSource: 'qq101' \| 'local'`；mixed 伤害在平衡分中各计 0.5 |
| `src/components/RecommendationPanel.tsx` | 名字/位置/伤害类型走新数据源；显示数据日期 |
| `src/types/champion.ts` | 改为运行时元数据类型 |
| 删除 | `src/lib/opgg-api.ts`、`src/data/champion-meta.json`、`scripts/import-champion-meta.ts`；位置标签常量移入代码 |
| `src/data/local-rules.json` | 保留为离线降级（空规则 → 全中性） |

## 降级与错误处理

- tier 榜失败 → `dataSource: 'local'` + "(本地数据)"角标，全中性，不假装有数据。
- 单个候选英雄请求失败 → 该英雄该维度中性 50，不影响整体。
- 会话切换/结束：AbortController 取消在途请求 + 代数号（generation）丢弃过期结果。
- 请求预算：一次选人 ≈ 1 版本 + 1 tier + 候选(≤20)×2 ≈ 42 请求，并发 5。

## 测试与验证

- 新增 vitest（node 环境，`@` alias）：QQ101 解析器用**真实响应 fixtures**（captured 2026-10-08）、位置映射、scorer、会话事件处理、缓存逻辑；mock fetch/DataStore。
- `npm run build`（tsc + vite）必须通过。
- 游戏内人工验收清单：
  1. 进排位 BP → 面板出现、英雄名为中文、分数非全 50；
  2. 敌方选人后分数变化（同会话重算）；
  3. BP 结束/离开 → 角标与面板清空；
  4. 断网或接口失败 → "(本地数据)"。

## 已知限制与风险

- QQ101 对位/协同覆盖率有限（每英雄各 5/3 条），未覆盖组合记中性。
- 匹配盲选/无位置场景：对位、协同不可用（lane=ALL 无数据），只用 tier + balance，推荐质量较弱。
- 客户端内 fetch 外部域名依赖 CORS：实测响应反射 `Origin` 头，预计可用，需游戏内确认。
- 匹配模式使用排位数据近似（UI 显示数据日期）。

## 参考

- LeagueAkari（github.com/LeagueAkari/LeagueAkari，MIT）：LCU 事件分发、101.qq.com 接口路径与数据格式结论；（本项目解析器为自行实现，未复制其代码）
