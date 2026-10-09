// 系统托盘：显示/隐藏小窗、打开设置、退出。
import { app, Menu, nativeImage, Tray } from 'electron'

// 1x1 金色（#C89B3C）像素占位（Task 15 替换为 assets 真图标）。
// 注：计划里给的 base64 是坏 PNG（nativeImage 解码为空图），此常量经 Electron 实测可解码。
const GOLD_PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGM4MdvmPwAGbQKfuURvDQAAAABJRU5ErkJggg=='

export interface TrayDeps {
  show(): void
  hide(): void
  openSettings(): void
}

export function createAppTray(deps: TrayDeps): Tray {
  const tray = new Tray(nativeImage.createFromDataURL(GOLD_PX).resize({ width: 16, height: 16 }))
  tray.setToolTip('Lux - 选人助手')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示小窗', click: () => deps.show() },
      { label: '隐藏小窗', click: () => deps.hide() },
      { label: '设置', click: () => deps.openSettings() },
      { type: 'separator' },
      { label: '退出 Lux', click: () => app.quit() },
    ]),
  )
  tray.on('click', () => deps.show())
  return tray
}
