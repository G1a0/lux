// 从 LCU 本地资源构建引擎用 ChampionIndex。
// 契约依据：归档 champion-data.ts（真机验证过 tacticalInfo.damageType 取值）。
import type { ChampionIndex, ChampionMeta, ChampionRole, DamageType } from '../champions/meta'
import { createChampionIndex } from '../champions/meta'
import type { LcuHttp } from './http'
import type { ChampionDetail, ChampionSummaryEntry } from './types'

const ROLE_MAP: Record<string, ChampionRole> = {
  FIGHTER: 'fighter',
  TANK: 'tank',
  MAGE: 'mage',
  ASSASSIN: 'assassin',
  MARKSMAN: 'marksman',
  SUPPORT: 'support',
}

export function toDamageType(raw: unknown): DamageType {
  if (raw === 'kDamageTypeMagic') return 'ap'
  if (raw === 'kDamageTypePhysical') return 'ad'
  if (raw === 'kDamageTypeMixed') return 'mixed'
  return 'mixed'
}

/** 难度归一化：0-1 → ×10；1-10 → 原值；>10 → ÷10；缺失 → 5；截断 1-10 取整 */
export function normalizeDifficulty(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return 5
  const scaled = raw <= 1 ? raw * 10 : raw <= 10 ? raw : raw / 10
  return Math.max(1, Math.min(10, Math.round(scaled)))
}

function toRoles(raw: string[] | undefined): ChampionRole[] {
  return (raw ?? []).flatMap(r => {
    const mapped = ROLE_MAP[r.toUpperCase()]
    return mapped ? [mapped] : []
  })
}

export async function buildChampionIndex(http: LcuHttp, concurrency = 8): Promise<ChampionIndex> {
  const summary = await http.get<ChampionSummaryEntry[]>('/lol-game-data/assets/v1/champion-summary.json')
  const entries = (summary ?? []).filter(e => e.id > 0 && e.name)

  const metas: ChampionMeta[] = []
  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < entries.length) {
      const entry = entries[cursor++]
      let detail: ChampionDetail | null = null
      try {
        detail = await http.get<ChampionDetail>(`/lol-game-data/assets/v1/champions/${entry.id}.json`)
      } catch {
        detail = null // 单个英雄失败不阻塞（404/超时 → 兜底）
      }
      const roles = toRoles(detail?.roles ?? entry.roles)
      metas.push({
        id: entry.id,
        name: entry.name,
        damageType: toDamageType(detail?.tacticalInfo?.damageType),
        roles,
        difficulty: normalizeDifficulty(detail?.playstyleInfo?.difficulty),
      })
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, worker))

  return createChampionIndex(metas)
}
