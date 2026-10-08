/// <reference path="../pengu.d.ts" />
declare const __PLUGIN_VERSION__: string

import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import type { Root } from 'react-dom/client'
import { createLogger } from '@/lib/logger'
import { lcu } from '@/lib/lcu'
import { store } from '@/lib/store'
import { injector } from '@/lib/InjectorManager'
import {
  startRecommendation,
  stopRecommendation,
  setOnScoresUpdated,
  setOnClearRecommendation,
} from '@/lib/features/champion-recommendation'
import { tryInjectBadges, tryHighlightChampion } from '@/components/ChampionBadgeOverlay'
import { RecommendationPanel } from '@/components/RecommendationPanel'
import type { ChampionScore, DataSource } from '@/lib/scorer'
import type { InternalPosition } from '@/lib/positions'
import '@/styles/index.css'

const PLUGIN_NAME = 'Lux'
const PLUGIN_VERSION = __PLUGIN_VERSION__
const CONTAINER_ID = 'lux-root'

export const logger = createLogger({ name: PLUGIN_NAME, version: PLUGIN_VERSION })

interface LuxRuntime {
  container: HTMLDivElement | null
  root: Root | null
}

function getRuntime(): LuxRuntime {
  if (!(window as unknown as Record<string, unknown>).__LUX_RUNTIME__) {
    (window as unknown as Record<string, unknown>).__LUX_RUNTIME__ = { container: null, root: null }
  }
  return (window as unknown as Record<string, unknown>).__LUX_RUNTIME__ as LuxRuntime
}

// ==================== 推荐状态 ====================

let panelRoot: Root | null = null
let panelContainer: HTMLDivElement | null = null
let badgeInjectTask: (() => boolean) | null = null
let highlightTasks: Array<() => boolean> = []

function updatePanelRender(
  scores: ChampionScore[],
  dataSource: DataSource,
  position: InternalPosition | '',
  dataDate: string,
  visible: boolean,
) {
  if (!panelRoot || !panelContainer) return

  panelRoot.render(
    createElement(RecommendationPanel, {
      scores,
      assignedPosition: position,
      dataSource,
      dataDate,
      visible,
      onClose: () => updatePanelRender(scores, dataSource, position, dataDate, false),
    }),
  )
}

function updateInjections(scores: ChampionScore[], dataSource: DataSource) {
  if (badgeInjectTask) injector.unregister(badgeInjectTask)
  highlightTasks.forEach(t => injector.unregister(t))
  highlightTasks = []

  if (scores.length === 0) return

  badgeInjectTask = tryInjectBadges(scores, dataSource)
  injector.register(badgeInjectTask)

  const top3 = scores.slice(0, 3)
  for (const score of top3) {
    const task = tryHighlightChampion(score, dataSource)
    highlightTasks.push(task)
    injector.register(task)
  }
}

// ==================== 生命周期 ====================

let penguContext: PenguContext | null = null

export function init(context: PenguContext) {
  penguContext = context
  lcu.bindContext(context)
  logger.printBanner()
}

export function load() {
  logger.info('Plugin loading...')

  store.load()

  startRecommendation()

  setOnScoresUpdated((scores, dataSource, position, dataDate) => {
    updateInjections(scores, dataSource)
    updatePanelRender(scores, dataSource, position, dataDate, scores.length > 0)
  })

  setOnClearRecommendation(() => {
    if (badgeInjectTask) injector.unregister(badgeInjectTask)
    highlightTasks.forEach(t => injector.unregister(t))
    highlightTasks = []
    updatePanelRender([], 'local', '', '', false)
  })

  injector.start()

  mountApp()

  document.addEventListener('keydown', (e) => {
    if (e.key === 'F3' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault()
      const panel = document.getElementById('lux-panel-root')
      if (panel) {
        const isVisible = panel.style.display !== 'none'
        panel.style.display = isVisible ? 'none' : 'block'
      }
    }
  })

  logger.info('Lux loaded')
}

function mountApp() {
  const runtime = getRuntime()

  let container = document.getElementById(CONTAINER_ID) as HTMLDivElement | null
  if (!container) {
    container = document.createElement('div')
    container.id = CONTAINER_ID
    document.body.appendChild(container)
  }

  runtime.container = container

  if (runtime.root) {
    runtime.root.render(createElement('div', { style: { display: 'none' } }))
  } else {
    runtime.root = createRoot(container)
    runtime.root.render(createElement('div', { style: { display: 'none' } }))
  }

  panelContainer = document.createElement('div')
  panelContainer.id = 'lux-panel-root'
  document.body.appendChild(panelContainer)
  panelRoot = createRoot(panelContainer)

  updatePanelRender([], 'local', '', '', false)
}
