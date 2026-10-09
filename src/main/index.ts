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
  // Task 7 引入 WindowManager 后替换：按视图状态调整窗口尺寸的临时实现
  ipcMain.on('lux:set-window-state', (_e, state: string) => {
    const sizes: Record<string, [number, number]> = {
      main: [380, 240],
      expanded: [380, 460],
      aram: [380, 280],
      pill: [220, 48],
      settings: [420, 520],
      onboarding: [420, 560],
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
