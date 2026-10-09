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
  /** 'synced' | 'up-to-date' | 'partial' | 'failed' | 'blocked'（开发工具注入时段门禁时）| … */
  status: string
  blockedUntil?: string
  patch?: string | null
}

/** LCU 连接诊断（主进程 2s 推送给 renderer，等待态 UI 展示，跨机器排障用） */
export interface LcuInfo {
  status: string
  lockDir: string | null
  port: number | null
  lastError: string | null
}
