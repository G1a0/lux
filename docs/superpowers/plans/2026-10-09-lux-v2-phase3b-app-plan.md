# Lux v2 Phase 3B（Electron 壳 + 置顶小窗 UI + 打包）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已完成的引擎与 LCU 核心组装成可交付产品：Electron 独立应用（置顶小窗四状态 + 托盘 + 设置页 + 首启引导），产出双击即装的 Windows NSIS 安装包 `Lux-Setup-0.3.0.exe`。

**Architecture:** electron-vite（main/preload/renderer 三端）——main 进程承载全部既有核心（LcuAdvisor→引擎→数据仓→同步器，均为纯逻辑、可无头测试）；renderer 为纯视图（React），通过 preload 的 `window.lux` 类型化桥接收快照/配置/命令；窗口管理（无边框置顶、位置记忆、贴边、按状态显隐与变尺寸）与托盘在 main。UI 可通过 `LUX_UI_MOCK` 回放夹具快照并以 `--screenshot` 截图（无客户端、无人工即可验收每个界面状态）。

**Tech Stack:** Electron + electron-vite + React + TS（无 UI 框架，手写 CSS：深蓝+金）；vitest（jsdom）做 renderer 组件测试；electron-builder（NSIS）；镜像：npmmirror（electron 二进制与 builder 资源，经项目 `.npmrc`）。

**范围说明（设计 §2.1/§7/§9，用户确认）：** 本计划 = v1 收尾：小窗四状态（主/展开/大乱斗/收起药丸）、托盘、设置页、首启引导、NSIS 打包。**不做**：出装、云顶、海克斯、自动更新、自动接受/选人（保持"告诉，不代打"）。真机联调并入本阶段验收（用户装 exe 实测；`scripts/lux-live-cli.ts` 亦可先行验证）。

**关键前置（已完成/已探明）：** 引擎与 LCU 核心（含 `RuneAdvice.subStyleCode` 全链路、8992 守卫）在 master；WSLg 可显示窗口、Electron 系统库齐备；npmmirror 可达；`sudo` 需密码（如遇缺库，让用户用 `!` 执行安装命令）。

**给执行者的环境注意：**
- 一切 npm 安装都会读项目 `.npmrc`（electron 二进制走 npmmirror）——先完成 Task 1 的 `.npmrc` 再安装。
- WSL 里运行 Electron 开发预览：`npm run dev`（若遇 sandbox 报错，dev 脚本加 `--no-sandbox`——计划已内置 `ELECTRON_DISABLE_SANDBOX` 备选说明）。
- 101 数据接口的时段限制不变（工作日 9-12/14-18 禁）；**LCU 与 electron 包下载不受限**。

---

### Task 1: 脚手架（electron-vite + React + 镜像配置 + 最小窗口）

**Files:**
- Create: `.npmrc`、`electron.vite.config.ts`、`src/main/index.ts`、`src/preload/index.ts`、`src/renderer/index.html`、`src/renderer/src/main.tsx`、`src/renderer/src/App.tsx`、`src/renderer/src/styles.css`
- Modify: `package.json`（version 0.3.0、scripts、main 入口）、`tsconfig.json`（include/src+jsx+DOM）、`vitest.config.mts`（include renderer 测试）
- Test: `src/renderer/src/App.test.tsx`

- [ ] **Step 1: 写 `.npmrc`**

```ini
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
```

- [ ] **Step 2: 更新 `package.json`**

```json
{
  "name": "lux",
  "private": true,
  "version": "0.3.0",
  "type": "module",
  "description": "Lux - 英雄联盟新手选人助手（独立应用）",
  "license": "AGPL-3.0",
  "main": "out/main/index.mjs",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "sync": "tsx scripts/sync-cli.ts",
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "dist": "electron-vite build && electron-builder --win nsis"
  }
}
```

- [ ] **Step 3: 安装依赖**

```bash
npm i -D electron electron-vite electron-builder @vitejs/plugin-react
npm i react react-dom
npm i -D @types/react @types/react-dom @testing-library/react @testing-library/dom jsdom
```

Expected: electron postinstall 从 npmmirror 下载（约 100MB，慢但可达）；`react`/`react-dom` 进 dependencies；其余 devDependencies。

- [ ] **Step 4: 更新 `tsconfig.json`（整体替换）**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
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
  "include": ["shared", "scripts", "src", "electron.vite.config.ts"]
}
```

- [ ] **Step 5: 更新 `vitest.config.mts`（整体替换）**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['shared/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
```

（renderer 的 `.test.tsx` 用文件头 `// @vitest-environment jsdom` 标注环境；需 jsx 时 vitest 内置 esbuild 处理，React 自动运行时由 tsconfig `jsx: react-jsx` 提供。）

- [ ] **Step 6: 写 `electron.vite.config.ts`**

```ts
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react()],
  },
})
```

- [ ] **Step 7: 写最小 main / preload / renderer**

`src/main/index.ts`：

```ts
import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 380,
    height: 240,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    show: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      sandbox: false,
    },
  })
  win.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

（electron-vite 使用 CJS 输出时 `__dirname` 可用——若构建报 ESM 问题，用 `import.meta.dirname`（Node 22+）替换；两处路径拼接相应调整。执行时以 `npm run build` 通过为准。）

`src/preload/index.ts`（占位，Task 6 扩展）：

```ts
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('lux', { ping: () => 'pong' })
```

`src/renderer/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'" />
    <title>Lux</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/renderer/src/main.tsx`：

```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

`src/renderer/src/App.tsx`：

```tsx
export function App(): React.JSX.Element {
  return <div className="placeholder">Lux 启动中…</div>
}
```

`src/renderer/src/styles.css`：

```css
:root {
  --bg-deep: #0a1428;
  --bg-panel: #0f1b30;
  --border-gold: #785a28;
  --gold: #c8aa6e;
  --gold-bright: #f0e6d2;
  --text: #e8e3d5;
  --text-dim: #a09b8c;
  --green: #3fd18a;
  --red: #e05a5a;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: transparent;
  font-family: 'Microsoft YaHei', 'PingFang SC', system-ui, sans-serif;
  color: var(--text);
  -webkit-user-select: none;
  user-select: none;
}
#root { width: 100vw; height: 100vh; overflow: hidden; }
.placeholder { display: grid; place-items: center; height: 100%; background: var(--bg-deep); color: var(--text-dim); }
```

- [ ] **Step 8: 写首个 renderer 测试 `src/renderer/src/App.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App（脚手架占位）', () => {
  it('渲染占位文本', () => {
    render(<App />)
    expect(screen.getByText('Lux 启动中…')).toBeTruthy()
  })
})
```

- [ ] **Step 9: 运行验证**

Run: `npx vitest run src/renderer/src/App.test.tsx`
Expected: PASS（jsdom 环境）。
Run: `npm run typecheck`
Expected: 0 错误。
Run: `npm run build`
Expected: 生成 `out/main`、`out/preload`、`out/renderer`（build 通过即脚手架 OK，不需要 GUI）。

- [ ] **Step 10: （可选，WSLg 可见性冒烟）**

Run: `timeout 20 npm run dev`
Expected: 输出窗口创建日志，不崩溃（窗口会短暂出现在桌面；若报 sandbox 相关错误，在 dev 命令前加 `ELECTRON_DISABLE_SANDBOX=1` 重试并在报告中注明）。

- [ ] **Step 11: 提交**

```bash
git add .npmrc package.json package-lock.json tsconfig.json vitest.config.mts electron.vite.config.ts src README.md 2>/dev/null; git add -A src .npmrc package.json package-lock.json tsconfig.json vitest.config.mts electron.vite.config.ts
git commit -m "feat: scaffold electron-vite app shell with react renderer"
```

---

### Task 2: 截图验收装置（LUX_UI_MOCK + --screenshot）

**背景：** 所有 UI 任务都靠这个装置做"可观察"验收：main 在 `LUX_UI_MOCK=1` 时用夹具快照驱动 renderer（不连客户端），`--screenshot <目录>` 依次切换各视图并 `capturePage()` 存 PNG。

**Files:**
- Create: `src/main/screenshot.ts`
- Create: `src/renderer/src/bridge.ts`（类型化桥 + 浏览器/mock 降级）
- Modify: `src/main/index.ts`、`src/preload/index.ts`、`src/renderer/src/App.tsx`
- Test: `src/renderer/src/bridge.test.ts`

- [ ] **Step 1: 写桥类型与 mock 桥 `src/renderer/src/bridge.ts`（强类型快照，全计划通用）**

```ts
// renderer 侧桥接口：生产走 preload 暴露的 window.lux；LUX_UI_MOCK/浏览器开发时降级为本地 mock。
import type { RiftAdvice, AramJudgeResult } from '../../../shared/engine/types'

export type UiSnapshot =
  | { kind: 'rift'; queueId: number; advice: RiftAdvice; names?: Record<number, string> }
  | { kind: 'aram'; queueId: number; aram: AramJudgeResult; names?: Record<number, string> }
  | { kind: 'unsupported'; queueId: number }
  | { kind: 'none' }

export interface UiBridge {
  onSnapshot(cb: (s: UiSnapshot) => void): () => void
  onStatus(cb: (s: string) => void): () => void
  onView(cb: (view: string, snap: unknown) => void): () => void
  onOpenView(cb: (view: string) => void): () => void
  applyRunes(): Promise<{ ok: boolean; reason?: string }>
  applySpells(): Promise<boolean>
  getConfig(): Promise<Record<string, unknown>>
  setConfig(patch: Record<string, unknown>): Promise<Record<string, unknown>>
  setWindowState(state: string): void
  getManifest(): Promise<Record<string, unknown> | null>
  syncNow(): Promise<Record<string, unknown>>
  onSyncProgress(cb: (done: number, total: number) => void): () => void
  quit(): void
}

declare global {
  interface Window {
    lux?: Partial<UiBridge> & Record<string, unknown>
  }
}

export function getBridge(): UiBridge {
  // 合并式降级：preload 尚未暴露全部方法时（如 Task 6 前的阶段），缺的调用回退到惰性实现而非抛错
  return { ...createInertBridge(), ...(window.lux as Partial<UiBridge> | undefined) }
}

/** 无 preload 时（浏览器预览/未注入）的安全降级：不抛错、不动作。 */
export function createInertBridge(): UiBridge {
  return {
    onSnapshot: () => () => {},
    onStatus: () => () => {},
    onView: () => () => {},
    onOpenView: () => () => {},
    applyRunes: async () => ({ ok: false, reason: '未连接应用主进程' }),
    applySpells: async () => false,
    getConfig: async () => ({}),
    setConfig: async p => p,
    setWindowState: () => {},
    getManifest: async () => null,
    syncNow: async () => ({ status: 'unavailable' }),
    onSyncProgress: () => () => {},
    quit: () => {},
  }
}
```

- [ ] **Step 2: 写测试 `src/renderer/src/bridge.test.ts`**

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createInertBridge, getBridge } from './bridge'

describe('bridge', () => {
  it('无 window.lux 时降级为惰性桥（不抛错）', async () => {
    delete (window as { lux?: unknown }).lux
    const b = getBridge()
    expect(await b.applySpells()).toBe(false)
    expect(await b.getManifest()).toBeNull()
    expect(() => b.setWindowState('main')).not.toThrow()
  })

  it('有 window.lux 时透传', () => {
    ;(window as unknown as { lux: unknown }).lux = { ping: () => 'pong' }
    expect((getBridge() as unknown as { ping(): string }).ping()).toBe('pong')
    delete (window as { lux?: unknown }).lux
    expect(() => createInertBridge()).not.toThrow()
  })
})
```

- [ ] **Step 3: 实现截图装置 `src/main/screenshot.ts`**

```ts
// LUX_UI_MOCK=1 时的验收装置：向 renderer 推夹具快照/视图指令，--screenshot <dir> 逐视图存 PNG。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BrowserWindow } from 'electron'

export const MOCK_VIEWS = ['main', 'expanded', 'aram', 'pill', 'settings', 'onboarding'] as const
export type MockView = (typeof MOCK_VIEWS)[number]

const RIFT_SNAPSHOT = {
  kind: 'rift',
  queueId: 420,
  advice: {
    ruleMode: false,
    primary: {
      championId: 711,
      score: 58.4,
      factors: [],
      dominantFactor: 'strength',
      reason: '版本强势：排位胜率 52.6%（T2）',
      partialData: false,
    },
    alternates: [
      { championId: 84, score: 52.8, factors: [], dominantFactor: null, reason: '你们缺法术伤害，阿卡丽正好补上', partialData: false },
      { championId: 90, score: 47.2, factors: [], dominantFactor: null, reason: '适合当前阵容', partialData: true },
    ],
    runes: { keystoneId: 8112, runeIds: [8112, 8139, 8140, 8106, 8210, 8226, 5005, 5008, 5001], subStyleCode: 'ws', source: 'qq101' },
    spells: { spellIds: [14, 4], source: 'qq101' },
  },
  names: { 711: '薇克丝', 84: '阿卡丽', 90: '玛尔扎哈' },
}

const ARAM_SNAPSHOT = {
  kind: 'aram',
  queueId: 450,
  aram: {
    action: 'swap',
    reason: '建议换 艾希：版本强势：大乱斗胜率 54.6%',
    swapTo: { championId: 22, score: 66.4, reason: '版本强势：大乱斗胜率 54.6%', factors: [], dominantFactor: 'strength', partialData: false },
    current: { championId: 711, score: 49.3, reason: '操作上手简单，适合新手', factors: [], dominantFactor: 'beginner', partialData: false },
    bench: [
      { championId: 22, score: 66.4, reason: '版本强势：大乱斗胜率 54.6%', factors: [], dominantFactor: 'strength', partialData: false },
      { championId: 57, score: 52.0, reason: '操作上手简单，适合新手', factors: [], dominantFactor: 'beginner', partialData: false },
    ],
    runes: { keystoneId: 8008, runeIds: [8008, 8009, 9103, 8014, 8304, 8345, 5005, 5008, 5001], subStyleCode: 'qd', source: 'builtin' },
    spells: { spellIds: [4, 32], source: 'builtin' },
  },
  names: { 711: '薇克丝', 22: '艾希', 57: '茂凯' },
}

export function mockSnapshotFor(view: MockView): unknown {
  if (view === 'aram') return ARAM_SNAPSHOT
  if (view === 'main' || view === 'expanded' || view === 'pill') return RIFT_SNAPSHOT
  return { kind: 'none' }
}

/** 依次切换视图并截图；返回落盘文件列表。 */
export async function captureAllViews(win: BrowserWindow, outDir: string): Promise<string[]> {
  mkdirSync(outDir, { recursive: true })
  const files: string[] = []
  for (const view of MOCK_VIEWS) {
    win.webContents.send('lux:mock-view', view, mockSnapshotFor(view))
    await new Promise(r => setTimeout(r, 400)) // 等一次渲染+动效
    const image = await win.webContents.capturePage()
    const file = join(outDir, `${view}.png`)
    writeFileSync(file, image.toPNG())
    files.push(file)
  }
  return files
}
```

- [ ] **Step 4: main 接入 mock 模式（改 `src/main/index.ts`）**

在 `createWindow` 后追加（整体替换文件）：

```ts
import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { captureAllViews } from './screenshot'

const UI_MOCK = process.env.LUX_UI_MOCK === '1'
const screenshotArgIdx = process.argv.indexOf('--screenshot')

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 380,
    height: 240,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    show: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      sandbox: false,
    },
  })
  win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

app.whenReady().then(async () => {
  const win = createWindow()
  if (screenshotArgIdx >= 0) {
    const dir = process.argv[screenshotArgIdx + 1] ?? 'screenshots'
    await new Promise(r => win.webContents.once('did-finish-load', r))
    const files = await captureAllViews(win, dir)
    console.log('[screenshot] 已生成：', files.join(', '))
    app.exit(0)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 5: preload 暴露 mock 事件（占位实现，Task 6 并入正式桥）**

`src/preload/index.ts`：

```ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('lux', {
  ping: () => 'pong',
  onSnapshot: (cb: (s: unknown) => void) => {
    const h = (_e: unknown, s: unknown) => cb(s)
    ipcRenderer.on('lux:snapshot', h)
    return () => ipcRenderer.removeListener('lux:snapshot', h)
  },
  onView: (cb: (view: string, snap: unknown) => void) => {
    const h = (_e: unknown, view: string, snap: unknown) => cb(view, snap)
    ipcRenderer.on('lux:mock-view', h)
    return () => ipcRenderer.removeListener('lux:mock-view', h)
  },
})
```

- [ ] **Step 6: App.tsx 渲染 mock 视图占位（正式视图在 Task 9 起替换）**

```tsx
import { useEffect, useState } from 'react'

export function App(): React.JSX.Element {
  const [view, setView] = useState('none')
  const [snap, setSnap] = useState<unknown>(null)

  useEffect(() => {
    window.lux?.onView?.((v, s) => {
      setView(v)
      setSnap(s)
    })
  }, [])

  if (view === 'none') {
    return <div className="placeholder">Lux 启动中…</div>
  }
  return (
    <div className="placeholder">
      <div>
        <div>[mock] view={view}</div>
        <pre style={{ maxWidth: 360, overflow: 'auto' }}>{JSON.stringify(snap, null, 2)}</pre>
      </div>
    </div>
  )
}
```

并在 `bridge.ts` 的 `UiBridge` 增加 `onView(cb: (view: string, snap: unknown) => void)` ——注意现有声明为 `onView(cb: (view: string) => void)`，本步把签名改为**两参**（Task 6 的正式桥同签名）。同步更新 `createInertBridge` 的 onView 占位。

- [ ] **Step 7: 验证截图装置（无头、WSLg 下）**

Run: `npm run build && LUX_UI_MOCK=1 npx electron out/main/index.mjs --screenshot /tmp/lux-shots 2>&1 | tail -3`
Expected: 输出 `[screenshot] 已生成：/tmp/lux-shots/main.png, …` 且目录下有 6 个 PNG（非空文件）。
（若 electron 命令报 sandbox 错误：`ELECTRON_DISABLE_SANDBOX=1` 前缀重试。）

- [ ] **Step 8: 运行测试与提交**

Run: `npm run test && npm run typecheck`
Expected: 全过。

```bash
git add src package.json
git commit -m "feat: add ui mock screenshot harness for headless ui verification"
```

---

### Task 3: 配置存储（userData/config.json）

**Files:**
- Create: `src/main/config.ts`
- Test: `src/main/config.test.ts`

- [ ] **Step 1: 写失败测试 `src/main/config.test.ts`**

```ts
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createConfigStore, type AppConfig } from './config'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'lux-cfg-'))
})

describe('configStore', () => {
  it('默认值 + 落盘 + 重新加载', () => {
    const store = createConfigStore(dir)
    expect(store.get()).toEqual({
      ownedFilter: true,
      modes: { rift: true, aram: true },
      onboarded: false,
      windowPos: null,
    })

    store.set({ onboarded: true, windowPos: { x: 100, y: 200 } })
    const reloaded = createConfigStore(dir).get()
    expect(reloaded.onboarded).toBe(true)
    expect(reloaded.windowPos).toEqual({ x: 100, y: 200 })
  })

  it('文件损坏时回落默认值', () => {
    const store = createConfigStore(dir)
    store.set({ ownedFilter: false })
    const file = join(dir, 'config.json')
    require('node:fs').writeFileSync(file, 'not-json')
    expect(createConfigStore(dir).get().ownedFilter).toBe(true)
  })

  it('set 为浅合并（modes 子对象合并）', () => {
    const store = createConfigStore(dir)
    store.set({ modes: { rift: false, aram: true } })
    expect(store.get().modes).toEqual({ rift: false, aram: true })
    const patch: Partial<AppConfig> = { modes: { rift: false, aram: true } }
    expect(patch.modes?.aram).toBe(true)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/main/config.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `src/main/config.ts`**

```ts
// 应用配置：JSON 落盘在 userData 目录（dev/test 可注入任意目录）。
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface AppConfig {
  /** 候选池仅限"已拥有+本周免费" */
  ownedFilter: boolean
  modes: { rift: boolean; aram: boolean }
  onboarded: boolean
  windowPos: { x: number; y: number } | null
}

export const DEFAULT_CONFIG: AppConfig = {
  ownedFilter: true,
  modes: { rift: true, aram: true },
  onboarded: false,
  windowPos: null,
}

export interface ConfigStore {
  get(): AppConfig
  /** 浅合并（顶层）；modes 会按子对象合并 */
  set(patch: Partial<AppConfig>): AppConfig
}

export function createConfigStore(dir: string): ConfigStore {
  const file = join(dir, 'config.json')

  function load(): AppConfig {
    try {
      const raw = JSON.parse(readFileSync(file, 'utf-8')) as Partial<AppConfig>
      return {
        ...DEFAULT_CONFIG,
        ...raw,
        modes: { ...DEFAULT_CONFIG.modes, ...(raw.modes ?? {}) },
      }
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  }

  let current = load()

  return {
    get: () => ({ ...current, modes: { ...current.modes } }),
    set(patch) {
      current = {
        ...current,
        ...patch,
        modes: { ...current.modes, ...(patch.modes ?? {}) },
      }
      mkdirSync(dir, { recursive: true })
      const tmp = `${file}.tmp`
      writeFileSync(tmp, JSON.stringify(current, null, 2))
      renameSync(tmp, file)
      return { ...current, modes: { ...current.modes } }
    },
  }
}
```

（测试中 `require('node:fs')` 在同文件已 import 的模块下不可用——把损坏文件的写法改为文件顶部 import 的 `writeFileSync`。执行时直接在测试顶部 `import { mkdtempSync, writeFileSync } from 'node:fs'` 并使用。）

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/main/config.test.ts`
Expected: PASS（3 条）

- [ ] **Step 5: 提交**

```bash
git add src/main/config.ts src/main/config.test.ts
git commit -m "feat: add app config store (userData json)"
```

---

### Task 4: LcuAdvisor 支持异步 compute（3B 前置契约）

**背景：** 3B 的 compute 需要异步预取（owned/熟练度缓存）；把 `ComputeAdvice` 放宽为可返回 Promise，evaluate 处 await。

**Files:**
- Modify: `shared/lcu/advisor.ts`
- Test: `shared/lcu/advisor.test.ts`

- [ ] **Step 1: 改类型与 await**

`shared/lcu/advisor.ts`：

```ts
export type ComputeAdvice = (
  session: ChampSelectSession,
) => Omit<AdviceSnapshot, 'session'> | Promise<Omit<AdviceSnapshot, 'session'>>
```

`evaluate()` 中 compute 段落改为：

```ts
      try {
        const advice = await options.compute(session)
        const snapshot: AdviceSnapshot = { ...advice, session }
        adviceHandlers.forEach(h => h(snapshot))
      } catch (error) {
        console.warn('[lcu] 建议计算失败：', error)
      }
```

- [ ] **Step 2: 加异步 compute 测试（`shared/lcu/advisor.test.ts` 追加）**

```ts
  it('compute 可返回 Promise（异步预取场景）', async () => {
    const mock = await createMockLcu({
      certDir: CERT_DIR,
      routes: { '/lol-champ-select/v1/session': { json: fixture('session-draft-mid.json') } },
    })
    servers.push(mock)
    const advisor = createLcuAdvisor({
      lcuDirOverride: mock.lcuDir,
      discoverIntervalMs: 50,
      debounceMs: 20,
      compute: async session => {
        await new Promise(r => setTimeout(r, 10))
        return { kind: 'rift', sessionQueueId: session.queueId }
      },
    })
    const seen: number[] = []
    advisor.onAdvice(s => seen.push(s.sessionQueueId))
    advisor.start()
    await waitFor(() => (seen.length > 0 ? true : null))
    expect(seen[0]).toBe(420)
    advisor.stop()
  })
```

- [ ] **Step 3: 运行验证**

Run: `npx vitest run shared/lcu/advisor.test.ts`（expect 4 passed）；`npm run test`（expect 170）；`npm run typecheck`。

- [ ] **Step 4: 提交**

```bash
git add shared/lcu/advisor.ts shared/lcu/advisor.test.ts
git commit -m "feat: allow async advice compute in lcu advisor"
```

---

### Task 5: CompanionService（无头可测的应用核心）

**职责：** 汇总「对话来源（advisor 抽象）→ compute（引擎）→ 快照分发」+ 配置（开关影响 compute）+ 一键应用（符文/技能）+ 数据同步（手动/定时、时段门控）+ manifest 状态。全部依赖注入，vitest 无 Electron 可测。

**Files:**
- Create: `src/main/service.ts`、`src/ipc-types.ts`
- Test: `src/main/service.test.ts`

- [ ] **Step 1: 写 `src/ipc-types.ts`（三端共享的载荷类型）**

```ts
export interface RunestSpellDisplay {
  keystoneId: number
  runeIds: number[]
  subStyleCode?: string
  source: 'qq101' | 'builtin'
}

export type AdvicePayload =
  | { kind: 'rift'; queueId: number; advice: unknown }
  | { kind: 'aram'; queueId: number; aram: unknown }
  | { kind: 'unsupported'; queueId: number }
  | { kind: 'none' }

export interface ManifestInfo {
  patch: string
  dataDate: string
  aramDate?: string
  updatedAt: string
}

export interface SyncOutcome {
  /** 'blocked-timegate' | 'synced' | 'up-to-date' | 'partial' | 'failed' | … */
  status: string
  blockedUntil?: string
  patch?: string | null
}
```

（`AdvicePayload` 里 `advice/aram` 用 `unknown` 以避免 main↔renderer 类型往返——renderer 侧在 Task 9 以局部接口收窄。若执行时想更强类型，可 import `RiftAdvice`/`AramJudgeResult` 直接使用——两者均由 shared 导出，bundler 可行；**推荐直接强类型**：`advice: RiftAdvice; aram: AramJudgeResult`，执行时按此实现。）

- [ ] **Step 2: 写失败测试 `src/main/service.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest'
import { createCompanionService, type AdviceSource } from './service'
import type { AppConfig, ConfigStore } from './config'
import { DEFAULT_CONFIG } from './config'

function fakeConfig(initial: Partial<AppConfig> = {}): ConfigStore {
  let current: AppConfig = { ...DEFAULT_CONFIG, ...initial }
  return {
    get: () => current,
    set: patch => {
      current = { ...current, ...patch }
      return current
    },
  }
}

function fakeSource(): AdviceSource & { emit(session: unknown): void; stopSpy: ReturnType<typeof vi.fn> } {
  const adviceHandlers = new Set<(s: unknown) => void>()
  const stopSpy = vi.fn()
  return {
    start: () => {},
    stop: stopSpy,
    onAdvice: h => {
      adviceHandlers.add(h)
      return () => adviceHandlers.delete(h)
    },
    onStatus: () => () => {},
    http: () => null,
    readers: () => null,
    emit: session => adviceHandlers.forEach(h => h({ session })),
    stopSpy,
  }
}

const SESSION_RIFT = {
  queueId: 420,
  localPlayerCellId: 1,
  myTeam: [{ cellId: 1, championId: 0, assignedPosition: 'middle', summonerId: 1, puuid: 'p', championPickIntent: 0, team: 1, spell1Id: 0, spell2Id: 0 }],
  theirTeam: [],
  bans: { myTeamBans: [], theirTeamBans: [], numBans: 0 },
  benchChampions: [],
  benchEnabled: false,
  rerollsRemaining: 0,
  timer: { phase: 'BAN_PICK', adjustedTimeLeftInPhase: 1000, totalTimeInPhase: 1000 },
  actions: [],
} as never // 仅为冒烟；下游 compute 注入假实现，不走真实映射

const SESSION_ARAM = { ...SESSION_RIFT, queueId: 450 } as never

function makeService(overrides: { computeRift?: unknown; computeAram?: unknown } = {}) {
  const events: unknown[] = []
  const service = createCompanionService({
    source: fakeSource(),
    config: fakeConfig(),
    dataset: null as unknown as EngineData,
    computeRift: () => (overrides.computeRift ?? { primary: { championId: 1, reason: 'x', score: 50, factors: [], dominantFactor: null, partialData: false }, alternates: [], runes: null, spells: null, ruleMode: false }),
    computeAram: () => (overrides.computeAram ?? { action: 'keep', reason: 'y', current: { championId: 1 }, bench: [], swapTo: null, runes: null, spells: null }),
    syncRunner: async () => ({ status: 'synced', patch: '16.19' }),
    dataRoot: '/tmp/lux-data',
  })
  service.onSnapshot(s => events.push(s))
  return { service, events }
}

describe('CompanionService', () => {
  it('rift 会话 → 快照含 advice；再次同会话不重复', () => {
    const { service } = makeService()
    const seen: unknown[] = []
    service.onSnapshot(s => seen.push(s))
    service.handleSession(SESSION_RIFT)
    service.handleSession(SESSION_RIFT)
    expect(seen).toHaveLength(1)
    expect((seen[0] as { kind: string }).kind).toBe('rift')
  })

  it('aram 会话 → kind aram；队列不支持 → unsupported', () => {
    const { service } = makeService()
    const seen: { kind: string }[] = []
    service.onSnapshot(s => seen.push(s as { kind: string }))
    service.handleSession(SESSION_ARAM)
    service.handleSession({ ...SESSION_RIFT, queueId: 1700 } as never)
    expect(seen.map(s => s.kind)).toEqual(['aram', 'unsupported'])
  })

  it('模式开关关闭 → 快照 none', () => {
    const cfg = fakeConfig({ modes: { rift: false, aram: true } })
    const service = createCompanionService({
      source: fakeSource(),
      config: cfg,
      computeRift: () => { throw new Error('不应被调用') },
      computeAram: () => { throw new Error('不应被调用') },
      syncRunner: async () => ({ status: 'synced' }),
      dataRoot: '/tmp/lux-data',
    })
    const seen: { kind: string }[] = []
    service.onSnapshot(s => seen.push(s as { kind: string }))
    service.handleSession(SESSION_RIFT)
    expect(seen[0].kind).toBe('none')
  })

  it('syncNow 透传 runner 结果并广播进度', async () => {
    const progress: number[][] = []
    const service = createCompanionService({
      source: fakeSource(),
      config: fakeConfig(),
      computeRift: () => ({ kind: 'none' }) as never,
      computeAram: () => ({ kind: 'none' }) as never,
      syncRunner: async onProgress => {
        onProgress?.(1, 2)
        onProgress?.(2, 2)
        return { status: 'synced', patch: '16.19' }
      },
      dataRoot: '/tmp/lux-data',
    })
    service.onSyncProgress((d, t) => progress.push([d, t]))
    const outcome = await service.syncNow()
    expect(outcome.status).toBe('synced')
    expect(progress).toEqual([[1, 2], [2, 2]])
  })

  it('大乱斗未分配英雄（championId 0）→ 等待态 none，而非 unsupported', () => {
    const { service } = makeService()
    const seen: { kind: string }[] = []
    service.onSnapshot(s => seen.push(s as { kind: string }))
    service.handleSession({ ...SESSION_BASE, queueId: 450 } as never) // SESSION_BASE 本地玩家 championId 为 0
    expect(seen[0].kind).toBe('none')
  })

  it('切换模式开关立即重发快照', () => {
    const service = createCompanionService({
      source: fakeSource(),
      config: fakeConfig(),
      computeRift: () => ({ primary: { championId: 1, reason: 'x', score: 50, factors: [], dominantFactor: null, partialData: false }, alternates: [], runes: null, spells: null, ruleMode: false }),
      computeAram: () => ({ action: 'keep', reason: 'y', current: { championId: 1 }, bench: [], swapTo: null, runes: null, spells: null }),
      syncRunner: async () => ({ status: 'synced' }),
      dataRoot: '/tmp/lux-data',
    })
    const seen: { kind: string }[] = []
    service.onSnapshot(s => seen.push(s as { kind: string }))
    service.handleSession(SESSION_RIFT)
    service.setConfig({ modes: { rift: false, aram: true } })
    expect(seen.map(s => s.kind)).toEqual(['rift', 'none'])
  })

  it('syncNow 并发调用单飞（不重复发起）', async () => {
    let calls = 0
    const service = createCompanionService({
      source: fakeSource(),
      config: fakeConfig(),
      computeRift: () => ({ kind: 'none' }) as never,
      computeAram: () => ({ kind: 'none' }) as never,
      syncRunner: async () => {
        calls += 1
        await new Promise(r => setTimeout(r, 20))
        return { status: 'synced' }
      },
      dataRoot: '/tmp/lux-data',
    })
    const [a, b] = await Promise.all([service.syncNow(), service.syncNow()])
    expect(calls).toBe(1)
    expect(a.status).toBe('synced')
    expect(b.status).toBe('synced')
  })

  it('位置变化（英雄不变）触发重算', () => {
    const { service } = makeService()
    const seen: unknown[] = []
    service.onSnapshot(s => seen.push(s))
    service.handleSession(SESSION_RIFT)
    const moved = { ...SESSION_RIFT, myTeam: SESSION_RIFT.myTeam.map(p => ({ ...p, assignedPosition: 'top' })) } as never
    service.handleSession(moved)
    expect(seen).toHaveLength(2)
  })
})
```

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run src/main/service.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 4: 实现 `src/main/service.ts`**

```ts
// 应用核心（无 Electron 依赖，可无头测试）：
// 会话→（模式开关）→引擎计算→快照广播；配置读写；一键应用；数据同步（手动/定时）。
import type { ChampSelectSession } from '../../shared/lcu/types'
import { mapAramInput, mapRiftContext, proficiencyFromMastery } from '../../shared/lcu/map-session'
import { applyRunePage, carrySpells } from '../../shared/lcu/writers'
import type { LcuHttp } from '../../shared/lcu/http'
import type { LcuReaders } from '../../shared/lcu/readers'
import type { EngineData } from '../../shared/engine/data'
import type { AppConfig, ConfigStore } from './config'
import type { AdvicePayload, ManifestInfo, SyncOutcome } from '../ipc-types'

export interface AdviceSource {
  start(): void
  stop(): void
  onAdvice(handler: (snapshot: { session: ChampSelectSession }) => void): () => void
  onStatus(handler: (status: string) => void): () => void
  http(): LcuHttp | null
  readers(): LcuReaders | null
}

export interface SyncRunnerResult {
  status: string
  patch?: string | null
  blockedUntil?: string
}
export type SyncRunner = (onProgress?: (done: number, total: number) => void) => Promise<SyncRunnerResult>

export interface ServiceDeps {
  source: AdviceSource
  config: ConfigStore
  computeRift: (session: ChampSelectSession, config: AppConfig, caches: RosterCaches) => unknown
  computeAram: (session: ChampSelectSession, config: AppConfig) => unknown
  syncRunner: SyncRunner
  dataRoot: string
  manifestReader?: () => ManifestInfo | null
}

export interface RosterCaches {
  owned: number[]
  proficiency: Record<number, number>
}

export interface CompanionService {
  start(): void
  stop(): void
  handleSession(session: ChampSelectSession): void
  onSnapshot(handler: (payload: AdvicePayload) => void): () => void
  onStatus(handler: (status: string) => void): () => void
  onSyncProgress(handler: (done: number, total: number) => void): () => void
  applyRunes(): Promise<{ ok: boolean; reason?: string }>
  applySpells(): Promise<boolean>
  getConfig(): AppConfig
  setConfig(patch: Partial<AppConfig>): AppConfig
  getManifest(): ManifestInfo | null
  syncNow(): Promise<SyncOutcome>
}

export function createCompanionService(deps: ServiceDeps): CompanionService {
  const snapshotHandlers = new Set<(payload: AdvicePayload) => void>()
  const statusHandlers = new Set<(status: string) => void>()
  const progressHandlers = new Set<(done: number, total: number) => void>()

  let lastPayload: AdvicePayload = { kind: 'none' }
  let lastKey = ''
  let lastSession: ChampSelectSession | null = null
  const caches: RosterCaches = { owned: [], proficiency: {} }
  let rosterTimer: ReturnType<typeof setInterval> | null = null
  let syncTimer: ReturnType<typeof setInterval> | null = null
  let syncInFlight: Promise<SyncOutcome> | null = null
  let offAdvice: (() => void) | null = null
  let offStatus: (() => void) | null = null
  let running = false

  const emit = (payload: AdvicePayload): void => {
    lastPayload = payload
    snapshotHandlers.forEach(h => h(payload))
  }

  async function refreshRoster(): Promise<void> {
    const readers = deps.source.readers()
    if (!readers) return
    try {
      const [owned, free, mastery] = await Promise.all([
        readers.getOwnedChampionIds(),
        readers.getFreeRotationIds(),
        readers.getChampionMasteryPoints(),
      ])
      caches.owned = [...new Set([...owned, ...free])]
      caches.proficiency = Object.fromEntries(
        Object.entries(mastery).map(([id, points]) => [Number(id), proficiencyFromMastery(points)]),
      )
    } catch {
      // 客户端暂不可用：保留旧缓存
    }
  }

  const service: CompanionService = {
    start() {
      if (running) return
      running = true
      offAdvice = deps.source.onAdvice(snapshot => service.handleSession(snapshot.session))
      offStatus = deps.source.onStatus(status => statusHandlers.forEach(h => h(status)))
      deps.source.start()
      void refreshRoster()
      rosterTimer = setInterval(() => { if (running) void refreshRoster() }, 60_000)
      // 启动即尝试一次同步 + 每 3 小时检查（同步器内部处理时段门控）
      void this.syncNow()
      syncTimer = setInterval(() => { if (running) void this.syncNow() }, 3 * 60 * 60 * 1000)
    },
    stop() {
      running = false
      if (rosterTimer) clearInterval(rosterTimer)
      if (syncTimer) clearInterval(syncTimer)
      offAdvice?.()
      offStatus?.()
      offAdvice = null
      offStatus = null
      deps.source.stop()
    },
    handleSession(session) {
      lastSession = session
      const config = deps.config.get()
      const key = `${session.queueId}|${session.myTeam.map(p => p.championId).join(',')}|${session.myTeam.map(p => p.assignedPosition).join(',')}|${session.theirTeam.map(p => p.championId).join(',')}|${session.benchChampions.map(b => b.championId).join(',')}|${session.rerollsRemaining}`
      if (key === lastKey) return
      lastKey = key

      const aramInput = mapAramInput(session)
      const isAram = session.queueId === 450
      if (isAram && !aramInput) return emit({ kind: 'none' }) // 大乱斗尚未分配到英雄：等待态，勿误报"不支持"
      const supported = aramInput !== null || mapRiftContext(session) !== null

      if (isAram && aramInput) {
        if (!config.modes.aram) return emit({ kind: 'none' })
        try {
          return emit({ kind: 'aram', queueId: session.queueId, aram: deps.computeAram(session, config) })
        } catch (error) {
          console.warn('[service] ARAM 计算失败：', error)
          return emit({ kind: 'none' })
        }
      }
      if (!supported) return emit({ kind: 'unsupported', queueId: session.queueId })
      if (!config.modes.rift) return emit({ kind: 'none' })
      try {
        emit({ kind: 'rift', queueId: session.queueId, advice: deps.computeRift(session, config, caches) })
      } catch (error) {
        console.warn('[service] 推荐计算失败：', error)
        emit({ kind: 'none' })
      }
    },
    onSnapshot(handler) {
      snapshotHandlers.add(handler)
      return () => snapshotHandlers.delete(handler)
    },
    onStatus(handler) {
      statusHandlers.add(handler)
      return () => statusHandlers.delete(handler)
    },
    onSyncProgress(handler) {
      progressHandlers.add(handler)
      return () => progressHandlers.delete(handler)
    },
    async applyRunes() {
      const http = deps.source.http()
      if (!http) return { ok: false, reason: '未连接客户端' }
      const runes =
        lastPayload.kind === 'rift'
          ? (lastPayload.advice as { runes: { keystoneId: number; runeIds: number[]; subStyleCode?: string } | null }).runes
          : lastPayload.kind === 'aram'
            ? (lastPayload.aram as { runes: { keystoneId: number; runeIds: number[]; subStyleCode?: string } | null }).runes
            : null
      if (!runes) return { ok: false, reason: '当前没有可应用的符文' }
      return applyRunePage(http, {
        name: lastPayload.kind === 'aram' ? '大乱斗' : '排位',
        keystoneId: runes.keystoneId,
        subStyleCode: runes.subStyleCode ?? 'jj',
        runeIds: runes.runeIds,
      })
    },
    async applySpells() {
      const http = deps.source.http()
      if (!http) return false
      const spells =
        lastPayload.kind === 'rift'
          ? (lastPayload.advice as { spells: { spellIds: [number, number] } | null }).spells
          : lastPayload.kind === 'aram'
            ? (lastPayload.aram as { spells: { spellIds: [number, number] } | null }).spells
            : null
      if (!spells) return false
      return carrySpells(http, spells.spellIds)
    },
    getConfig: () => deps.config.get(),
    setConfig(patch) {
      const next = deps.config.set(patch)
      // 开关切换需即时反映：清 key 后按最近一次会话重算并重发快照
      if (lastSession && (patch.modes !== undefined || patch.ownedFilter !== undefined)) {
        lastKey = ''
        service.handleSession(lastSession)
      }
      return next
    },
    getManifest: () => deps.manifestReader?.() ?? null,
    syncNow() {
      // 单飞：定时器/手动/启动三路触发只保留一个进行中的同步（避免重复打向 101/WAF）
      if (syncInFlight) return syncInFlight
      syncInFlight = (async (): Promise<SyncOutcome> => {
        try {
          const result = await deps.syncRunner((done, total) => progressHandlers.forEach(h => h(done, total)))
          return { status: result.status, patch: result.patch ?? null, blockedUntil: result.blockedUntil }
        } catch {
          return { status: 'failed', patch: null }
        } finally {
          syncInFlight = null
        }
      })()
      return syncInFlight
    },
  }
  return service
}
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run src/main/service.test.ts`（expect 4 passed）；`npm run test && npm run typecheck`。

- [ ] **Step 6: 提交**

```bash
git add src/main/service.ts src/main/service.test.ts src/ipc-types.ts
git commit -m "feat: add headless companion service (advice, config, apply, sync)"
```

---

### Task 6: 正式 IPC 桥 + main 装配

**Files:**
- Create: `src/main/app.ts`（装配真实依赖：advisor/engine/warehouse/sync/compute）
- Modify: `src/main/index.ts`、`src/preload/index.ts`
- Test: `src/main/app.test.ts`

- [ ] **Step 1: 写 `src/main/app.ts`（装配层；`createApp()` 解析 Electron 路径，`createAppWithPaths()` 纯函数便于测试）**

```ts
// 真实装配：LCU advisor + 引擎 + 数据仓 + 同步器 → CompanionService。
import { app } from 'electron'
import { join } from 'node:path'
import { createLcuAdvisor } from '../../shared/lcu/advisor'
import { buildChampionIndex } from '../../shared/lcu/resources'
import { createWarehouse } from '../../shared/warehouse/store'
import { createEngineData, type EngineData } from '../../shared/engine/data'
import { createChampionIndex, type ChampionIndex } from '../../shared/champions/meta'
import { mapAramInput, mapRiftContext } from '../../shared/lcu/map-session'
import { recommendRift } from '../../shared/engine/recommend'
import { judgeAram } from '../../shared/engine/aram'
import { createQq101Client } from '../../shared/qq101/client'
import { syncRiftData } from '../../shared/qq101/sync'
import { isApiAllowed, nextAllowedTime } from '../../shared/timegate'
import { createConfigStore } from './config'
import { createCompanionService, type AdviceSource, type CompanionService } from './service'

export interface AppBundle {
  service: CompanionService
  dataRoot: string
  configDir: string
}

export interface AppPaths {
  configDir: string
  dataRoot: string
}

export function createAppWithPaths(
  paths: AppPaths,
  io: { createSource?: () => AdviceSource } = {},
): AppBundle {
  const config = createConfigStore(paths.configDir)
  const warehouse = createWarehouse(paths.dataRoot)

  // datasetRef：引擎数据随「资源索引就绪」与「每次同步成功」重建；compute 闭包经 ref 读取最新值。
  // 关键修复：首启时索引可能先于首次同步完成——同步成功后必须重建（否则 patch=null 时推荐为空直到重启）。
  const datasetRef: { current: EngineData } = {
    current: createEngineData(warehouse, createChampionIndex([])),
  }
  const builtIndexRef: { current: ChampionIndex | null } = { current: null }
  const rebuildDataset = (): void => {
    datasetRef.current = createEngineData(warehouse, builtIndexRef.current ?? createChampionIndex([]))
  }

  let source: AdviceSource
  if (io.createSource) {
    source = io.createSource()
  } else {
    const advisor = createLcuAdvisor({ compute: () => ({ kind: 'none', sessionQueueId: 0 }) as never })
    source = {
      start: () => advisor.start(),
      stop: () => advisor.stop(),
      onAdvice: handler => advisor.onAdvice(handler as never),
      onStatus: handler => advisor.onStatus(handler as never),
      http: () => advisor.http(),
      readers: () => advisor.readers(),
    }
    // 客户端连上后构建英雄资源索引（每 2s 重试；仅成功后停止重试）
    const timer = setInterval(() => {
      const http = advisor.http()
      if (!http) return
      void buildChampionIndex(http)
        .then(index => {
          builtIndexRef.current = index
          rebuildDataset()
          clearInterval(timer)
        })
        .catch(error => console.warn('[app] 英雄资源构建失败（将重试）：', error))
    }, 2000)
  }

  const service = createCompanionService({
    source,
    config,
    computeRift: (session, cfg, caches) => {
      const ctx = mapRiftContext(session, { proficiency: caches.proficiency })
      if (!ctx) throw new Error('非征召会话')
      return recommendRift({ ...ctx, ownedChampionIds: cfg.ownedFilter ? caches.owned : undefined }, datasetRef.current)
    },
    computeAram: session => {
      const input = mapAramInput(session)
      if (!input) throw new Error('非大乱斗会话')
      return judgeAram(input, datasetRef.current)
    },
    syncRunner: async onProgress => {
      const now = new Date()
      if (!isApiAllowed(now)) {
        return { status: 'blocked-timegate', patch: null, blockedUntil: nextAllowedTime(now).toISOString() }
      }
      const client = createQq101Client()
      const result = await syncRiftData({ client, warehouse, onProgress })
      if (result.patch) rebuildDataset() // 同步成功 → 数据仓就绪/更新：重建引擎数据（修复首启竞态）
      return { status: result.status, patch: result.patch }
    },
    dataRoot: paths.dataRoot,
    manifestReader: () => warehouse.readManifest(),
  })

  return { service, dataRoot: paths.dataRoot, configDir: paths.configDir }
}

export function createApp(): AppBundle {
  const configDir = app.getPath('userData')
  const dataRoot = process.env.LUX_DATA_DIR ?? join(app.getPath('userData'), 'data')
  return createAppWithPaths({ configDir, dataRoot })
}
```

- [ ] **Step 2: 写测试 `src/main/app.test.ts`（注入 fake source，不依赖 Electron/advisor）**

```ts
import { describe, expect, it } from 'vitest'
import { createAppWithPaths } from './app'
import type { AdviceSource } from './service'

function fakeSource(): AdviceSource {
  return {
    start: () => {},
    stop: () => {},
    onAdvice: () => () => {},
    onStatus: () => () => {},
    http: () => null,
    readers: () => null,
  }
}

describe('createAppWithPaths', () => {
  it('装配出 service 且 manifestReader 可调用（空仓返回 null）', () => {
    const { service } = createAppWithPaths(
      { configDir: '/tmp/lux-app-cfg', dataRoot: '/tmp/lux-app-data-none' },
      { createSource: fakeSource },
    )
    expect(service.getManifest()).toBeNull()
    expect(service.getConfig().ownedFilter).toBe(true)
    service.stop()
  })
})
```

- [ ] **Step 3: 更新 `src/main/index.ts` 完整版**

```ts
import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'node:path'
import { createApp } from './app'
import { captureAllViews } from './screenshot'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1'
```

（**Task 6 只做装配+IPC**；窗口管理（Task 7）与托盘（Task 8）逐步补齐 index.ts。本 Step 先写最小装配版本：）

```ts
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { createApp } from './app'
import { captureAllViews } from './screenshot'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1'

const UI_MOCK = process.env.LUX_UI_MOCK === '1'
const screenshotArgIdx = process.argv.indexOf('--screenshot')

let bundle: ReturnType<typeof createApp> | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 380,
    height: 240,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    show: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      sandbox: false,
    },
  })
  win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

function wireIpc(win: BrowserWindow): void {
  if (!bundle) return
  const { service } = bundle
  service.onSnapshot(s => win.webContents.send('lux:snapshot', s))
  service.onStatus(s => win.webContents.send('lux:status', s))
  service.onSyncProgress((d, t) => win.webContents.send('lux:sync-progress', d, t))

  ipcMain.handle('lux:apply-runes', () => service.applyRunes())
  ipcMain.handle('lux:apply-spells', () => service.applySpells())
  ipcMain.handle('lux:get-config', () => service.getConfig())
  ipcMain.handle('lux:set-config', (_e, patch) => service.setConfig(patch))
  ipcMain.handle('lux:get-manifest', () => service.getManifest())
  ipcMain.handle('lux:sync-now', () => service.syncNow())
  ipcMain.handle('lux:quit', () => app.quit())
  ipcMain.on('lux:set-window-state', (_e, state: string) => {
    const sizes: Record<string, [number, number]> = {
      main: [380, 240], expanded: [380, 460], aram: [380, 280], pill: [220, 48],
      settings: [420, 520], onboarding: [420, 560],
    }
    const size = sizes[state]
    if (size) win.setSize(size[0], size[1])
  })
}

app.whenReady().then(async () => {
  const win = createWindow()
  if (!UI_MOCK) {
    bundle = createApp()
    wireIpc(win) // 先接 IPC，再启动服务：避免启动早期事件因监听未就位而丢失
    bundle.service.start()
  }
  if (screenshotArgIdx >= 0) {
    const dir = process.argv[screenshotArgIdx + 1] ?? 'screenshots'
    await new Promise(r => win.webContents.once('did-finish-load', r))
    const files = await captureAllViews(win, dir)
    console.log('[screenshot] 已生成：', files.join(', '))
    app.exit(0)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('before-quit', () => bundle?.service.stop())
```

（沙箱/根用户环境下加：`app.commandLine.appendSwitch('no-sandbox')` 作为注释备选——WSLg 常规用户通常不需要。）

- [ ] **Step 4: 更新 `src/preload/index.ts` 为正式桥（对齐 `UiBridge`）**

```ts
import { contextBridge, ipcRenderer } from 'electron'

const bridge = {
  onSnapshot: (cb: (s: unknown) => void) => {
    const h = (_e: unknown, s: unknown) => cb(s)
    ipcRenderer.on('lux:snapshot', h)
    return () => ipcRenderer.removeListener('lux:snapshot', h)
  },
  onStatus: (cb: (s: string) => void) => {
    const h = (_e: unknown, s: string) => cb(s)
    ipcRenderer.on('lux:status', h)
    return () => ipcRenderer.removeListener('lux:status', h)
  },
  onView: (cb: (view: string, snap: unknown) => void) => {
    const h = (_e: unknown, view: string, snap: unknown) => cb(view, snap)
    ipcRenderer.on('lux:mock-view', h)
    return () => ipcRenderer.removeListener('lux:mock-view', h)
  },
  onSyncProgress: (cb: (d: number, t: number) => void) => {
    const h = (_e: unknown, d: number, t: number) => cb(d, t)
    ipcRenderer.on('lux:sync-progress', h)
    return () => ipcRenderer.removeListener('lux:sync-progress', h)
  },
  applyRunes: () => ipcRenderer.invoke('lux:apply-runes'),
  applySpells: () => ipcRenderer.invoke('lux:apply-spells'),
  getConfig: () => ipcRenderer.invoke('lux:get-config'),
  setConfig: (patch: unknown) => ipcRenderer.invoke('lux:set-config', patch),
  setWindowState: (state: string) => ipcRenderer.send('lux:set-window-state', state),
  getManifest: () => ipcRenderer.invoke('lux:get-manifest'),
  syncNow: () => ipcRenderer.invoke('lux:sync-now'),
  quit: () => ipcRenderer.invoke('lux:quit'),
}

contextBridge.exposeInMainWorld('lux', bridge)
```

- [ ] **Step 5: 验证**

Run: `npm run test && npm run typecheck && npm run build`
Expected: 全过（service.test + app.test 通过；build 通过）。
Run: `LUX_UI_MOCK=1 npx electron out/main/index.mjs --screenshot /tmp/lux-shots 2>&1 | tail -2`
Expected: mock 截图不受影响（mock 模式不启动 service）。

- [ ] **Step 6: 提交**

```bash
git add src/main src/preload
git commit -m "feat: wire real app assembly and ipc bridge"
```

---

### Task 7: 视窗管理（位置记忆、贴边、按状态显隐、视窗尺寸）

**Files:**
- Create: `src/main/window.ts`、`src/main/window-logic.ts`（纯函数，可测）
- Modify: `src/main/index.ts`
- Test: `src/main/window-logic.test.ts`

- [ ] **Step 1: 写失败测试 `src/main/window-logic.test.ts`（贴边吸附为纯函数）**

```ts
import { describe, expect, it } from 'vitest'
import { snapToEdge, clampToWorkArea } from './window-logic'

const area = { x: 0, y: 0, width: 1920, height: 1080 }

describe('snapToEdge', () => {
  it('靠近左/右边缘（≤24px）时吸附', () => {
    expect(snapToEdge({ x: 10, y: 300 }, { width: 380, height: 240 }, area, 24)).toEqual({ x: 0, y: 300 })
    expect(snapToEdge({ x: 1920 - 380 - 10, y: 300 }, { width: 380, height: 240 }, area, 24)).toEqual({ x: 1920 - 380, y: 300 })
  })

  it('远离边缘保持原位', () => {
    expect(snapToEdge({ x: 700, y: 300 }, { width: 380, height: 240 }, area, 24)).toEqual({ x: 700, y: 300 })
  })
})

describe('clampToWorkArea', () => {
  it('越界坐标被约束回工作区', () => {
    expect(clampToWorkArea({ x: -50, y: -50 }, { width: 380, height: 240 }, area)).toEqual({ x: 0, y: 0 })
    expect(clampToWorkArea({ x: 99999, y: 99999 }, { width: 380, height: 240 }, area)).toEqual({ x: 1540, y: 840 })
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/main/window-logic.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 `src/main/window-logic.ts`**

```ts
export interface Rect { x: number; y: number; width: number; height: number }

export function snapToEdge(
  pos: { x: number; y: number },
  size: { width: number; height: number },
  area: Rect,
  threshold = 24,
): { x: number; y: number } {
  let { x, y } = pos
  if (Math.abs(x - area.x) <= threshold) x = area.x
  else if (Math.abs(area.x + area.width - (x + size.width)) <= threshold) x = area.x + area.width - size.width
  if (Math.abs(y - area.y) <= threshold) y = area.y
  else if (Math.abs(area.y + area.height - (y + size.height)) <= threshold) y = area.y + area.height - size.height
  return { x, y }
}

export function clampToWorkArea(
  pos: { x: number; y: number },
  size: { width: number; height: number },
  area: Rect,
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(pos.x, area.x), area.x + area.width - size.width),
    y: Math.min(Math.max(pos.y, area.y), area.y + area.height - size.height),
  }
}
```

- [ ] **Step 4: 实现 `src/main/window.ts`**

```ts
// 主窗口：无边框置顶；位置记忆 + 贴边；按 advisor 状态显隐；按视图切换尺寸。
import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { clampToWorkArea, snapToEdge } from './window-logic'
import type { ConfigStore } from './config'

const SIZES: Record<string, [number, number]> = {
  main: [380, 240],
  expanded: [380, 460],
  aram: [380, 280],
  pill: [220, 48],
  settings: [420, 520],
  onboarding: [420, 560],
}

export interface WindowManager {
  create(): BrowserWindow
  setView(state: string): void
  setAdviceActive(active: boolean): void
  win(): BrowserWindow | null
}

export function createWindowManager(config: ConfigStore): WindowManager {
  let win: BrowserWindow | null = null
  let adviceActive = false
  let settingsOpen = false

  function updateVisibility(): void {
    if (!win) return
    if (adviceActive || settingsOpen) win.showInactive()
    else win.hide()
  }

  return {
    create() {
      const saved = config.get().windowPos
      const area = screen.getPrimaryDisplay().workArea
      const size = { width: SIZES.main[0], height: SIZES.main[1] }
      const pos = clampToWorkArea(saved ?? { x: area.x + area.width - size.width - 24, y: area.y + 120 }, size, area)

      win = new BrowserWindow({
        ...pos,
        ...size,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        show: false,
        webPreferences: {
          preload: join(__dirname, '../preload/index.mjs'),
          contextIsolation: true,
          sandbox: false,
        },
      })
      win.loadFile(join(__dirname, '../renderer/index.html'))

      const savePos = (): void => {
        if (!win) return
        const [x, y] = win.getPosition()
        const [w, h] = win.getSize()
        const snapped = snapToEdge({ x, y }, { width: w, height: h }, screen.getPrimaryDisplay().workArea)
        if (snapped.x !== x || snapped.y !== y) win.setPosition(snapped.x, snapped.y)
        config.set({ windowPos: snapped })
      }
      win.on('moved', savePos)
      return win
    },
    setView(state) {
      if (!win) return
      const size = SIZES[state] ?? SIZES.main
      win.setSize(size[0], size[1])
      const [x, y] = win.getPosition()
      const area = screen.getPrimaryDisplay().workArea
      win.setPosition(...Object.values(clampToWorkArea({ x, y }, { width: size[0], height: size[1] }, area)) as [number, number])
      settingsOpen = state === 'settings' || state === 'onboarding'
      updateVisibility()
    },
    setAdviceActive(active) {
      adviceActive = active
      updateVisibility()
    },
    win: () => win,
  }
}
```

（`win.hide()/showInactive` 在设置页打开时保持可见：settingsOpen 逻辑已覆盖；「离开选人自动隐藏」由 adviceActive 驱动——但设置页打开时用户正在操作，不展示建议面板，故 index.ts 中把 setView('settings'|'onboarding') 也视为可见。执行时确保：状态 waiting/connected → setAdviceActive(false)；in-champ-select → true，**除**了用户当前在 settings/onboarding 视图时（此时窗口保持可见，renderer 自会切视图）——由 renderer 发 `set-window-state` 时附带，index 中记录 currentView，updateVisibility = adviceActive || currentView ∈ {settings, onboarding}。）

- [ ] **Step 5: index.ts 接入 WindowManager + 状态联动**

替换 createWindow 与相关逻辑：

```ts
import { createWindowManager } from './window'
import { createConfigStore } from './config'

// app.whenReady 内：
const config = createConfigStore(app.getPath('userData'))
const windows = createWindowManager(config)
const win = windows.create()
...
ipcMain.on('lux:set-window-state', (_e, state: string) => windows.setView(state))
// service 状态联动：
service.onStatus(status => {
  windows.setAdviceActive(status === 'in-champ-select')
})
// UI_MOCK 模式下：用截图装置驱动（不做状态联动） — 保持现有 --screenshot 分支。
```

注意：正式模式下窗口初始隐藏（用户未进选人时不打扰）；mock/screenshot 模式下需要 `win.showInactive()` 才能 capturePage——在截图分支前加 `win.showInactive()`（隐藏窗口 capturePage 会得到空图）。

- [ ] **Step 6: 验证**

Run: `npm run test && npm run typecheck && npm run build`
Run: `LUX_UI_MOCK=1 npx electron out/main/index.mjs --screenshot /tmp/lux-shots 2>&1 | tail -2`
Expected: 截图仍正常（非空 PNG）。

- [ ] **Step 7: 提交**

```bash
git add src/main
git commit -m "feat: add window manager with snap, memory and status-driven visibility"
```

---

### Task 8: 托盘

**Files:**
- Create: `src/main/tray.ts`、`assets/tray.png`（Task 15 生成真图标前，先放一个程序生成的 16x16 金色方块 PNG——本任务内用 node 一行脚本生成）
- Modify: `src/main/index.ts`

- [ ] **Step 1: 生成占位托盘图标**

```bash
node -e '
const {def} = require("node:zlib");
' 2>/dev/null
```

（zlib 手工编码 PNG 太绕——改用 **Electron 自带能力**：托盘图标先用 `nativeImage.createFromDataURL` 内联一个 1x1 金色 PNG 的 base64，Task 15 再换真图标。）

```ts
// tray.ts 内部常量（1x1 金色；Task 15 替换为 assets/icon.png）
const GOLD_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mOsaGj4DwAFhAJ/lZ7bWQAAAABJRU5ErkJggg=='
```

- [ ] **Step 2: 实现 `src/main/tray.ts`**

```ts
import { Menu, Tray, nativeImage, app } from 'electron'

const GOLD_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mOsaGj4DwAFhAJ/lZ7bWQAAAABJRU5ErkJggg=='

export interface TrayDeps {
  show(): void
  openSettings(): void
}

export function createAppTray(deps: TrayDeps): Tray {
  const tray = new Tray(nativeImage.createFromDataURL(GOLD_PX).resize({ width: 16, height: 16 }))
  tray.setToolTip('Lux - 选人助手')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示小窗', click: () => deps.show() },
      { label: '设置', click: () => deps.openSettings() },
      { type: 'separator' },
      { label: '退出 Lux', click: () => app.quit() },
    ]),
  )
  tray.on('click', () => deps.show())
  return tray
}
```

- [ ] **Step 3: index.ts 接入（保留引用防 GC）**

```ts
import { createAppTray } from './tray'
// 在 windows.create() 后（仅正式模式）：
let tray: Tray | null = null
if (!UI_MOCK) {
  tray = createAppTray({
    show: () => windows.win()?.showInactive(),
    openSettings: () => {
      windows.win()?.showInactive()
      windows.win()?.webContents.send('lux:open-view', 'settings')
    },
  })
}
```

（preload 增加 `onOpenView(cb)` 监听 `lux:open-view`；renderer App 接收后切设置视图。执行时：preload 加频道，App 在 Task 9 统一消费。**本步先加 preload 频道 + App 监听占位**。）

- [ ] **Step 4: 验证与提交**

Run: `npm run test && npm run typecheck && npm run build`（全过）
Run: `timeout 15 npm run dev`（可选冒烟：进程不崩溃即可）

```bash
git add src/main src/preload
git commit -m "feat: add system tray with show/settings/quit"
```

---

### Task 9: Renderer 外壳（视图路由 + 桥消费 + 样式基线）

**Files:**
- Create: `src/renderer/src/views/MainPanel.tsx`（本任务先占位骨架，Task 10 完整）、`src/renderer/src/views/ExpandedPanel.tsx`、`src/renderer/src/views/AramPanel.tsx`、`src/renderer/src/views/CollapsedPill.tsx`、`src/renderer/src/views/Settings.tsx`、`src/renderer/src/views/Onboarding.tsx`（全部先占位，后续任务填充）
- Modify: `src/renderer/src/App.tsx`、`src/renderer/src/bridge.ts`、`src/renderer/src/styles.css`
- Test: `src/renderer/src/App.test.tsx`（替换）

- [ ] **Step 1: App 视图路由（含 mock 视图驱动与设置/引导切换）**

```tsx
import { useEffect, useState } from 'react'
import { getBridge, type UiSnapshot } from './bridge'
import { MainPanel } from './views/MainPanel'
import { ExpandedPanel } from './views/ExpandedPanel'
import { AramPanel } from './views/AramPanel'
import { CollapsedPill } from './views/CollapsedPill'
import { Settings } from './views/Settings'
import { Onboarding } from './views/Onboarding'

type View = 'none' | 'main' | 'expanded' | 'aram' | 'pill' | 'settings' | 'onboarding'

export function App(): React.JSX.Element {
  const bridge = getBridge()
  const [view, setView] = useState<View>('none')
  const [snapshot, setSnapshot] = useState<UiSnapshot | null>(null)
  const [onboarded, setOnboarded] = useState(true)

  useEffect(() => {
    void bridge.getConfig().then(cfg => {
      const onboardedFlag = cfg.onboarded !== false
      setOnboarded(onboardedFlag)
      if (!onboardedFlag) {
        setView('onboarding')
        bridge.setWindowState('onboarding')
      }
    })
    const offSnap = bridge.onSnapshot(s => {
      setSnapshot(s)
      setView(prev => {
        if (prev === 'settings' || prev === 'onboarding') return prev
        if (s.kind === 'rift') return 'main'
        if (s.kind === 'aram') return 'aram'
        if (s.kind === 'unsupported') return 'main'
        return 'none'
      })
    })
    const offView = bridge.onView((v, s) => {
      setView(v as View)
      if (s) setSnapshot(s as UiSnapshot)
    })
    const offOpen = bridge.onOpenView(v => {
      setView(v as View)
      bridge.setWindowState(v)
    })
    return () => {
      offSnap()
      offView()
      offOpen()
    }
  }, [])

  if (view === 'none') {
    return <div className="placeholder">等待进入选人…</div>
  }
  if (view === 'onboarding') {
    return <Onboarding onDone={() => { void bridge.setConfig({ onboarded: true }); setView('main'); bridge.setWindowState('main') }} />
  }
  if (view === 'settings') {
    return <Settings onClose={() => { setView('main'); bridge.setWindowState('main') }} />
  }
  if (view === 'aram' && snapshot) return <AramPanel snapshot={snapshot} />
  if (view === 'pill') return <CollapsedPill onClick={() => { setView('main'); bridge.setWindowState('main') }} />
  if (view === 'expanded' && snapshot) return <ExpandedPanel snapshot={snapshot} />
  return <MainPanel snapshot={snapshot} onExpand={() => { setView('expanded'); bridge.setWindowState('expanded') }} onCollapse={() => { setView('pill'); bridge.setWindowState('pill') }} onSettings={() => { setView('settings'); bridge.setWindowState('settings') }} />
}
```

（`onOpenView` 已在 Task 2 的桥接口与 inert 桥中定义；preload 频道在 Task 8 加入。各面板内部按 `snapshot.kind` 守卫。）

- [ ] **Step 2: 五个视图占位（后续任务逐个填充）**

`views/MainPanel.tsx`（占位 + 后续接口固定）：

```tsx
import type { UiSnapshot } from '../bridge'

export interface MainPanelProps {
  snapshot: UiSnapshot | null
  onExpand(): void
  onCollapse(): void
  onSettings(): void
}

export function MainPanel(props: MainPanelProps): React.JSX.Element {
  return <div className="panel">主面板（待实现）<button onClick={props.onExpand}>详情</button></div>
}
```

其余四个视图用同样模式占位（`AramPanel({ snapshot })`、`ExpandedPanel({ snapshot })`、`CollapsedPill({ onClick })`、`Settings({ onClose })`、`Onboarding({ onDone })`）。

- [ ] **Step 3: 样式基线与拖拽**

`styles.css` 追加：

```css
.drag-region { -webkit-app-region: drag; }
.no-drag { -webkit-app-region: no-drag; }
.panel {
  height: 100%; display: flex; flex-direction: column; gap: 8px;
  background: linear-gradient(160deg, var(--bg-panel), var(--bg-deep));
  border: 1px solid var(--border-gold); border-radius: 8px; padding: 12px;
}
```

- [ ] **Step 4: 更新 App.test.tsx**

```tsx
// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'
import { createInertBridge } from './bridge'

beforeEach(() => {
  delete (window as { lux?: unknown }).lux
  ;(window as unknown as { lux: unknown }).lux = { ...createInertBridge(), getConfig: async () => ({ onboarded: true }) }
})

describe('App 路由', () => {
  it('无快照时显示等待文案', async () => {
    render(<App />)
    expect(await screen.findByText('等待进入选人…')).toBeTruthy()
  })
})
```

- [ ] **Step 5: 验证与提交**

Run: `npm run test && npm run typecheck && npm run build`
Run: `LUX_UI_MOCK=1 npx electron out/main/index.mjs --screenshot /tmp/lux-shots && ls -la /tmp/lux-shots/`（各 PNG 非空）

```bash
git add src/renderer
git commit -m "feat: renderer shell with view routing and drag region"
```

---

### Task 10: 主面板（主推 + 理由 + 符文/技能 + 一键应用）

**Files:**
- Modify: `src/renderer/src/views/MainPanel.tsx`、`src/renderer/src/bridge.ts`（快照强类型收窄）
- Test: `src/renderer/src/views/MainPanel.test.tsx`

- [ ] **Step 1: 桥快照强类型（Task 2 已定义，无需改动；本任务只消费）**

`bridge.ts` 的 `UiSnapshot` 自 Task 2 起即为强类型（`advice: RiftAdvice` / `aram: AramJudgeResult`）；`screenshot.ts` 夹具同样使用该结构。MainPanel/AramPanel 直接消费 `snapshot.advice` / `snapshot.aram`。若执行到此发现有出入，先修 bridge/screenshot 使其一致。

- [ ] **Step 2: 失败测试 `MainPanel.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MainPanel } from './MainPanel'
import type { UiSnapshot } from '../bridge'

const snap: UiSnapshot = {
  kind: 'rift',
  queueId: 420,
  names: { 711: '薇克丝' },
  advice: {
    primary: { championId: 711, score: 58.4, factors: [], dominantFactor: 'strength', reason: '版本强势：排位胜率 52.6%（T2）', partialData: false },
    alternates: [],
    runes: { keystoneId: 8112, runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001], subStyleCode: 'jj', source: 'qq101' },
    spells: { spellIds: [14, 4], source: 'qq101' },
    ruleMode: false,
  },
}

describe('MainPanel', () => {
  it('渲染主推、理由、符文与技能的展示名', () => {
    render(<MainPanel snapshot={snap} onExpand={vi.fn()} onCollapse={vi.fn()} onSettings={vi.fn()} />)
    expect(screen.getByText('薇克丝')).toBeTruthy()
    expect(screen.getByText(/版本强势/)).toBeTruthy()
    expect(screen.getByText(/电刑|基石/)).toBeTruthy()
    expect(screen.getByText('点燃 + 闪现')).toBeTruthy()
  })

  it('一键应用按钮调用桥', async () => {
    const applyRunes = vi.fn(async () => ({ ok: true }))
    const applySpells = vi.fn(async () => true)
    ;(window as unknown as { lux: unknown }).lux = { applyRunes, applySpells, setWindowState: vi.fn(), setConfig: vi.fn() }
    render(<MainPanel snapshot={snap} onExpand={vi.fn()} onCollapse={vi.fn()} onSettings={vi.fn()} />)
    fireEvent.click(screen.getByText('一键应用符文'))
    fireEvent.click(screen.getByText('携带技能'))
    expect(applyRunes).toHaveBeenCalled()
    expect(applySpells).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: 实现 MainPanel（完整）**

```tsx
import { useState } from 'react'
import { getBridge, type UiSnapshot } from '../bridge'

const SPELL_NAMES: Record<number, string> = {
  1: '净化', 3: '虚弱', 4: '闪现', 6: '疾跑', 7: '治疗', 11: '惩戒', 12: '传送', 14: '点燃', 21: '护盾', 32: '标记',
}
const KEYSTONES: Record<number, string> = {
  8005: '强攻', 8008: '致命节奏', 8010: '征服者', 8021: '迅捷步法',
  8112: '电刑', 8124: '掠食者', 8128: '黑暗收割', 9923: '丛刃',
  8214: '召唤艾黎', 8229: '奥术彗星', 8230: '相位猛冲',
  8437: '余震', 8439: '守护者', 8465: '不灭之握',
  8351: '冰川增幅', 8360: '启封的秘籍', 8369: '先攻', 8992: '冥火之触',
}

export interface MainPanelProps {
  snapshot: UiSnapshot | null
  onExpand(): void
  onCollapse(): void
  onSettings(): void
}

function nameOf(id: number, snap: UiSnapshot | null): string {
  return snap?.names?.[id] ?? `英雄${id}`
}

export function MainPanel({ snapshot, onExpand, onCollapse, onSettings }: MainPanelProps): React.JSX.Element {
  const bridge = getBridge()
  const [applyMsg, setApplyMsg] = useState<string | null>(null)

  if (!snapshot || snapshot.kind === 'none') {
    return (
      <div className="panel drag-region">
        <div className="panel-title no-drag">
          <span>Lux</span>
          <span className="panel-actions">
            <button onClick={onSettings} title="设置">⚙</button>
            <button onClick={onCollapse} title="收起">━</button>
          </span>
        </div>
        <div className="dim">等待进入选人…</div>
      </div>
    )
  }
  if (snapshot.kind === 'unsupported') {
    return (
      <div className="panel drag-region">
        <div className="panel-title no-drag">
          <span>Lux</span>
          <span className="panel-actions"><button onClick={onSettings}>⚙</button><button onClick={onCollapse}>━</button></span>
        </div>
        <div className="dim">当前模式暂不支持（queueId={snapshot.queueId}）</div>
      </div>
    )
  }
  if (snapshot.kind !== 'rift') return <div className="panel">…</div>

  const { advice } = snapshot
  const primary = advice.primary
  const runes = advice.runes
  const spells = advice.spells

  async function onApplyRunes(): Promise<void> {
    const r = await bridge.applyRunes()
    setApplyMsg(r.ok ? '符文已应用' : `符文应用失败：${r.reason ?? '未知原因'}`)
  }
  async function onApplySpells(): Promise<void> {
    const ok = await bridge.applySpells()
    setApplyMsg(ok ? '技能已携带' : '技能携带失败（可在客户端手动设置）')
  }

  return (
    <div className="panel drag-region">
      <div className="panel-title no-drag">
        <span>Lux · 排位</span>
        <span className="panel-actions">
          <button onClick={onExpand} title="详情">▾</button>
          <button onClick={onSettings} title="设置">⚙</button>
          <button onClick={onCollapse} title="收起">━</button>
        </span>
      </div>
      <div className="primary-row">
        <span className="champ-name">{nameOf(primary.championId, snapshot)}</span>
        <span className="score">{primary.score}</span>
      </div>
      <div className="reason">{primary.reason}{primary.partialData ? '（部分数据缺失）' : ''}</div>
      <div className="loadout">
        <div>符文：{runes ? `${KEYSTONES[runes.keystoneId] ?? `基石${runes.keystoneId}`}` : '暂无'}</div>
        <div>技能：{spells ? spells.spellIds.map(id => SPELL_NAMES[id] ?? id).join(' + ') : '暂无'}</div>
      </div>
      <div className="actions no-drag">
        <button onClick={() => void onApplyRunes()} disabled={!runes}>一键应用符文</button>
        <button onClick={() => void onApplySpells()} disabled={!spells}>携带技能</button>
      </div>
      {applyMsg && <div className="dim">{applyMsg}</div>}
    </div>
  )
}
```

`styles.css` 追加主面板样式（深蓝金、字号 13/16、间距 8）：

```css
.panel-title { display: flex; justify-content: space-between; align-items: center; color: var(--gold-bright); font-weight: 600; }
.panel-actions button { background: none; border: 1px solid var(--border-gold); color: var(--gold); border-radius: 4px; margin-left: 4px; padding: 0 6px; cursor: pointer; }
.primary-row { display: flex; justify-content: space-between; align-items: baseline; }
.champ-name { color: var(--gold-bright); font-size: 18px; font-weight: 700; }
.score { color: var(--gold); font-size: 14px; }
.reason { color: var(--text); font-size: 13px; }
.dim { color: var(--text-dim); font-size: 12px; }
.loadout { color: var(--text-dim); font-size: 12px; }
.actions { display: flex; gap: 8px; margin-top: auto; }
.actions button { flex: 1; background: linear-gradient(180deg, #1e3a5f, #16283f); color: var(--gold-bright); border: 1px solid var(--border-gold); border-radius: 4px; padding: 6px 0; cursor: pointer; }
.actions button:disabled { opacity: 0.4; cursor: default; }
```

- [ ] **Step 4: 验证（测试 + 截图目检）**

Run: `npm run test && npm run typecheck && npm run build`
Run: `LUX_UI_MOCK=1 npx electron out/main/index.mjs --screenshot /tmp/lux-shots`
然后 **用 Read 工具查看 `/tmp/lux-shots/main.png`**（多模态读图）：确认深蓝金面板、主推名、按钮渲染正常；不对就调 CSS 再截。

- [ ] **Step 5: 提交**

```bash
git add src/renderer
git commit -m "feat: main advice panel with one-click apply"
```

---

### Task 11: 展开详情 + 大乱斗面板 + 收起药丸

**Files:**
- Modify: `src/renderer/src/views/ExpandedPanel.tsx`、`AramPanel.tsx`、`CollapsedPill.tsx`、`styles.css`
- Test: `src/renderer/src/views/AramPanel.test.tsx`、`ExpandedPanel.test.tsx`

- [ ] **Step 1: 失败测试（两个）**

`AramPanel.test.tsx`：

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AramPanel } from './AramPanel'
import type { UiSnapshot } from '../bridge'

const snap: UiSnapshot = {
  kind: 'aram',
  queueId: 450,
  names: { 711: '薇克丝', 22: '艾希' },
  aram: {
    action: 'swap',
    reason: '建议换 艾希：版本强势：大乱斗胜率 54.6%',
    current: { championId: 711, score: 49.3, factors: [], dominantFactor: 'beginner', reason: '操作上手简单', partialData: false },
    bench: [],
    swapTo: { championId: 22, score: 66.4, factors: [], dominantFactor: 'strength', reason: '版本强势：大乱斗胜率 54.6%', partialData: false },
    runes: { keystoneId: 8008, runeIds: [8008, 8009, 9103, 8014, 8304, 8345, 5005, 5008, 5001], subStyleCode: 'qd', source: 'builtin' },
    spells: { spellIds: [4, 32], source: 'builtin' },
  },
}

describe('AramPanel', () => {
  it('渲染换/留判定与目标英雄', () => {
    render(<AramPanel snapshot={snap} />)
    expect(screen.getByText(/换 艾希/)).toBeTruthy()
    expect(screen.getByText(/闪现 \+ 标记/)).toBeTruthy()
  })
})
```

`ExpandedPanel.test.tsx`：数据用 Task 10 测试的 rift 快照 + `alternates` 两条；断言渲染备选两名与「返回」按钮。

- [ ] **Step 2: 实现三个视图**

`ExpandedPanel.tsx`：

```tsx
import type { UiSnapshot } from '../bridge'

export function ExpandedPanel({ snapshot }: { snapshot: UiSnapshot }): React.JSX.Element {
  if (snapshot.kind !== 'rift') return <div className="panel">…</div>
  return (
    <div className="panel drag-region">
      <div className="panel-title no-drag"><span>候选详情</span></div>
      <ul className="alt-list">
        {snapshot.advice.alternates.map(alt => (
          <li key={alt.championId}>
            <span className="champ-name">{snapshot.names?.[alt.championId] ?? `英雄${alt.championId}`}</span>
            <span className="score">{alt.score}</span>
            <div className="reason">{alt.reason}{alt.partialData ? '（部分数据缺失）' : ''}</div>
          </li>
        ))}
      </ul>
      <div className="dim">主推：{snapshot.names?.[snapshot.advice.primary.championId] ?? ''}（{snapshot.advice.primary.score}）· {snapshot.advice.primary.reason}</div>
    </div>
  )
}
```

`AramPanel.tsx`：

```tsx
import type { UiSnapshot } from '../bridge'

const SPELL_NAMES: Record<number, string> = { 1: '净化', 3: '虚弱', 4: '闪现', 6: '疾跑', 7: '治疗', 11: '惩戒', 12: '传送', 14: '点燃', 21: '护盾', 32: '标记' }

export function AramPanel({ snapshot }: { snapshot: UiSnapshot }): React.JSX.Element {
  if (snapshot.kind !== 'aram') return <div className="panel">…</div>
  const { aram } = snapshot
  const name = (id: number): string => snapshot.names?.[id] ?? `英雄${id}`
  const headline =
    aram.action === 'swap' && aram.swapTo
      ? `换 ${name(aram.swapTo.championId)}（${aram.swapTo.score}）`
      : aram.action === 'reroll'
        ? '掷骰子'
        : '留着'
  return (
    <div className="panel drag-region">
      <div className="panel-title no-drag"><span>大乱斗 · 当前：{name(aram.current.championId)}（{aram.current.score}）</span></div>
      <div className="primary-row"><span className="champ-name">建议：{headline}</span></div>
      <div className="reason">{aram.reason}</div>
      <div className="loadout">
        <div>符文：{aram.runes ? `基石${aram.runes.keystoneId}` : '暂无'}</div>
        <div>技能：{aram.spells ? aram.spells.spellIds.map(id => SPELL_NAMES[id] ?? id).join(' + ') : '暂无'}</div>
      </div>
    </div>
  )
}
```

`CollapsedPill.tsx`（悬停即展开——设计 §7「收起为药丸条（悬停展开）」）：

```tsx
export function CollapsedPill({ onClick }: { onClick(): void }): React.JSX.Element {
  return (
    <button className="pill drag-region no-drag" onClick={onClick} onMouseEnter={onClick}>
      Lux ▸
    </button>
  )
}
```

样式追加：

```css
.alt-list { list-style: none; display: flex; flex-direction: column; gap: 8px; overflow: auto; }
.alt-list li { border-top: 1px solid #1e2a3f; padding-top: 6px; }
.pill { width: 100%; height: 100%; background: var(--bg-panel); color: var(--gold); border: 1px solid var(--border-gold); border-radius: 22px; font-size: 13px; cursor: pointer; }
```

- [ ] **Step 3: 验证与提交**

Run: `npm run test && npm run typecheck && npm run build`
Run: 截图并 Read 查看 `/tmp/lux-shots/aram.png`、`/tmp/lux-shots/expanded.png`、`/tmp/lux-shots/pill.png`。

```bash
git add src/renderer
git commit -m "feat: expanded details, aram panel and collapsed pill views"
```

---

### Task 12: 设置页（开关 + 同步状态 + 手动同步 + 关于/声明）

**Files:**
- Modify: `src/renderer/src/views/Settings.tsx`、`styles.css`
- Test: `src/renderer/src/views/Settings.test.tsx`

- [ ] **Step 1: 失败测试**

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Settings } from './Settings'
import { createInertBridge } from '../bridge'

beforeEach(() => {
  ;(window as unknown as { lux: unknown }).lux = {
    ...createInertBridge(),
    getConfig: async () => ({ ownedFilter: true, modes: { rift: true, aram: true }, onboarded: true }),
    setConfig: vi.fn(async p => p),
    getManifest: async () => ({ patch: '16.19', dataDate: '20261007', updatedAt: '2026-10-08T00:00:00Z' }),
    syncNow: vi.fn(async () => ({ status: 'blocked-timegate', blockedUntil: '2026-10-09T10:00:00Z' })),
  }
})

describe('Settings', () => {
  it('加载配置与 manifest 并渲染开关', async () => {
    render(<Settings onClose={vi.fn()} />)
    expect(await screen.findByText(/16\.19/)).toBeTruthy()
    expect(screen.getByLabelText('候选池仅显示已拥有/周免')).toBeTruthy()
  })

  it('手动同步受时段限制时给出提醒', async () => {
    render(<Settings onClose={vi.fn()} />)
    fireEvent.click(await screen.findByText('立即同步'))
    expect(await screen.findByText(/时段限制/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: 实现 `Settings.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { getBridge } from '../bridge'

export interface SettingsProps {
  onClose(): void
}

interface Cfg {
  ownedFilter: boolean
  modes: { rift: boolean; aram: boolean }
  onboarded: boolean
}

export function Settings({ onClose }: SettingsProps): React.JSX.Element {
  const bridge = getBridge()
  const [cfg, setCfg] = useState<Cfg | null>(null)
  const [manifest, setManifest] = useState<Record<string, unknown> | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  useEffect(() => {
    void bridge.getConfig().then(c => setCfg(c as unknown as Cfg))
    void bridge.getManifest().then(m => setManifest(m))
    return bridge.onSyncProgress((d, t) => setProgress(t > 0 ? `同步中 ${d}/${t}` : null))
  }, [])

  async function patch(p: Partial<Cfg>): Promise<void> {
    const next = await bridge.setConfig(p as Record<string, unknown>)
    setCfg(next as unknown as Cfg)
  }

  async function onSync(): Promise<void> {
    setSyncMsg('同步中…')
    const result = (await bridge.syncNow()) as { status: string; blockedUntil?: string }
    if (result.status === 'blocked-timegate') {
      const until = result.blockedUntil ? new Date(result.blockedUntil).toLocaleString() : ''
      setSyncMsg(`处于时段限制内（工作日 9-12 / 14-18 禁止联网），下个可同步时间：${until}`)
    } else {
      setSyncMsg(`同步结束：${result.status}`)
      setManifest(await bridge.getManifest())
    }
  }

  if (!cfg) return <div className="panel">加载中…</div>
  const manifestText = manifest
    ? `版本 ${manifest.patch} · 数据日期 ${manifest.dataDate}${manifest.aramDate ? ` · 大乱斗 ${manifest.aramDate}` : ''}`
    : '尚未同步（点击下方按钮）'

  return (
    <div className="panel drag-region settings">
      <div className="panel-title no-drag">
        <span>设置</span>
        <span className="panel-actions"><button onClick={onClose}>✕</button></span>
      </div>
      <label className="cfg-row no-drag">
        <input type="checkbox" checked={cfg.ownedFilter} onChange={e => void patch({ ownedFilter: e.target.checked })} />
        候选池仅显示已拥有/周免
      </label>
      <label className="cfg-row no-drag">
        <input type="checkbox" checked={cfg.modes.rift} onChange={e => void patch({ modes: { ...cfg.modes, rift: e.target.checked } })} />
        启用排位/匹配推荐
      </label>
      <label className="cfg-row no-drag">
        <input type="checkbox" checked={cfg.modes.aram} onChange={e => void patch({ modes: { ...cfg.modes, aram: e.target.checked } })} />
        启用大乱斗换/留判定
      </label>
      <div className="cfg-section">
        <div className="dim">数据：{manifestText}</div>
        {progress && <div className="dim">{progress}</div>}
        <button className="no-drag" onClick={() => void onSync()}>立即同步</button>
        {syncMsg && <div className="dim">{syncMsg}</div>}
      </div>
      <div className="cfg-section about dim">
        <div>关于：Lux 为第三方新手辅助工具，数据来自腾讯 101 数据站（非官方产品）。</div>
        <div>声明：本工具只读取游戏客户端选人信息并写入符文/技能，不做任何代打行为；使用风险自负。</div>
      </div>
    </div>
  )
}
```

样式追加：

```css
.settings { gap: 10px; }
.cfg-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text); }
.cfg-section { border-top: 1px solid #1e2a3f; padding-top: 8px; display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
.cfg-section button { background: none; border: 1px solid var(--border-gold); color: var(--gold); border-radius: 4px; padding: 4px 8px; cursor: pointer; align-self: flex-start; }
.about { line-height: 1.5; }
```

（标签可访问性：CSS 中 `label.cfg-row` 包裹 input 与文本——`getByLabelText` 用文本匹配 ✓。）

- [ ] **Step 3: 验证与提交**

Run: `npm run test && npm run typecheck && npm run build`；截图并 Read `/tmp/lux-shots/settings.png`。

```bash
git add src/renderer
git commit -m "feat: settings view with toggles, sync status and manual sync"
```

---

### Task 13: 首启引导页

**Files:**
- Modify: `src/renderer/src/views/Onboarding.tsx`、`styles.css`
- Test: `src/renderer/src/views/Onboarding.test.tsx`

- [ ] **Step 1: 失败测试**

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Onboarding } from './Onboarding'

describe('Onboarding', () => {
  it('展示用途/时段说明/免责声明，点击开始回调', () => {
    const onDone = vi.fn()
    render(<Onboarding onDone={onDone} />)
    expect(screen.getByText(/选人阶段/)).toBeTruthy()
    expect(screen.getByText(/9.*12.*14.*18|9-12.*14-18/)).toBeTruthy()
    expect(screen.getByText(/免责|第三方/)).toBeTruthy()
    fireEvent.click(screen.getByText('开始使用'))
    expect(onDone).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 实现 `Onboarding.tsx`**

```tsx
export interface OnboardingProps {
  onDone(): void
}

export function Onboarding({ onDone }: OnboardingProps): React.JSX.Element {
  return (
    <div className="panel drag-region onboarding">
      <div className="panel-title"><span>欢迎使用 Lux</span></div>
      <div className="onboarding-body">
        <p>Lux 在你进入选人阶段时，根据双方阵容给出「选什么英雄、带什么天赋与召唤师技能」的建议，并可一键应用到客户端。</p>
        <p>数据来自腾讯 101 数据站；数据同步仅在允许时段进行（工作日 9-12、14-18 点不联网，其余时段与周末自动同步）。</p>
        <p>本工具为第三方新手辅助：只读取选人信息并写入符文/技能，不做任何代打行为；使用风险自负，与腾讯/Riot 无关。</p>
      </div>
      <button className="no-drag" onClick={onDone}>开始使用</button>
    </div>
  )
}
```

样式追加：

```css
.onboarding-body { display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: var(--text); line-height: 1.6; }
.onboarding button { margin-top: auto; background: linear-gradient(180deg, #1e3a5f, #16283f); color: var(--gold-bright); border: 1px solid var(--border-gold); border-radius: 4px; padding: 8px 0; cursor: pointer; }
```

- [ ] **Step 3: 验证与提交**

Run: `npm run test && npm run typecheck && npm run build`；截图 Read `/tmp/lux-shots/onboarding.png`。

```bash
git add src/renderer
git commit -m "feat: first-run onboarding view with disclaimer"
```

---

### Task 14: 图标生成 + NSIS 打包

**Files:**
- Create: `scripts/make-icon.py`、`assets/icon.png`、`assets/icon.ico`（脚本产物，入库）、`electron-builder.yml`
- Modify: `package.json`（若 build 配置走 package.json 则改此处；本计划采用独立 yml）

- [ ] **Step 1: 写图标生成脚本 `scripts/make-icon.py`（Pillow；miniconda 通常自带）**

```python
#!/usr/bin/env python3
"""生成 Lux 图标：深蓝圆角底 + 金色 L。用法：python3 scripts/make-icon.py"""
from PIL import Image, ImageDraw, ImageFont
import os

SIZE = 512
BG = (10, 20, 40, 255)       # 深蓝
GOLD = (200, 170, 110, 255)  # 金
img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([8, 8, SIZE - 8, SIZE - 8], radius=96, fill=BG, outline=GOLD, width=10)

font = None
for candidate in [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
]:
    if os.path.exists(candidate):
        font = ImageFont.truetype(candidate, 320)
        break
if font is None:
    font = ImageFont.load_default()

# 居中绘制 L
bbox = d.textbbox((0, 0), 'L', font=font)
w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
d.text(((SIZE - w) / 2 - bbox[0], (SIZE - h) / 2 - bbox[1] - 10), 'L', font=font, fill=GOLD)

os.makedirs('assets', exist_ok=True)
img.save('assets/icon.png')
img.save('assets/icon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print('assets/icon.png / assets/icon.ico 已生成')
```

- [ ] **Step 2: 生成并检查**

```bash
python3 scripts/make-icon.py && ls -la assets/
```

Expected: 两个文件生成。**用 Read 工具查看 `assets/icon.png`** 确认视觉（深蓝底、金 L、居中）。

- [ ] **Step 3: 写 `electron-builder.yml`**

```yaml
appId: com.giao1907.lux
productName: Lux
directories:
  output: release
  buildResources: assets
files:
  - out/**
  - package.json
win:
  target:
    - target: nsis
      arch:
        - x64
  icon: assets/icon.ico
nsis:
  oneClick: true
  perMachine: false
  artifactName: "Lux-Setup-${version}.exe"
```

- [ ] **Step 4: 打包**

```bash
npm run dist 2>&1 | tail -20
```

Expected: `release/Lux-Setup-0.3.0.exe` 生成（数十 MB 量级）。
若 electron-builder 首次运行下载 nsis/winCodeSign 失败：确认 `.npmrc` 镜像生效（`electron_builder_binaries_mirror`），或临时 `ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/` 环境变量重试。
若报“cannot build NSIS on Linux”（现代版本不会）——备用：`electron-builder --win portable` 产出免安装版 exe，并在报告中注明。

- [ ] **Step 5: 产物检查**

```bash
ls -la release/*.exe
npx asar list release/win-unpacked/resources/app.asar 2>/dev/null | head -20 || echo '（asar 工具缺失则跳过；打包已成功即可）'
```

Expected: exe 存在。检查 asar 中**不含** `shared/lcu/mock`、`test-certs`、`scripts/`——若 asar 工具不可用，人工确认 `files` 仅含 `out/**` 与 `package.json` 即可（源码 shared/ 不进包，只以 bundle 形式在 out/main 内）。

- [ ] **Step 6: 提交（含产物？不入库二进制）**

```bash
echo 'release/' >> .gitignore
git add .gitignore scripts/make-icon.py assets/icon.png assets/icon.ico electron-builder.yml package.json
git commit -m "feat: app icon and nsis packaging config"
```

（`release/` 已被 .gitignore 覆盖与否先检查：现有 .gitignore 已有 `release/` —— 若已有则无需追加；`echo >>` 可能重复，执行时先 `grep -q '^release/' .gitignore || echo 'release/' >> .gitignore`。）

- [ ] **Step 7: （可选，工具链允许时）安装包内应用冒烟**

```bash
npm i -D asar && npx asar extract release/win-unpacked/resources/app.asar /tmp/lux-asar && ls /tmp/lux-asar/out/main
```

Expected: 仅含构建产物（main/preload/renderer）。

---

### Task 15: README、最终审查与收尾

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 更新 README**

「当前状态」改为：**v1 完成**——Electron 独立应用（置顶小窗四状态、托盘、设置、首启引导）+ 数据层/引擎/LCU 集成 + NSIS 安装包。追加「安装与使用」：`release/Lux-Setup-0.3.0.exe` 双击安装（未签名，SmartScreen 提示 → 更多信息 → 仍要运行）；首次使用建议在允许时段打开以完成数据同步。文档列表加本计划链接。开发命令补 `npm run dev` / `npm run dist`。

- [ ] **Step 2: 全量验证**

Run: `npm run test && npm run typecheck && npm run build && npm run dist`
Expected: 全过 + 安装包生成。

- [ ] **Step 3: 提交并推送**

```bash
git add README.md
git commit -m "docs: document v1 app usage and packaging"
HTTPS_PROXY=socks5://172.24.144.1:7891 git push
```

（推送需代理；若代理不可用先本地提交，推送留待用户。）

---

## 完成后状态（Phase 3B / v1 交付物）

- Electron 应用：置顶小窗（主/展开/大乱斗/收起药丸四状态）、位置记忆+贴边、离开选人自动隐藏、托盘（显示/设置/退出）、设置页（候选池与模式开关、同步状态、手动同步（时段门控）、关于/免责声明）、首启引导页
- 引擎与 LCU 集成全链路接入 main 进程（异步 compute 契约、owned/熟练度缓存、自动同步 + 3 小时轮询）
- `Lux-Setup-0.3.0.exe`：双击安装/卸载；未签名（安装说明告知 SmartScreen）
- 验收装置：`LUX_UI_MOCK=1 --screenshot`（六视图 PNG）+ RTL 组件测试 + 既有 169 项核心测试

## 风险与注意

- **electron 二进制下载**：一律经 .npmrc 镜像；若 install 卡住，检查镜像网络而非 GitHub。
- **截图验收**：每次 UI 改动后必须重新截图并用 Read 看图确认（本仓库的地道做法：文本测试 + 肉眼看图双轨）。
- **打包排除**：mock、fixtures、scripts 不得进入产物（files 白名单已限定）。
- **真机验证**：安装 exe 后由用户实测（选人建议/一键符文/大乱斗判定）；WSL 侧核对的 8992 等已在测试面覆盖。发现字段不对时回到 `--dump` 与 live CLI 定位。
- **时段约束**：应用内同步受 9-12/14-18 禁窗限制（timegate 已内建）；UI 开发与打包不受限。
