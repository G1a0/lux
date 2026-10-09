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

app.whenReady().then(async () => {
  const win = createWindow()
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
