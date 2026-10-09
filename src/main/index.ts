import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { createApp } from './app'
import { createWindowManager, type WindowManager } from './window'
import { captureAllViews } from './screenshot'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1'

const UI_MOCK = process.env.LUX_UI_MOCK === '1'
const screenshotArgIdx = process.argv.indexOf('--screenshot')

let bundle: ReturnType<typeof createApp> | null = null
let windows: WindowManager | null = null

// 截图装置（UI_MOCK）专用：简单窗口，立即可见，使 capturePage 拿到非空图。
// 位置记忆/贴边/显隐/尺寸仅由正式路径的 WindowManager 负责。
function createMockWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 380,
    height: 240,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    show: true,
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
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

function wireIpc(win: BrowserWindow, manager: WindowManager): void {
  if (!bundle) return
  const { service } = bundle
  service.onSnapshot(s => win.webContents.send('lux:snapshot', s))
  service.onStatus(s => {
    win.webContents.send('lux:status', s)
    // 选人中 → 展示建议面板；离开选人 → 隐藏（settings/onboarding 视图由 manager 内部保持可见）
    manager.setAdviceActive(s === 'in-champ-select')
  })
  service.onSyncProgress((d, t) => win.webContents.send('lux:sync-progress', d, t))

  ipcMain.handle('lux:apply-runes', () => service.applyRunes())
  ipcMain.handle('lux:apply-spells', () => service.applySpells())
  ipcMain.handle('lux:get-config', () => service.getConfig())
  ipcMain.handle('lux:set-config', (_e, patch) => service.setConfig(patch))
  ipcMain.handle('lux:get-manifest', () => service.getManifest())
  ipcMain.handle('lux:sync-now', () => service.syncNow())
  ipcMain.handle('lux:quit', () => app.quit())
  // 视图 → 窗口尺寸/显隐（renderer 切视图时上报）
  ipcMain.on('lux:set-window-state', (_e, state: string) => manager.setView(state))
}

app.whenReady().then(async () => {
  let win: BrowserWindow
  if (UI_MOCK) {
    win = createMockWindow()
  } else {
    bundle = createApp()
    windows = createWindowManager(bundle.config) // 共享同一 ConfigStore，勿再 new
    win = windows.create()
    wireIpc(win, windows) // 先接 IPC，再启动服务：避免启动早期事件因监听未就位而丢失
    bundle.service.start()
  }
  if (screenshotArgIdx >= 0) {
    const dir = process.argv[screenshotArgIdx + 1] ?? 'screenshots'
    // 正式路径窗口初始隐藏；隐藏窗口 capturePage 会得到空图
    if (!win.isVisible()) win.showInactive()
    await new Promise<void>(resolve => win.webContents.once('did-finish-load', () => resolve()))
    const files = await captureAllViews(win, dir)
    console.log('[screenshot] 已生成：', files.join(', '))
    app.exit(0)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('before-quit', () => bundle?.service.stop())
