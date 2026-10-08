// 101.qq.com(腾讯官方) 数据源解析。响应外层: {code, data: {result: "<JSON字符串">}}
// 记录格式: '#' 分隔记录、'_' 分隔字段、百分比为 0-100 数值

import { fromQq101Position } from '../positions'
import type {
  Qq101AramHero,
  Qq101Matchup,
  Qq101RunePage,
  Qq101SpellCombo,
  Qq101Synergy,
  Qq101TierList,
} from './types'

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function percentToRatio(value: string | undefined): number | null {
  const n = toNumber(value)
  return n === null ? null : n / 100
}

function splitRecords(value: string | undefined): string[] {
  return (value ?? '').split('#').filter(Boolean)
}

export function extractQq101Inner(response: unknown): string | null {
  if (typeof response !== 'object' || response === null) return null
  const envelope = response as { code?: unknown; data?: unknown }
  if (envelope.code !== 0) return null

  const { data } = envelope
  if (typeof data === 'string') return data || null
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (typeof record.result === 'string' && record.result) return record.result
    const fields = record._fieldValues
    if (typeof fields === 'object' && fields !== null) {
      const first = Object.values(fields as Record<string, unknown>)[0]
      if (typeof first === 'string' && first) return first
    }
  }
  return null
}

function parseInner<T>(response: unknown): T | null {
  const inner = extractQq101Inner(response)
  if (!inner) return null
  try {
    return JSON.parse(inner) as T
  } catch {
    return null
  }
}

export function parseQq101Versions(response: unknown): string[] {
  const envelope = response as { code?: unknown; data?: unknown } | null
  if (!envelope || envelope.code !== 0 || !Array.isArray(envelope.data)) return []
  return envelope.data.flatMap(item => {
    const name = (item as { name?: unknown } | null)?.name
    return typeof name === 'string' && name ? [name] : []
  })
}

export function parseQq101TierList(response: unknown): Qq101TierList {
  const payload = parseInner<{ dtstatdate?: string; datadetails?: string }>(response)
  if (!payload) return { date: '', champions: [] }

  const champions = splitRecords(payload.datadetails).flatMap(record => {
    const fields = record.split('_')
    const championId = toNumber(fields[1])
    if (championId === null) return []
    return [{
      rank: toNumber(fields[0]),
      championId,
      strengthTier: fields[2] ?? '',
      position: fromQq101Position(fields[3] ?? ''),
      winRate: percentToRatio(fields[4]),
      pickRate: percentToRatio(fields[5]),
      banRate: percentToRatio(fields[6]),
      counterChampionIds: (fields[7] ?? '')
        .split(',')
        .map(id => toNumber(id))
        .filter((id): id is number => id !== null),
    }]
  })

  return { date: payload.dtstatdate ?? '', champions }
}

export function parseQq101Matchups(response: unknown): Qq101Matchup[] {
  const payload = parseInner<{ high_op_details?: string; low_op_details?: string }>(response)
  if (!payload) return []

  const parseList = (value: string | undefined, favorable: boolean) =>
    splitRecords(value).flatMap(record => {
      const fields = record.split('_')
      const championId = toNumber(fields[1])
      if (championId === null) return []
      return [{ championId, winRate: percentToRatio(fields[2]), favorable }]
    })

  return [
    ...parseList(payload.high_op_details, true),
    ...parseList(payload.low_op_details, false),
  ]
}

export function parseQq101Synergies(response: unknown): Qq101Synergy[] {
  const payload = parseInner<{ data_details?: string }>(response)
  if (!payload) return []

  return splitRecords(payload.data_details).flatMap(record => {
    const fields = record.split('_')
    const championId = toNumber(fields[1])
    if (championId === null) return []
    return [{
      championId,
      winRate: percentToRatio(fields[2]),
      games: toNumber(fields[3]),
    }]
  })
}

export function parseQq101RunePages(response: unknown): Qq101RunePage[] {
  const payload = parseInner<{ rune_top_details?: string }>(response)
  if (!payload) return []

  const pages = splitRecords(payload.rune_top_details).flatMap(record => {
    const fields = record.split('_')
    if (fields.length < 7) return []
    const rank = toNumber(fields[0])
    const keystoneId = toNumber(fields[1])
    if (rank === null || keystoneId === null) return []
    return [{
      rank,
      keystoneId,
      subStyleCode: (fields[2] ?? '').toLowerCase(),
      runeIds: (fields[3] ?? '')
        .split(',')
        .map(id => toNumber(id))
        .filter((id): id is number => id !== null),
      pickRate: percentToRatio(fields[4]),
      winRate: percentToRatio(fields[5]),
      games: toNumber(fields[6]),
    }]
  })

  return pages.sort((a, b) => a.rank - b.rank)
}

export function parseQq101SpellCombos(response: unknown): Qq101SpellCombo[] {
  const payload = parseInner<{ data_details?: string }>(response)
  if (!payload) return []

  const combos = splitRecords(payload.data_details).flatMap(record => {
    const fields = record.split('_')
    if (fields.length < 4) return []
    const a = toNumber(fields[0])
    const b = toNumber(fields[1])
    if (a === null || b === null) return []
    return [{
      spellIds: [a, b] as [number, number],
      winRate: percentToRatio(fields[2]),
      pickRate: percentToRatio(fields[3]),
    }]
  })

  return combos.sort((a, b) => (b.pickRate ?? 0) - (a.pickRate ?? 0))
}

export function parseQq101AramOverview(response: unknown): Qq101AramHero[] {
  const payload = parseInner<{ listcollect?: string }>(response)
  if (!payload) return []

  return (payload.listcollect ?? '')
    .split(/[#|]/)
    .filter(Boolean)
    .flatMap(record => {
      const fields = record.split('_')
      const championId = toNumber(fields[0])
      if (championId === null) return []
      const bestPartners = (fields[5] ?? '').split('&').flatMap(entry => {
        if (!entry) return []
        const p = entry.split(',')
        const partnerId = toNumber(p[0])
        if (partnerId === null) return []
        return [{
          championId: partnerId,
          pickRate: toNumber(p[1]),
          winRate: toNumber(p[2]),
          rank: toNumber(p[3]),
        }]
      })
      return [{
        championId,
        rank: toNumber(fields[1]),
        rankChange: fields[2] ?? '',
        winRate: toNumber(fields[3]),
        pickRate: toNumber(fields[4]),
        bestPartners,
        avgDeathTime: toNumber(fields[6]),
        avgParticipation: toNumber(fields[7]),
        avgDamageRatio: toNumber(fields[8]),
        avgTankRatio: toNumber(fields[9]),
      }]
    })
}
