// renderer 侧桥接口：生产走 preload 暴露的 window.lux；LUX_UI_MOCK/浏览器开发时降级为本地 mock。
import type { RiftAdvice, AramJudgeResult } from '../../../shared/engine/types'

export type UiSnapshot =
  | { kind: 'rift'; queueId: number; advice: RiftAdvice; names?: Record<number, string> }
  | { kind: 'aram'; queueId: number; aram: AramJudgeResult; names?: Record<number, string> }
  | { kind: 'unsupported'; queueId: number }
  | { kind: 'none' }

export interface UiBridge {
  onSnapshot(cb: (s: UiSnapshot) => void): () => void
  onStatus(cb: (s: string) => void): () => void
  onView(cb: (view: string, snap: unknown) => void): () => void
  onOpenView(cb: (view: string) => void): () => void
  applyRunes(): Promise<{ ok: boolean; reason?: string }>
  applySpells(): Promise<boolean>
  getConfig(): Promise<Record<string, unknown>>
  setConfig(patch: Record<string, unknown>): Promise<Record<string, unknown>>
  setWindowState(state: string): void
  getManifest(): Promise<Record<string, unknown> | null>
  syncNow(): Promise<Record<string, unknown>>
  onSyncProgress(cb: (done: number, total: number) => void): () => void
  quit(): void
}

declare global {
  interface Window {
    lux?: Partial<UiBridge> & Record<string, unknown>
  }
}

export function getBridge(): UiBridge {
  // 合并式降级：preload 尚未暴露全部方法时（如 Task 6 前的阶段），缺的调用回退到惰性实现而非抛错
  return { ...createInertBridge(), ...(window.lux as Partial<UiBridge> | undefined) }
}

/** 无 preload 时（浏览器预览/未注入）的安全降级：不抛错、不动作。 */
export function createInertBridge(): UiBridge {
  return {
    onSnapshot: () => () => {},
    onStatus: () => () => {},
    onView: () => () => {},
    onOpenView: () => () => {},
    applyRunes: async () => ({ ok: false, reason: '未连接应用主进程' }),
    applySpells: async () => false,
    getConfig: async () => ({}),
    setConfig: async p => p,
    setWindowState: () => {},
    getManifest: async () => null,
    syncNow: async () => ({ status: 'unavailable' }),
    onSyncProgress: () => () => {},
    quit: () => {},
  }
}
