// src/components/ChampionBadgeOverlay.tsx

import type { ChampionScore } from '@/lib/scorer'

function getChampionIdFromElement(el: HTMLElement): number | null {
  const dataId = el.getAttribute('data-champion-id')
  if (dataId) return parseInt(dataId, 10)

  const src = el.getAttribute('src') ?? ''
  const match = src.match(/champion[_-](\d+)/i)
  return match ? parseInt(match[1], 10) : null
}

function createBadgeElement(score: ChampionScore, useOpgg: boolean): HTMLElement {
  const badge = document.createElement('div')
  badge.className = 'lux-badge'

  if (score.tier === 'strong') {
    badge.style.cssText = `
      position: absolute; top: -4px; right: -4px;
      width: 24px; height: 24px;
      background: #e84057; color: #fff;
      border-radius: 50%; font-size: 11px;
      font-weight: bold; line-height: 24px; text-align: center;
      z-index: 100; pointer-events: none;
      box-shadow: 0 0 6px rgba(232,64,87,0.6);
    `
  } else if (score.tier === 'good') {
    badge.style.cssText = `
      position: absolute; top: -4px; right: -4px;
      width: 20px; height: 20px;
      background: #2ecc71; color: #fff;
      border-radius: 50%; font-size: 10px;
      font-weight: bold; line-height: 20px; text-align: center;
      z-index: 100; pointer-events: none;
    `
  } else if (score.tier === 'weak' || score.tier === 'avoid') {
    badge.style.cssText = `
      position: absolute; top: -4px; right: -4px;
      width: 20px; height: 20px;
      background: rgba(0,0,0,0.5); color: #999;
      border-radius: 50%; font-size: 10px;
      font-weight: bold; line-height: 20px; text-align: center;
      z-index: 100; pointer-events: none;
    `
  } else {
    return badge // neutral: don't show
  }

  if (!useOpgg) {
    badge.style.background = '#888'
  }

  badge.textContent = String(score.score)
  badge.title = [
    `综合: ${score.score}`,
    `协同: ${score.synergy}`,
    `克制: ${score.counter}`,
    `强度: ${score.meta}`,
    `平衡: ${score.balance}`,
    useOpgg ? '(OP.GG数据)' : '(本地数据)',
  ].join('\n')

  return badge
}

export function tryInjectBadges(scores: ChampionScore[], useOpgg: boolean): () => boolean {
  const scoreMap = new Map(scores.map(s => [s.championId, s]))

  return () => {
    const iconElements = document.querySelectorAll<HTMLElement>(
      '[data-champion-id], .champion-icon, [class*="champion"] img',
    )

    let injected = 0
    iconElements.forEach(el => {
      const championId = getChampionIdFromElement(el)
      if (!championId) return

      const score = scoreMap.get(championId)
      if (!score) return

      if (el.querySelector('.lux-badge')) return

      const badge = createBadgeElement(score, useOpgg)
      if (badge.children.length === 0 && !badge.textContent) return

      el.style.position = 'relative'
      el.appendChild(badge)
      injected++
    })

    return injected > 0
  }
}

function findChampionElement(championId: number): HTMLElement | null {
  const byData = document.querySelector<HTMLElement>(`[data-champion-id="${championId}"]`)
  if (byData) return byData

  const imgs = document.querySelectorAll<HTMLImageElement>(`[class*="champion"] img`)
  for (const img of imgs) {
    if (img.src.includes(`champion/${championId}`) || img.src.includes(`champion_${championId}`)) {
      return img.closest<HTMLElement>('[class*="champion"]') ?? img
    }
  }

  return null
}

export function tryHighlightChampion(score: ChampionScore, _useOpgg: boolean): () => boolean {
  return () => {
    const parent = findChampionElement(score.championId)
    if (!parent || parent.hasAttribute('data-lux-highlighted')) return true

    const borderColor = score.tier === 'strong' ? '#e84057' : '#2ecc71'
    parent.style.boxShadow = `0 0 8px ${borderColor}, inset 0 0 0 2px ${borderColor}`
    parent.style.borderRadius = '4px'
    parent.setAttribute('data-lux-highlighted', 'true')

    return true
  }
}
