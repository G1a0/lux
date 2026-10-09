// 三端共享的载荷/状态类型（main ↔ preload ↔ renderer）。
import type { AramJudgeResult, RiftAdvice } from '../shared/engine/types'

export type AdvicePayload =
  | { kind: 'rift'; queueId: number; advice: RiftAdvice; names?: Record<number, string> }
  | { kind: 'aram'; queueId: number; aram: AramJudgeResult; names?: Record<number, string> }
  | { kind: 'unsupported'; queueId: number }
  | { kind: 'none' }

export interface ManifestInfo {
  patch: string
  dataDate: string
  aramDate?: string
  updatedAt: string
}

export interface SyncOutcome {
  /** 'blocked-timegate' | 'synced' | 'up-to-date' | 'partial' | 'failed' | … */
  status: string
  blockedUntil?: string
  patch?: string | null
}
