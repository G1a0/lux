// 系统托盘：显示/隐藏小窗、打开设置、退出。
import { app, Menu, nativeImage, Tray } from 'electron'

// 32×32 深蓝金托盘图标（由 assets/icon 同风格生成；避免打包 extraResources）
const TRAY_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADpklEQVR4nO1XTWgkRRT+XlX1ZKZnMztOQrKyh3jJyQiJuIgrhjUXrwHTE9Y9yrK5bPQaMRTNil7VvcwePJqQHgWvXlyIuBIUIxhPuehBJCGOQyY7P91V9TzMTH7cKNmJay754EF3dfX7vle8erwHHAOOAnnc+mnwTz7V3xe01oKKoQ2CQC7euDyRWLxEQL5lHCBOyOaAPiXAQNWT+PbOp7+tU7FstdYiDEN3eCsdfmbWRBS678pvXZdKvANgLOUpEBF6ATMjTgwAbFjj3r8SfLTMrAVRyAAYOIiJoigQRKFbK8+Xstm+JccYM8YysTUEY4gf02AMsTXGWHaMsWy2b2mtPF8iCl0UBaIbPLWVakEUum9WbpcG8/6tSrVu+n1P/P5HQ6yub2O70oCUBOaTRU4EWMsYKmQwOTGEpwcyrlZPXCHvq51q/d7Ls3fnupx0X2v1ahiaByu3i0/lMivVWjNJKaE+++pX+uSLTWxXGp3D6gEEDBUyeHN6FDNTIxwbZ/L9ae/P3cbs1dm70X2tFWmtRfAsVA2Vn1JKjaY88NKXv4gPSj8inUvB806aeccjSRyauzEW5sbxxmvPuDgBxcZs9qPwXPlnGAKAB5+//Xxa0PfWWq7uJeL6u19jr55AKQHneg2/DSEIxjhc8D0sv/cK8hc8J6WkpuMXrr7+4Q/t8KydTHmK/D7lVte3sFNpwPNOTw4AzjE8T2Cn0sDq+hb8PuVSniJYOwl06gAR8kQEArBVaYJOz/sIiDu+qU1IhDzQvYYkTHejktRzzv0buOP7QFGbsy2Aef/LSa9aTyL4yAsdCDhDnAs4F3Au4FxApxQfVP8eu68T4YjvDmenFLv95tRYxpPQQB3f++hwKgBgRpWZAQaGC2nwE1DA1PHNAIPBjCrQPQEpV+PEcL1lxOTEMAYLGSSJgxCnVyIEIUkcBgsZTE4Mo94yIk4MQ8pVABBaa5GzFzdaidkUQtKlgbS7OT2K5m4MYxykpFOZMe2W7Ob0KC4NpJ0QklqJ2czZixtaayGuAWKsGMbMWPQzHu01rJ2ZGuGFuXHkfA+1Wozabo9Wi5HzPSzMjWNmaoT3Gtb6GY+YsThWDONrgDj7trz7TxQFolgs27XyfKk/m75VbyZw1nI2rSwJPH5rTgA74GHTSCEl+WkPtYfNey8GH89FUSCLxbIDjub7mYxmh4dTJgpZay2uBOFyEATR4o3LE61W8p8Mp+VyezglOjqcHq/8fxzP/wIKOji0TFYsGwAAAABJRU5ErkJggg=='

export interface TrayDeps {
  show(): void
  hide(): void
  openSettings(): void
}

export function createAppTray(deps: TrayDeps): Tray {
  const tray = new Tray(nativeImage.createFromDataURL(TRAY_ICON))
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
