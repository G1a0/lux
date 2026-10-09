# Lux

面向英雄联盟新手（游戏理解较浅的玩家）的**选人阶段助手**，基于 [101.qq.com](https://101.qq.com)（腾讯官方数据站）的国服数据。独立桌面应用形态：自动读取客户端（LCU）中的对局信息，给出「选什么英雄 / 带什么天赋与召唤师技能」的即时建议。

支持模式：匹配、排位、极地大乱斗；云顶、海克斯大乱斗待开发。

## 当前状态

**v1 完成：Electron 独立应用（置顶小窗四状态、托盘、设置、首启引导）+ 数据层/引擎/LCU 集成 + NSIS 安装包（`release/Lux-Setup-0.3.8.exe`）。**

Phase 3B（Electron 壳 + 置顶小窗 UI + 打包分发）已完成：

- 置顶小窗四状态 —— 主面板（主推 + 理由 + 符文/技能 + 一键应用）/ 展开详情 / 大乱斗面板 / 收起药丸；位置记忆与贴边、离开选人自动隐藏
- 托盘（显示 / 设置 / 退出）、设置页（候选池与模式开关、同步状态、手动同步、关于/免责声明）、首启引导页
- 引擎与 LCU 集成全链路接入 main 进程（异步 compute、owned/熟练度缓存、自动同步 + 3 小时轮询）
- NSIS 安装包 `Lux-Setup-0.3.8.exe`（双击安装/卸载；未签名，见「安装与使用」）

Phase 2（摄入 + 推荐引擎）已完成。

- `shared/positions` —— 位置（上野中下辅）映射与常量
- `shared/timegate` —— 开发工具时段门禁（工作日 9–12、14–18 点禁止 CLI 同步/抓样本等开发请求；应用运行时不受限，见下）
- `shared/qq101/` —— 101 数据源：解析、端点、Node 客户端、同步器；符文/召唤师技能/大乱斗总览的抓取解析入库；`recon-notes.md` 记录符文/技能/大乱斗端点的侦察结论
- `shared/warehouse/` —— 本地数据仓（JSON 快照）
- `shared/engine/` —— 推荐引擎：排位/征召/盲选五因素评分 + 中文理由 + 大乱斗换/留/掷骰子判定 + 内置大乱斗规则表 + 规则模式降级
- `scripts/sync-cli.ts`、`scripts/recommend-cli.ts` —— 数据同步（禁窗拒绝出网）与推荐引擎离线冒烟 CLI

Phase 3A（LCU 集成核心）已完成。

- `shared/lcu/` —— lockfile 发现（国服客户端 lockfile 不含凭据时，改从运行中的客户端进程命令行提取 `--app-port`/`--remoting-auth-token` 连接参数）、REST/事件通道（WAMP）、会话读取、英雄资源适配、会话→引擎映射、符文/技能写入、`LcuAdvisor` 编排
- Mock LCU（`shared/lcu/mock/`）—— 场景化 HTTPS+WSS 回放，测试与 dev CLI 的全量离线验收载体
- `scripts/lux-dev-cli.ts` —— LCU 核心离线冒烟 CLI（Mock 驱动），可演示符文/技能写入

真机联调待用户开客户端时进行。

## 安装与使用

- Windows 上双击 `release/Lux-Setup-0.3.8.exe` 安装。安装时可**选择安装目录**（向导模式；默认装到用户目录，改到 Program Files 时数据会自动回退到 AppData——不推荐改到需要管理员权限的目录）。安装包未签名，SmartScreen 可能拦截：点「更多信息」→「仍要运行」即可。
- 首次打开会自动同步数据（也可在设置页手动同步）；**随时可用，无需避开任何时段**。等待数据同步完成后再进选人即可。
- 一键应用符文/召唤师技能只写入 `Lux·` 前缀的符文页，不会删除或覆盖你自己新建的符文页。
- **数据位置**：`<安装目录>\data\`（可直接打开查看/备份；选择的目录不可写时自动回退 `%APPDATA%\Lux\data`）。
- **数据分发/更新**：安装包内置一份数据快照（首启零等待）；要给多台机器更新数据，无需各自从 101 拉取——把一台机器同步好的 `<安装目录>\data` 整个拷过去替换即可（或重新打包 installer）。
- 卸载注意：数据随安装目录一起删除，卸载前先备份 `data` 文件夹。

## 开发

```bash
npm install        # 安装依赖
npm run dev        # 启动开发模式（electron-vite dev）
npm run test       # 跑单元测试（vitest）
npm run typecheck  # 类型检查
npm run build      # 构建（electron-vite build，输出 out/）
npm run dist       # 构建 + 打 Windows NSIS 安装包（见「构建备注（Linux）」）
npm run sync       # 同步 101 数据到本地仓 ./data（开发工具：工作日 9-12、14-18 禁窗）
npx tsx scripts/recommend-cli.ts --root ./data rift   # 推荐引擎离线冒烟（rift|aram）
npx tsx scripts/lux-dev-cli.ts --scenario draft --root ./data   # LCU 核心冒烟（Mock）
npx tsx scripts/lux-dev-cli.ts --scenario aram --root ./data --apply  # 含符文/技能写入演示
```

> ⚠️ 硬约束：开发工具（CLI 同步/抓样本）仍遵守工作日 9-12、14-18 禁窗；**应用运行时已不再限制，随时可同步**。

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
