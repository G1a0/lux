import type { Qq101Lane } from '../positions'

export const QQ101_ORIGIN = 'https://mlol.qt.qq.com'
export const RIFT_PATH = '/go/battle_info/odp_proxy/lol_101strategy'
export const ALL_TIERS = 255

export function versionsUrl(): string {
  return `${QQ101_ORIGIN}/go/database/versionlist?zone=lol&from=h5`
}

export function riftUrl(
  path: string,
  patch: string,
  lane: Qq101Lane | 'ALL',
  championId?: number,
  extraParams?: Record<string, string>,
): string {
  const params = new URLSearchParams({
    itier: String(ALL_TIERS),
    version_id: patch,
    lane,
    ...(championId === undefined ? {} : { championid: String(championId) }),
    ...extraParams,
  })
  return `${QQ101_ORIGIN}${path}?${params.toString()}`
}

export const ARAM_OVERVIEW_PATH = '/go/battle_info/odp_proxy/aram_hero_overview'

export function aramOverviewUrl(dtstatdate: string): string {
  const params = new URLSearchParams({ dtstatdate })
  return `${QQ101_ORIGIN}${ARAM_OVERVIEW_PATH}?${params.toString()}`
}

/** 大乱斗榜单取「前一天」的日期串（YYYYMMDD，本地时区） */
export function aramDateString(now: Date): string {
  const d = new Date(now)
  d.setDate(d.getDate() - 1)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}${m}${day}`
}
