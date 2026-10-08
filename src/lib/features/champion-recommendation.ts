// src/lib/features/champion-recommendation.ts

import { lcu, LcuEventUri } from '@/lib/lcu'
import type { ChampSelectSession, LCUEventMessage } from '@/lib/lcu'
import {
  scoreAllChampions,
  type ChampionScore,
  type CounterStat,
  type SynergyStat,
  type ChampionTier,
  type DataSource,
} from '@/lib/scorer'
import { getPatch, getTierList, getMatchups, getSynergies, type Qq101TierList } from '@/lib/qq101'
import {
  ensureChampionSummary,
  ensureDamageTypes,
  getDamageTypeMap,
  setChampionPositions,
} from '@/lib/champion-data'
import {
  extractGameState,
  pickCandidates,
  findBestTierRecord,
  buildPositionsMap,
  toChampionTier,
  toCounterStats,
  toSynergyStats,
  SR_QUEUE_IDS,
} from '@/lib/candidates'
import { toQq101Lane, type InternalPosition, type Qq101Lane } from '@/lib/positions'
import { debounce, mapWithConcurrency } from '@/lib/utils'

const CANDIDATE_LIMIT = 20
const FETCH_CONCURRENCY = 5

interface SessionDataCache {
  sessionId: string
  patch: string | null
  tierList: Qq101TierList | null
  counters: Map<string, CounterStat[]>
  synergies: Map<string, SynergyStat[]>
}

let sessionData: SessionDataCache | null = null
let generation = 0

let unsubSession: (() => void) | null = null
let unsubPhase: (() => void) | null = null

let onScoresUpdated: ((scores: ChampionScore[], dataSource: DataSource, position: InternalPosition | '', dataDate: string) => void) | null = null
let onClearRecommendation: (() => void) | null = null

export function setOnScoresUpdated(cb: (scores: ChampionScore[], dataSource: DataSource, position: InternalPosition | '', dataDate: string) => void) {
  onScoresUpdated = cb
}

export function setOnClearRecommendation(cb: () => void) {
  onClearRecommendation = cb
}

async function loadSessionData(sessionId: string): Promise<SessionDataCache> {
  if (sessionData?.sessionId === sessionId) return sessionData
  const patch = await getPatch()
  const tierList = patch ? await getTierList(patch) : null
  sessionData = { sessionId, patch, tierList, counters: new Map(), synergies: new Map() }
  return sessionData
}

async function fetchCounters(data: SessionDataCache, lane: Qq101Lane, championId: number): Promise<void> {
  const key = `${lane}:${championId}`
  if (data.counters.has(key) || !data.patch) return
  const matchups = await getMatchups(data.patch, lane, championId)
  if (matchups !== null) data.counters.set(key, toCounterStats(matchups))
}

async function fetchSynergies(data: SessionDataCache, lane: Qq101Lane, championId: number): Promise<void> {
  const key = `${lane}:${championId}`
  if (data.synergies.has(key) || !data.patch) return
  const synergies = await getSynergies(data.patch, lane, championId)
  if (synergies !== null) data.synergies.set(key, toSynergyStats(synergies))
}

const computeRecommendation = debounce(async (session: ChampSelectSession) => {
  if (session.timer.phase !== 'BAN_PICK' && session.timer.phase !== 'PLANNING') return
  if (!SR_QUEUE_IDS.has(session.queueId)) {
    clearUi()
    return
  }

  const gen = ++generation
  const data = await loadSessionData(session.id)
  if (gen !== generation) return

  const availableIds = await lcu.getPickableChampionIds().catch(() => [] as number[])
  if (gen !== generation || availableIds.length === 0) return

  const state = extractGameState(session, availableIds)
  const position = state.assignedPosition
  const lane = toQq101Lane(position)

  const tierChampions = data.tierList?.champions ?? []
  const hasTierData = tierChampions.length > 0
  const dataSource: DataSource = hasTierData ? 'qq101' : 'local'

  await ensureChampionSummary().catch(() => {})
  if (gen !== generation) return

  if (hasTierData) setChampionPositions(buildPositionsMap(tierChampions))

  const candidateIds = hasTierData
    ? pickCandidates(state.availableIds, tierChampions, position, CANDIDATE_LIMIT)
    : state.availableIds.slice(0, CANDIDATE_LIMIT)

  const tierMap = new Map<number, ChampionTier>()
  if (hasTierData) {
    for (const id of candidateIds) {
      const record = findBestTierRecord(tierChampions, id, position)
      if (record) tierMap.set(id, toChampionTier(record))
    }
  }

  await ensureDamageTypes(candidateIds).catch(() => {})
  if (gen !== generation) return

  const counters = new Map<number, CounterStat[]>()
  const synergies = new Map<number, SynergyStat[]>()

  if (hasTierData && lane) {
    if (state.enemyPicks.length > 0) {
      await mapWithConcurrency(candidateIds, FETCH_CONCURRENCY, async id => {
        await fetchCounters(data, lane, id)
      })
      if (gen !== generation) return
    }
    if (state.allyPicks.length > 0) {
      await mapWithConcurrency(candidateIds, FETCH_CONCURRENCY, async id => {
        await fetchSynergies(data, lane, id)
      })
      if (gen !== generation) return
    }
  }

  if (lane) {
    for (const id of candidateIds) {
      const cachedCounters = data.counters.get(`${lane}:${id}`)
      if (cachedCounters) counters.set(id, cachedCounters)
      const cachedSynergies = data.synergies.get(`${lane}:${id}`)
      if (cachedSynergies) synergies.set(id, cachedSynergies)
    }
  }

  const scores = scoreAllChampions(
    state,
    counters,
    synergies,
    tierMap,
    getDamageTypeMap(candidateIds),
    dataSource,
  )

  onScoresUpdated?.(scores, dataSource, position, data.tierList?.date ?? '')
}, 500)

function clearUi() {
  sessionData = null
  generation++
  onClearRecommendation?.()
}

export function startRecommendation() {
  unsubSession = lcu.observe(LcuEventUri.CHAMP_SELECT_SESSION, (message: LCUEventMessage) => {
    if (message.eventType === 'Delete' || !message.data) {
      clearUi()
      return
    }
    const session = message.data as ChampSelectSession
    if (!session.myTeam || !session.theirTeam || !session.timer) return
    computeRecommendation(session)
  })

  unsubPhase = lcu.observe(LcuEventUri.GAMEFLOW_PHASE_CHANGE, (message: LCUEventMessage) => {
    if (message.data !== 'ChampSelect') {
      clearUi()
    }
  })

  // 插件可能在选人中途加载：主动拉一次当前会话
  void lcu
    .getChampSelectSession()
    .then(session => {
      if (session?.myTeam && session?.timer) computeRecommendation(session)
    })
    .catch(() => {})
}

export function stopRecommendation() {
  unsubSession?.()
  unsubSession = null
  unsubPhase?.()
  unsubPhase = null
  clearUi()
}
