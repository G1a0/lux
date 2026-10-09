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
  onOpenView: (cb: (view: string) => void) => {
    const h = (_e: unknown, view: string) => cb(view)
    ipcRenderer.on('lux:open-view', h)
    return () => ipcRenderer.removeListener('lux:open-view', h)
  },
  onSyncProgress: (cb: (d: number, t: number) => void) => {
    const h = (_e: unknown, d: number, t: number) => cb(d, t)
    ipcRenderer.on('lux:sync-progress', h)
    return () => ipcRenderer.removeListener('lux:sync-progress', h)
  },
  onLcuInfo: (cb: (info: unknown) => void) => {
    const h = (_e: unknown, info: unknown) => cb(info)
    ipcRenderer.on('lux:lcu-info', h)
    return () => ipcRenderer.removeListener('lux:lcu-info', h)
  },
  applyRunes: () => ipcRenderer.invoke('lux:apply-runes'),
  applySpells: () => ipcRenderer.invoke('lux:apply-spells'),
  getConfig: () => ipcRenderer.invoke('lux:get-config'),
  setConfig: (patch: unknown) => ipcRenderer.invoke('lux:set-config', patch),
  setWindowState: (state: string) => ipcRenderer.send('lux:set-window-state', state),
  setPinned: (pinned: boolean) => ipcRenderer.send('lux:set-pinned', pinned),
  getManifest: () => ipcRenderer.invoke('lux:get-manifest'),
  syncNow: () => ipcRenderer.invoke('lux:sync-now'),
  quit: () => ipcRenderer.invoke('lux:quit'),
}

contextBridge.exposeInMainWorld('lux', bridge)
