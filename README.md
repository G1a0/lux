# Lux

面向英雄联盟新手（游戏理解较浅的玩家）的**选人阶段助手**，基于 [101.qq.com](https://101.qq.com)（腾讯官方数据站）的国服数据。独立桌面应用形态：自动读取客户端（LCU）中的对局信息，给出「选什么英雄 / 带什么天赋与召唤师技能」的即时建议。

支持模式：匹配、排位、极地大乱斗；云顶、海克斯大乱斗待开发。

## 当前状态

**v1 完成：Electron 独立应用（置顶小窗四状态、托盘、设置、首启引导）+ 数据层/引擎/LCU 集成 + NSIS 安装包（`release/Lux-Setup-0.3.0.exe`）。**

Phase 3B（Electron 壳 + 置顶小窗 UI + 打包分发）已完成：

- 置顶小窗四状态 —— 主面板（主推 + 理由 + 符文/技能 + 一键应用）/ 展开详情 / 大乱斗面板 / 收起药丸；位置记忆与贴边、离开选人自动隐藏
- 托盘（显示 / 设置 / 退出）、设置页（候选池与模式开关、同步状态、手动同步、关于/免责声明）、首启引导页
- 引擎与 LCU 集成全链路接入 main 进程（异步 compute、owned/熟练度缓存、自动同步 + 3 小时轮询）
- NSIS 安装包 `Lux-Setup-0.3.0.exe`（双击安装/卸载；未签名，见「安装与使用」）

Phase 2（摄入 + 推荐引擎）已完成。

- `shared/positions` —— 位置（上野中下辅）映射与常量
- `shared/timegate` —— API 时段硬约束（工作日 9–12、14–18 点禁止一切外部请求，含开发调试）
- `shared/qq101/` —— 101 数据源：解析、端点、Node 客户端、同步器；符文/召唤师技能/大乱斗总览的抓取解析入库；`recon-notes.md` 记录符文/技能/大乱斗端点的侦察结论
- `shared/warehouse/` —— 本地数据仓（JSON 快照）
- `shared/engine/` —— 推荐引擎：排位/征召/盲选五因素评分 + 中文理由 + 大乱斗换/留/掷骰子判定 + 内置大乱斗规则表 + 规则模式降级
- `scripts/sync-cli.ts`、`scripts/recommend-cli.ts` —— 数据同步（禁窗拒绝出网）与推荐引擎离线冒烟 CLI

Phase 3A（LCU 集成核心）已完成。

- `shared/lcu/` —— lockfile 发现、REST/事件通道（WAMP）、会话读取、英雄资源适配、会话→引擎映射、符文/技能写入、`LcuAdvisor` 编排
- Mock LCU（`shared/lcu/mock/`）—— 场景化 HTTPS+WSS 回放，测试与 dev CLI 的全量离线验收载体
- `scripts/lux-dev-cli.ts` —— LCU 核心离线冒烟 CLI（Mock 驱动），可演示符文/技能写入

真机联调待用户开客户端时进行。

## 安装与使用

- Windows 上双击 `release/Lux-Setup-0.3.0.exe` 安装。安装包未签名，SmartScreen 可能拦截：点「更多信息」→「仍要运行」即可。
- 首次使用建议在允许时段（工作日 12–14 点、18 点后、周末）打开应用，等待数据同步完成后再进选人。
- 一键应用符文/召唤师技能只写入 `Lux·` 前缀的符文页，不会删除或覆盖你自己新建的符文页。

## 开发

```bash
npm install        # 安装依赖
npm run dev        # 启动开发模式（electron-vite dev）
npm run test       # 跑单元测试（vitest）
npm run typecheck  # 类型检查
npm run build      # 构建（electron-vite build，输出 out/）
npm run dist       # 构建 + 打 Windows NSIS 安装包（见「构建备注（Linux）」）
npm run sync       # 同步 101 数据到本地仓 ./data（仅允许窗口：工作日 12-14 点、18 点后、周末）
npx tsx scripts/recommend-cli.ts --root ./data rift   # 推荐引擎离线冒烟（rift|aram）
npx tsx scripts/lux-dev-cli.ts --scenario draft --root ./data   # LCU 核心冒烟（Mock）
npx tsx scripts/lux-dev-cli.ts --scenario aram --root ./data --apply  # 含符文/技能写入演示
```

> ⚠️ 硬约束：工作日 09:00–12:00 与 14:00–18:00 不得调用任何外部 API（运行时与开发调试均是）。同步器与客户端均已内置时段门控。

## 构建备注（Linux）

本机 Ubuntu 自带的 wine 打包源已损坏，本次 NSIS 构建使用了临时解包的 Arch wine 11.19（位于 `/tmp`，未入库）。后续在 Linux/CI 重建安装包需自备可用的 wine，或在 Windows 上执行 `npm run dist`。

## 文档

- 设计规格：`docs/superpowers/specs/2026-10-08-lux-v2-standalone-design.md`
- Phase 1 实施计划：`docs/superpowers/plans/2026-10-08-lux-v2-phase1-data-layer-plan.md`
- Phase 2 实施计划：`docs/superpowers/plans/2026-10-08-lux-v2-phase2-engine-plan.md`
- Phase 3A 实施计划：`docs/superpowers/plans/2026-10-08-lux-v2-phase3a-lcu-core-plan.md`
- Phase 3B 实施计划：`docs/superpowers/plans/2026-10-09-lux-v2-phase3b-app-plan.md`
- 端点侦察笔记：`shared/qq101/recon-notes.md`

## 许可

AGPL-3.0
