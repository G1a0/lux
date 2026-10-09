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
