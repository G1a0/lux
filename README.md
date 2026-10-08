# Lux

面向英雄联盟新手（游戏理解较浅的玩家）的**选人阶段助手**，基于 [101.qq.com](https://101.qq.com)（腾讯官方数据站）的国服数据。独立桌面应用形态：自动读取客户端（LCU）中的对局信息，给出「选什么英雄 / 带什么天赋与召唤师技能」的即时建议。

支持模式：匹配、排位、极地大乱斗（开发中）；云顶、海克斯大乱斗待开发。

## 当前状态

**Phase 2（摄入 + 推荐引擎）已完成。**

- `shared/positions` —— 位置（上野中下辅）映射与常量
- `shared/timegate` —— API 时段硬约束（工作日 9–12、14–18 点禁止一切外部请求，含开发调试）
- `shared/qq101/` —— 101 数据源：解析、端点、Node 客户端、同步器；符文/召唤师技能/大乱斗总览的抓取解析入库；`recon-notes.md` 记录符文/技能/大乱斗端点的侦察结论
- `shared/warehouse/` —— 本地数据仓（JSON 快照）
- `shared/engine/` —— 推荐引擎：排位/征召/盲选五因素评分 + 中文理由 + 大乱斗换/留/掷骰子判定 + 内置大乱斗规则表 + 规则模式降级
- `scripts/sync-cli.ts`、`scripts/recommend-cli.ts` —— 数据同步（禁窗拒绝出网）与推荐引擎离线冒烟 CLI

Phase 3 待写：LCU 集成、置顶小窗 UI、打包分发。

## 开发

```bash
npm install        # 安装依赖
npm run test       # 跑单元测试（vitest）
npm run typecheck  # 类型检查
npm run sync       # 同步 101 数据到本地仓 ./data（仅允许窗口：工作日 12-14 点、18 点后、周末）
npx tsx scripts/recommend-cli.ts --root ./data rift   # 推荐引擎离线冒烟（rift|aram）
```

> ⚠️ 硬约束：工作日 09:00–12:00 与 14:00–18:00 不得调用任何外部 API（运行时与开发调试均是）。同步器与客户端均已内置时段门控。

## 文档

- 设计规格：`docs/superpowers/specs/2026-10-08-lux-v2-standalone-design.md`
- Phase 1 实施计划：`docs/superpowers/plans/2026-10-08-lux-v2-phase1-data-layer-plan.md`
- Phase 2 实施计划：`docs/superpowers/plans/2026-10-08-lux-v2-phase2-engine-plan.md`
- 端点侦察笔记：`shared/qq101/recon-notes.md`

## 许可

AGPL-3.0
