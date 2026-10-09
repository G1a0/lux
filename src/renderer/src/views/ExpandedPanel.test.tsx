// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ExpandedPanel } from './ExpandedPanel'
import type { UiSnapshot } from '../bridge'

const snap: UiSnapshot = {
  kind: 'rift',
  queueId: 420,
  names: { 711: '薇克丝', 84: '阿卡丽', 90: '玛尔扎哈' },
  advice: {
    primary: { championId: 711, score: 58.4, factors: [], dominantFactor: 'strength', reason: '版本强势：排位胜率 52.6%（T2）', partialData: false },
    alternates: [
      { championId: 84, score: 52.8, factors: [], dominantFactor: null, reason: '你们缺法术伤害，阿卡丽正好补上', partialData: false },
      { championId: 90, score: 47.2, factors: [], dominantFactor: null, reason: '适合当前阵容', partialData: true },
    ],
    runes: null,
    spells: null,
    ruleMode: false,
  },
}

afterEach(() => {
  cleanup()
  delete (window as { lux?: unknown }).lux
})

describe('ExpandedPanel', () => {
  it('渲染备选两名与主推摘要', () => {
    render(<ExpandedPanel snapshot={snap} />)
    expect(screen.getByText('阿卡丽')).toBeTruthy()
    expect(screen.getByText('玛尔扎哈')).toBeTruthy()
    expect(screen.getByText(/主推：薇克丝/)).toBeTruthy()
  })

  it('非排位快照时降级为占位而不崩溃', () => {
    render(<ExpandedPanel snapshot={{ kind: 'none' }} />)
    expect(screen.getByText('…')).toBeTruthy()
  })
})
