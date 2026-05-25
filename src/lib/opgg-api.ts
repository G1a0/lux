// src/lib/opgg-api.ts

const OPGG_ORIGIN = 'https://lol-api-champion.op.gg'

interface OpggChampionTier {
  championId: number
  position: string
  tier: string
  winRate: number
  pickRate: number
  banRate: number
}

interface OpggCounterStats {
  opponentChampionId: number
  winRate: number
  playCount: number
}

interface OpggSynergyStats {
  allyChampionId: number
  winRate: number
  playCount: number
}

const REGION = 'cn'

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Lux/1.0',
        'Origin': OPGG_ORIGIN,
      },
    })
    return res
  } finally {
    clearTimeout(timer)
  }
}

async function getCounters(championId: number, position: string): Promise<OpggCounterStats[]> {
  try {
    const url = `${OPGG_ORIGIN}/champions/${championId}/counters?region=${REGION}&position=${position}`
    const res = await fetchWithTimeout(url, 3000)
    if (!res.ok) throw new Error(`OP.GG counter API returned ${res.status}`)
    return res.json()
  } catch {
    return []
  }
}

async function getSynergies(championId: number, position: string): Promise<OpggSynergyStats[]> {
  try {
    const url = `${OPGG_ORIGIN}/champions/${championId}/synergies?region=${REGION}&position=${position}`
    const res = await fetchWithTimeout(url, 3000)
    if (!res.ok) throw new Error(`OP.GG synergy API returned ${res.status}`)
    return res.json()
  } catch {
    return []
  }
}

async function getTierList(): Promise<OpggChampionTier[]> {
  try {
    const url = `${OPGG_ORIGIN}/tiers?region=${REGION}`
    const res = await fetchWithTimeout(url, 3000)
    if (!res.ok) throw new Error(`OP.GG tier API returned ${res.status}`)
    return res.json()
  } catch {
    return []
  }
}

export const opggApi = {
  getCounters,
  getSynergies,
  getTierList,
}

export type { OpggChampionTier, OpggCounterStats, OpggSynergyStats }
