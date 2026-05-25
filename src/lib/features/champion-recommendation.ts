// src/lib/features/champion-recommendation.ts

import { lcu, LcuEventUri } from '@/lib/lcu'
import type { ChampSelectSession, LCUEventMessage } from '@/lib/lcu'
import { opggApi, type OpggCounterStats, type OpggSynergyStats, type OpggChampionTier } from '@/lib/opgg-api'
import { scoreAllChampions, type ChampionScore, type GameState } from '@/lib/scorer'
import { debounce } from '@/lib/utils'
import type { ChampionMeta } from '@/types/champion'
import championMetaRaw from '@/data/champion-meta.json'

const championMetaData = championMetaRaw as unknown as ChampionMeta

const OPGG_TIMEOUT_MS = 3000

interface RecommendationCache {
  sessionId: string
  scores: ChampionScore[]
  useOpgg: boolean
  timestamp: number
}

let cache: RecommendationCache | null = null
let unsubSession: (() => void) | null = null
let unsubPhase: (() => void) | null = null

let onScoresUpdated: ((scores: ChampionScore[], useOpgg: boolean) => void) | null = null
let onClearRecommendation: (() => void) | null = null

export function setOnScoresUpdated(cb: (scores: ChampionScore[], useOpgg: boolean) => void) {
  onScoresUpdated = cb
}

export function setOnClearRecommendation(cb: () => void) {
  onClearRecommendation = cb
}

function extractGameState(session: ChampSelectSession, availableIds: number[]): GameState {
  const allyPicks = session.myTeam
    .filter(p => p.championId > 0)
    .map(p => p.championId)

  const enemyPicks = session.theirTeam
    .filter(p => p.championId > 0)
    .map(p => p.championId)

  const allyBans = session.bans.myTeamBans ?? []
  const enemyBans = session.bans.theirTeamBans ?? []

  const myPlayer = session.myTeam.find(p => p.cellId === session.localPlayerCellId)

  return {
    allyPicks,
    enemyPicks,
    allyBans,
    enemyBans,
    bannedIds: [...new Set([...allyBans, ...enemyBans])],
    availableIds: availableIds.filter(id => !allyPicks.includes(id) && !enemyPicks.includes(id)),
    assignedPosition: myPlayer?.assignedPosition ?? '',
    queueId: session.queueId,
  }
}

async function fetchOpggData(championIds: number[], position: string): Promise<{
  counters: Map<number, OpggCounterStats[]>
  synergies: Map<number, OpggSynergyStats[]>
  tiers: Map<number, OpggChampionTier>
  useOpgg: boolean
}> {
  try {
    const [tierList, ...champResults] = await Promise.all([
      withTimeout(opggApi.getTierList(), OPGG_TIMEOUT_MS),
      ...championIds.slice(0, 15).map(id =>
        withTimeout(
          Promise.all([
            opggApi.getCounters(id, position),
            opggApi.getSynergies(id, position),
          ]),
          OPGG_TIMEOUT_MS,
        ),
      ),
    ])

    const counters = new Map<number, OpggCounterStats[]>()
    const synergies = new Map<number, OpggSynergyStats[]>()
    champResults.forEach(([c, s], i) => {
      counters.set(championIds[i], c)
      synergies.set(championIds[i], s)
    })

    const tierMap = new Map<number, OpggChampionTier>()
    tierList.forEach(t => tierMap.set(t.championId, t))

    return { counters, synergies, tiers: tierMap, useOpgg: true }
  } catch {
    return { counters: new Map(), synergies: new Map(), tiers: new Map(), useOpgg: false }
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timeout')), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer!)
  }
}

const computeRecommendation = debounce(async (session: ChampSelectSession) => {
  if (session.timer.phase !== 'BAN_PICK') return
  if (cache?.sessionId === session.id && cache?.scores.length > 0) return

  const availableIds = await lcu.getPickableChampionIds().catch(() => [] as number[])
  if (availableIds.length === 0) return

  const state = extractGameState(session, availableIds)
  const position = state.assignedPosition

  const relevantIds = state.availableIds.slice(0, 20)
  const { counters, synergies, tiers, useOpgg } = await fetchOpggData(relevantIds, position)

  const scores = scoreAllChampions(
    state,
    counters,
    synergies,
    tiers,
    championMetaData.damageTypes,
    useOpgg,
  )

  cache = { sessionId: session.id, scores, useOpgg, timestamp: Date.now() }
  onScoresUpdated?.(scores, useOpgg)
}, 500)

function clearCache() {
  cache = null
  onClearRecommendation?.()
}

export function startRecommendation() {
  unsubSession = lcu.observe(
    LcuEventUri.CHAMP_SELECT_SESSION,
    (event: LCUEventMessage) => {
      const session = event.data as ChampSelectSession | null
      if (!session || !session.myTeam || !session.theirTeam) return
      computeRecommendation(session)
    },
  )

  unsubPhase = lcu.observe(
    LcuEventUri.GAMEFLOW_PHASE_CHANGE,
    (event: LCUEventMessage) => {
      const phase = event.data as string
      if (phase !== 'ChampSelect') {
        clearCache()
      }
    },
  )
}

export function stopRecommendation() {
  unsubSession?.()
  unsubSession = null
  unsubPhase?.()
  unsubPhase = null
  clearCache()
}
