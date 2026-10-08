import type { EngineData } from './data'
import type { FactorResult } from './types'

function championName(id: number, data: EngineData): string {
  return data.champion(id)?.name ?? `英雄${id}`
}

function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

export function buildReason(dominant: FactorResult | null, data: EngineData, modeLabel: string): string {
  const detail = dominant?.detail
  if (!dominant || !detail || dominant.score === null) return '适合当前阵容'

  switch (detail.kind) {
    case 'matchup': {
      const enemy = championName(detail.enemyChampionId, data)
      const prefix = detail.winRate >= 0.5 ? '对线好打' : '对线有压力'
      return `${prefix}：对 ${enemy} 胜率 ${pct(detail.winRate)}`
    }
    case 'synergy':
      return `和队友 ${championName(detail.allyChampionId, data)} 是黄金搭档（胜率 ${pct(detail.winRate)}）`
    case 'strength': {
      const wr = detail.winRate === null ? '—' : pct(detail.winRate)
      const tier = detail.tier ? `（${detail.tier}）` : ''
      return `版本强势：${modeLabel}胜率 ${wr}${tier}`
    }
    case 'composition':
      return detail.text
    case 'beginner':
      return '操作上手简单，适合新手'
  }
}
