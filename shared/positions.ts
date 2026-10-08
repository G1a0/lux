// src/lib/positions.ts
// 三层位置值域：LCU(middle/bottom) → 内部(mid/bot) → QQ101(MIDDLE/BOTTOM)

export type InternalPosition = 'top' | 'jungle' | 'mid' | 'bot' | 'utility'

export const POSITION_ORDER: readonly InternalPosition[] = ['top', 'jungle', 'mid', 'bot', 'utility']

export const POSITION_LABELS: Record<string, string> = {
  top: '上路',
  jungle: '打野',
  mid: '中路',
  bot: '下路',
  utility: '辅助',
}

export function normalizeLcuPosition(raw: string | undefined): InternalPosition | '' {
  switch (raw) {
    case 'top': return 'top'
    case 'jungle': return 'jungle'
    case 'middle': case 'mid': return 'mid'
    case 'bottom': case 'bot': return 'bot'
    case 'utility': case 'support': return 'utility'
    default: return ''
  }
}

export type Qq101Lane = 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'SUPPORT'

export function toQq101Lane(position: InternalPosition | ''): Qq101Lane | null {
  switch (position) {
    case 'top': return 'TOP'
    case 'jungle': return 'JUNGLE'
    case 'mid': return 'MIDDLE'
    case 'bot': return 'BOTTOM'
    case 'utility': return 'SUPPORT'
    default: return null
  }
}

export function fromQq101Position(raw: string): InternalPosition | '' {
  switch (raw) {
    case 'TOP': return 'top'
    case 'JUNGLE': return 'jungle'
    case 'MIDDLE': return 'mid'
    case 'BOTTOM': return 'bot'
    case 'SUPPORT': return 'utility'
    default: return ''
  }
}
