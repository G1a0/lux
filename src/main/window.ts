// 主窗口：无边框置顶；位置记忆 + 贴边；按 advisor 状态显隐；按视图切换尺寸。
import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { clampToWorkArea, snapToEdge } from './window-logic'
import type { ConfigStore } from './config'

export const SIZES: Record<string, [number, number]> = {
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
  /** 托盘「显示小窗」：置顶显示并抑制自动隐藏，直到用户隐藏/离开 */
  setPinned(pinned: boolean): void
  win(): BrowserWindow | null
}

export function createWindowManager(config: ConfigStore): WindowManager {
  let win: BrowserWindow | null = null
  let adviceActive = false
  let pinned = false
  const ALWAYS_VISIBLE_VIEWS = new Set(['settings', 'onboarding'])
  let currentView = 'main'

  function updateVisibility(): void {
    if (!win) return
    if (pinned || adviceActive || ALWAYS_VISIBLE_VIEWS.has(currentView)) win.showInactive()
    else win.hide()
  }

  function currentWorkArea(): Electron.Rectangle | null {
    if (!win) return null
    return screen.getDisplayMatching(win.getBounds()).workArea // 多显示器：按窗口所在屏幕约束
  }

  return {
    create() {
      // 磁盘 JSON 不受类型保护：仅接受有限数值坐标，否则回退默认锚点
      const rawSaved = config.get().windowPos
      const saved = rawSaved && Number.isFinite(rawSaved.x) && Number.isFinite(rawSaved.y) ? rawSaved : null
      const size = { width: SIZES.main[0], height: SIZES.main[1] }
      const anchor = saved ?? { x: 24, y: 120 }
      const workArea = screen.getDisplayMatching({ x: anchor.x, y: anchor.y, width: 1, height: 1 }).workArea
      const pos = clampToWorkArea(anchor, size, workArea)

      win = new BrowserWindow({
        ...pos,
        ...size,
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
      // dev 模式走 vite dev server；构建产物回退文件
      if (process.env.ELECTRON_RENDERER_URL) {
        void win.loadURL(process.env.ELECTRON_RENDERER_URL)
      } else {
        win.loadFile(join(__dirname, '../renderer/index.html'))
      }

      const savePos = (): void => {
        if (!win) return
        const [x, y] = win.getPosition()
        const [w, h] = win.getSize()
        const area = screen.getDisplayMatching(win.getBounds()).workArea
        const snapped = snapToEdge({ x, y }, { width: w, height: h }, area)
        if (snapped.x !== x || snapped.y !== y) win.setPosition(snapped.x, snapped.y)
        config.set({ windowPos: snapped })
      }
      // 拖动期间 'moved' 可能高频触发：200ms 尾部防抖，停止后只落盘一次
      let saveTimer: ReturnType<typeof setTimeout> | null = null
      win.on('moved', () => {
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
          saveTimer = null
          if (win && !win.isDestroyed()) savePos()
        }, 200)
      })
      return win
    },
    setView(state) {
      if (!win) return
      currentView = state
      const size = SIZES[state] ?? SIZES.main
      win.setSize(size[0], size[1])
      const area = currentWorkArea()
      if (area) {
        const [x, y] = win.getPosition()
        const clamped = clampToWorkArea({ x, y }, { width: size[0], height: size[1] }, area)
        if (clamped.x !== x || clamped.y !== y) win.setPosition(clamped.x, clamped.y)
      }
      updateVisibility()
    },
    setAdviceActive(active) {
      adviceActive = active
      updateVisibility()
    },
    setPinned(next) {
      pinned = next
      updateVisibility()
    },
    win: () => win,
  }
}
