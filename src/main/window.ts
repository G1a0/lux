// 主窗口：无边框置顶透明；位置记忆 + 贴边；按 advisor 状态/当前视图显隐；按视图切换尺寸。
// 仅用于正式路径（!UI_MOCK）；截图装置（UI_MOCK）继续用 index.ts 里的简单窗口。
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

/** 这些视图下窗口必须保持可见（用户在主动操作，不依赖选人状态）。 */
const ALWAYS_VISIBLE_VIEWS = new Set(['settings', 'onboarding'])

export interface WindowManager {
  create(): BrowserWindow
  setView(state: string): void
  setAdviceActive(active: boolean): void
  win(): BrowserWindow | null
}

export function createWindowManager(config: ConfigStore): WindowManager {
  let win: BrowserWindow | null = null
  let adviceActive = false
  let currentView = 'main'

  function updateVisibility(): void {
    if (!win) return
    // 选人中（建议需要展示）或用户正在设置/引导页 → 可见；否则离开选人自动隐藏。
    if (adviceActive || ALWAYS_VISIBLE_VIEWS.has(currentView)) win.showInactive()
    else win.hide()
  }

  return {
    create() {
      const saved = config.get().windowPos
      const area = screen.getPrimaryDisplay().workArea
      const size = { width: SIZES.main[0], height: SIZES.main[1] }
      const pos = clampToWorkArea(saved ?? { x: area.x + area.width - size.width - 24, y: area.y + 120 }, size, area)

      win = new BrowserWindow({
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        show: false,
        transparent: true,
        backgroundColor: '#00000000',
        webPreferences: {
          preload: join(__dirname, '../preload/index.mjs'),
          contextIsolation: true,
          sandbox: false,
        },
      })
      // dev 模式走 electron-vite 的 vite dev server（HMR）；构建产物/打包运行时回退到文件
      if (process.env.ELECTRON_RENDERER_URL) {
        void win.loadURL(process.env.ELECTRON_RENDERER_URL)
      } else {
        void win.loadFile(join(__dirname, '../renderer/index.html'))
      }

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
      currentView = state
      const size = SIZES[state] ?? SIZES.main
      win.setSize(size[0], size[1])
      const [x, y] = win.getPosition()
      const area = screen.getPrimaryDisplay().workArea
      // 尺寸变化后位置可能越界：约束回工作区（显式取坐标，不用 Object.values 的元组断言）
      const clamped = clampToWorkArea({ x, y }, { width: size[0], height: size[1] }, area)
      win.setPosition(clamped.x, clamped.y)
      updateVisibility()
    },
    setAdviceActive(active) {
      adviceActive = active
      updateVisibility()
    },
    win: () => win,
  }
}
