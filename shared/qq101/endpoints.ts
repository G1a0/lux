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
