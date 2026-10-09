// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { MainPanel } from './MainPanel'
import type { UiSnapshot } from '../bridge'

const snap: UiSnapshot = {
  kind: 'rift',
  queueId: 420,
  names: { 711: '薇克丝' },
  advice: {
    primary: { championId: 711, score: 58.4, factors: [], dominantFactor: 'strength', reason: '版本强势：排位胜率 52.6%（T2）', partialData: false },
    alternates: [],
    runes: { keystoneId: 8112, runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001], subStyleCode: 'jj', source: 'qq101' },
    spells: { spellIds: [14, 4], source: 'qq101' },
    ruleMode: false,
  },
}

afterEach(() => {
  cleanup()
  delete (window as { lux?: unknown }).lux
})

describe('MainPanel', () => {
  it('渲染主推、理由、符文与技能的展示名', () => {
    render(<MainPanel snapshot={snap} onExpand={vi.fn()} onCollapse={vi.fn()} onSettings={vi.fn()} />)
    expect(screen.getByText('薇克丝')).toBeTruthy()
    expect(screen.getByText(/版本强势/)).toBeTruthy()
    expect(screen.getByText(/电刑|基石/)).toBeTruthy()
    expect(screen.getByText(/点燃 \+ 闪现/)).toBeTruthy()
  })

  it('一键应用按钮调用桥', async () => {
    const applyRunes = vi.fn(async () => ({ ok: true }))
    const applySpells = vi.fn(async () => true)
    ;(window as unknown as { lux: unknown }).lux = { applyRunes, applySpells, setWindowState: vi.fn(), setConfig: vi.fn() }
    render(<MainPanel snapshot={snap} onExpand={vi.fn()} onCollapse={vi.fn()} onSettings={vi.fn()} />)
    fireEvent.click(screen.getByText('一键应用符文'))
    fireEvent.click(screen.getByText('携带技能'))
    expect(applyRunes).toHaveBeenCalled()
    expect(applySpells).toHaveBeenCalled()
    expect(await screen.findByText('技能已携带')).toBeTruthy()
  })
})
