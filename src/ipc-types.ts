// 三端共享的载荷/状态类型（main ↔ preload ↔ renderer）。
import type { AramJudgeResult, RiftAdvice } from '../shared/engine/types'

export interface RunestSpellDisplay {
  keystoneId: number
  runeIds: number[]
  subStyleCode?: string
  source: 'qq101' | 'builtin'
}

export type AdvicePayload =
  | { kind: 'rift'; queueId: number; advice: RiftAdvice }
  | { kind: 'aram'; queueId: number; aram: AramJudgeResult }
  | { kind: 'unsupported'; queueId: number }
  | { kind: 'none' }

export interface ManifestInfo {
  patch: string
  dataDate: string
  aramDate?: string
  updatedAt: string
}

export interface SyncOutcome {
  status: string
  blockedByTimegate?: boolean
  blockedUntil?: string
  patch?: string | null
}
