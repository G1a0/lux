# Lux 第一阶段设计文档

## 项目定位

Lux 是一个基于 Pengu Loader 的英雄联盟客户端增强插件，对标 Sona 项目。
第一阶段（Phase 1）聚焦核心差异化功能：**英雄选择阶段智能推荐**，后续版本逐步扩展至全功能。

## 技术栈

- TypeScript + React 19 + Vite 6
- Pengu Loader Runtime（客户端内嵌 Chromium 插件）
- LCU REST API + WebSocket
- OP.GG 外部 API（counter / synergy / tier 数据）
- 本地静态规则表（降级备用）

## 整体架构

```
League Client
  └── Pengu Loader Runtime
        └── Lux Plugin
              ├── LCU WebSocket 事件解析层
              ├── 数据层（OP.GG API + 本地规则降级）
              ├── 推荐引擎（多因子加权评分）
              └── DOM 注入层（角标 + 侧边面板）
```

## 核心模块

### LCU 事件层
- 监听 `ChampSelectSession` WebSocket 事件
- 解析：我方可用英雄列表、我方已选/Ban、敌方已选/Ban、玩家分配位置、当前阶段

### 数据层
- OP.GG API 客户端：拉取 counter 数据、胜率、tier 梯度
- 本地静态规则表：版本历史数据预生成的 counter/协同矩阵，API 不可用时降级
- 版本 tier 数据持久缓存到 localStorage（24h 有效期）

### 推荐引擎
- 输入：当前阵容状态（双方已选/Ban、玩家位置、可用英雄）
- 输出：每个候选英雄的综合评分
- API 超时 3s 自动降级到本地规则
- 防抖 500ms 处理频繁换人

### DOM 注入层
- 参考 Sona 的 MutationObserver + React Portal 模式
- 在 champ-select 容器内挂载推荐 UI

## 评分模型

| 维度 | 权重 | 数据来源 |
|------|------|----------|
| 协同度（和己方已选英雄的 duo win rate） | 35% | OP.GG synergy API |
| 克制度（对敌方已选英雄的 matchup delta） | 35% | OP.GG counter API |
| 版本强度（tier / win rate / pick rate） | 20% | OP.GG tier API |
| 阵容平衡（AP/AD 配比、前排/后排、控制链） | 10% | 本地计算 |

公式：
```
score = synergy × 0.35 + counter × 0.35 + meta × 0.20 + balance × 0.10
```

特殊情况：
- 敌方未选满时，counter 只对已暴露英雄计算
- 位置已确定 → 只推荐该位置英雄；未确定 → 全英雄评分后按位置分组展示 Top 3

## UI 呈现

### 第一层：英雄网格角标
- 红色边框高亮 + 角标：强烈推荐（评分 top 3）
- 绿色角标：可选（评分中上）
- 无标记：不推荐
- 灰度降低：避免选择（明显被 counter）
- 角标显示评分数字，hover 弹出维度分 Tooltip

### 第二层：侧边推荐面板
- 推荐位（按玩家定位）：Top 3 推荐 + 详细理由
- 全面位（各位置 Top 1 速览）
- 阵容分析：AP/AD 分布、短板提示
- 面板可常驻侧边、浮动或收起
- 点击角标或快捷键唤出

## 数据流

```
ChampSelect Session 事件（WS）
  → 事件解析器（提取阵容状态）
    → API 调度器（去重 + 超时 3s + 限流）
      → OP.GG API
        → 数据合并层（API ∨ 本地规则）
          → 评分引擎
            → UI 渲染（DOM 注入）
```

- 同一 session ID 内 API 数据只拉一次
- 选人结束后清除 session 缓存
- 非选人阶段引擎休眠

## 异常处理与降级

| 场景 | 处理 |
|------|------|
| OP.GG API 超时（>3s） | 降级到本地规则，角标灰色标注"本地数据" |
| OP.GG API 返回空/错误 | 静默降级，不打断选人 |
| 频繁换人 | 防抖 500ms，最后一次变动后重算 |
| 玩家未分配位置 | 全位置推荐，按位置分组展示 |
| 仅 Ban 阶段（尚未 Pick） | 加载数据但不渲染角标 |
| Pengu Loader 不兼容 | 静默退出，不影响客户端 |
| 非选人阶段 | 引擎休眠 |

## 迭代路线

- **Phase 1（当前）**：选人智能推荐（极简，只做推荐）
- **Phase 2**：加入自动接受对局、自动选人/Ban 等辅助功能
- **Phase 3**：全功能对标 Sona + 智能推荐作为杀手锏
