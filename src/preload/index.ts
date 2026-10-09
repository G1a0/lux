import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('lux', { ping: () => 'pong' })
