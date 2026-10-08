# QQ101 端点侦察（2026-10-08）

- 侦察时间窗：2026-10-08 12:35 – 13:17（允许窗口内）
- 方法：抓 101 前端资源 → grep 端点字符串 → curl 线上试探（约 24 次请求）→ 用 node 对照解码
- 前端资源（供复查）：`https://lol.qq.com/lolstrategy/assets/20260924/` 下
  - `strategy-Cg1Sb-c9.js`（主 bundle：端点包装 + 解析器都在这里）
  - `HeroDetailView-BLPG2EnO.js`（英雄详情页：符文/技能/加点/出装等调用点）
  - `AramRankView-BHdoxYNc.js`（大乱斗榜）、`ClassicRankView-BrwMEq6a.js`（峡谷榜）
- 关键技巧：解析器属性名（如 `rune_top_details`、`lowest_rank_runes`）在混淆后保留，可 grep 直达语义。

## 结论表

| 用途 | URL 模板 | 关键参数 | 样本文件 | 字段语义 |
|---|---|---|---|---|
| 符文推荐（按英雄） | `https://mlol.qt.qq.com/go/battle_info/odp_proxy/lol_101strategy_runeinfo` | `itier=255`、`version_id`、`lane`、`championid` | `recon-runeinfo-84-mid-20261008.json` | 见下「runeinfo」 |
| 召唤师技能（按英雄） | `.../lol_101strategy_skill` | 同上 | `recon-skill-84-mid-20261008.json` | 见下「skill」 |
| 技能加点（按英雄） | `.../lol_101strategy_skill_point` | 同上 | `recon-skillpoint-84-mid-20261008.json` | 见下「skill_point」 |
| 大乱斗英雄总览 | `.../aram_hero_overview` | `dtstatdate=YYYYMMDD`（必填；官方页面取「昨天」） | `recon-aram-hero-overview-20261008.json`（dtstatdate=20261007） | 见下「ARAM」 |
| 峡谷英雄榜（jade） | `.../jade_hero_rank` | `lane`、`itier`、`day`（可省略但会空） | —（线上试探均返回空，未解） | 未解 |
| 英雄分路字典 | `.../jade_hero_lane` | `itype=255` | —（未采样；小数据，用时再抓） | `hero_lane_list`：`60xxx_lane;lane#…`（60xxx = 60 前缀 + 英雄 id） |

其它已发现但未采样端点：`lol_101strategy`（梯度榜）、`_confront`（对位）、`_partner`（协同）、`_build`（出装）、`_trend`（走势）、`_duration`、`_segment`、`_jungle`、`_newlane`；`/go/database/{versionlist,versioninfo,versiondetail,hero_version_update}`；`/go/zone/build_block`。

**通用响应外层**：`{"code":0,"data":{"_fieldValues":{"R<数字>": "<JSON字符串"}}, "result": "<同上>"}`。`R<数字>` 为后端报告 id（同一端点跨请求稳定、与参数无关），解析时取 `_fieldValues` 第一个 value 或 `result` 即可（现有 `extractQq101Inner` 已覆盖）。

## 字段语义（按前端解析器逐字核对）

### runeinfo（`_fieldValues.<R…>` → JSON，键：`dtstatdate` / `rune_top_details` / `rune_single_details`）

`rune_top_details`：`#` 分隔记录，`_` 分隔字段，每条 = 一个符文页模板（英雄 84 中路实测 12 条）：

| 段 | 含义 | 例 |
|---|---|---|
| c0 | 榜单序号（1 = 使用最多；**响应内乱序**，前端按序号排序） | `1` |
| c1 | 基石符文 id | `8112`（电刑） |
| c2 | 副系 code：`jm`=精密 `zj`/`zz`=主宰 `ws`=巫术 `jj`=坚决 `qd`=启迪 | `jj` |
| c3 | 9 个符文 id（csv）：主系 4 + 副系 2 + 属性碎片 3（按序） | `8112,8143,8137,8106,8451,8473,5008,5008,5001` |
| c4 | 选取率 %（字符串） | `44.15` |
| c5 | 胜率 %（字符串） | `47.82` |
| c6 | 场次 | `154640` |

`rune_single_details`：`#` 记录，`_` 字段：`基石id_副系code_单个符文id_选取%_胜率%_场次_位置`（供符文页内单符文细分，Phase 2 可缓做）。

### skill（`data_details`）

- `#` 分隔记录：`技能1id_技能2id_胜率%_登场率%`（百分比为 0-100 字符串）
- 技能 id = 召唤师技能官方 id：`4`=闪现 `12`=传送 `14`=点燃 `11`=惩戒 等
- 前端把闪现（4）**归一化到第 2 位**，并按登场率降序（84 中路实测：点燃+闪现 48.77%/90.6%；传送+闪现 46.77%/8.47%）

### skill_point（`detaildetails`）

`$` 分隔「加点优先级分组」，组内 `@` 分隔记录；每组头 `主优序:使用率%:胜率%`，其后每条为 `15级加点序列_使用率%_胜率%`（序列为 1/2/3/4，4=大招）：

```
1,3,2:96.25:56.3@1,2,3,1,1,4,1,3,1,3,4,3,3,2,2_64.32_56.79@…$1,2,3:3.41:52.96@…
```

### ARAM：aram_hero_overview（`listcollect`）

- `#`（兼容 `|`）分隔记录，`_` 分隔字段；**现行 10 字段**（s0–s9），2026-10-07 采集的 `fuwen-aram-rank-20261007.json` 为 11 字段（多 s10，见「未解决」）
- s0 英雄 id、s1 排名、s2 名次变化描述（如 `未变化`）
- s3 胜率（0–1 小数）、s4 出场率（0–1 小数）
- s5 最佳搭档 top50：`champId,选取率(0-1),胜率(0-1),rank&…`
- s6 平均死亡时间（秒）、s7 平均参团率（0-1）、s8 平均伤害占比（0-1）、s9 平均承伤占比（0-1）
- 内容为「前一天」数据；实测 173 条记录，英雄顺序按排名。

## 未解决 / 下个窗口继续

- **WAF 限流（2026-10-08 实测）**：全量同步突发 ~1.7k 请求后，腾讯 WAF 开始返回 HTTP 501 封禁页（HTML 跳 `waf.tencent.com/501page.html`），此后全部端点（含 versionlist）均被拦；冷却时长未知。防护已入代码：同步器按「各位置榜单英雄」取对位/协同（负载约 478 请求）、连续失败熔断（默认 8 次）、CLI 默认 500ms 间隔 + 并发 3。被 WAF 拦时客户端把 HTML 响应按失败计数（解析不出 JSON 即 null）；禁区内不要反复探测，等下一个允许窗口先单发一次 versionlist 探活再全量。
- `fuwen-aram-rank-20261007.json` 的第 11 字段（s10，如 `2062,1004,1048`）：前端解析器命名为 `lowest_rank_runes`（疑似「垫底符文」id 列表），但 2026-10-08 线上所有尝试（含 dtstatdate=20261006/20261007、itier 变体）均只返回 10 字段；该解析器（parseHeroRank）在现行前端无消费方 → 判定为旧后端遗留，语义未证实。Phase 2 使用该 fixture 时**只取 s0–s9**。
- `jade_hero_rank`（峡谷英雄榜）：`lane=ALL/ARAM + itier=255 (+day)` 均返回空，未解；不影响 Phase 1/2 范围。
- **ARAM 无按英雄的符文/技能/加点端点**：英雄详情页只支持 `rift`/`hextech` 两种模式（前端模式归一化含 aram/arena，但无对应数据调用）。Phase 2 大乱斗的「天赋/技能建议」需自研规则（基于英雄定位 + ARAM 榜单统计），或后续另找数据源。
