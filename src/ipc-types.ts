// 三端共享的载荷/状态类型（main ↔ preload ↔ renderer）。
import type { AramJudgeResult, RiftAdvice } from '../shared/engine/types'
import type { LcuDirProbe } from '../shared/lcu/lockfile'

export type AdvicePayload =
  | { kind: 'rift'; queueId: number; advice: RiftAdvice; names?: Record<number, string> }
  | { kind: 'aram'; queueId: number; aram: AramJudgeResult; names?: Record<number, string> }
  | { kind: 'unsupported'; queueId: number }
  | { kind: 'none'; reason?: 'aram-pre-pick' | 'compute-error' | 'mode-off' }

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
  /** 当前手动指定的目录（正在探测的目标）；自动发现时为 null */
  targetDir: string | null
  /** 等待态且指定了目录时：该目录的 lockfile 探测详情（UI 排障文案依据） */
  targetProbe: LcuDirProbe | null
  /** 最近一次客户端进程探测摘要（不含 token/命令行原文） */
  processNote: string | null
}
