// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AramPanel } from './AramPanel'
import type { UiSnapshot } from '../bridge'

const snap: UiSnapshot = {
  kind: 'aram',
  queueId: 450,
  names: { 711: '薇克丝', 22: '艾希' },
  aram: {
    action: 'swap',
    reason: '建议换 艾希：版本强势：大乱斗胜率 54.6%',
    current: { championId: 711, score: 49.3, factors: [], dominantFactor: 'beginner', reason: '操作上手简单', partialData: false },
    bench: [],
    swapTo: { championId: 22, score: 66.4, factors: [], dominantFactor: 'strength', reason: '版本强势：大乱斗胜率 54.6%', partialData: false },
    runes: { keystoneId: 8008, runeIds: [8008, 8009, 9103, 8014, 8304, 8345, 5005, 5008, 5001], subStyleCode: 'qd', source: 'builtin' },
    spells: { spellIds: [4, 32], source: 'builtin' },
  },
}

afterEach(() => {
  cleanup()
  delete (window as { lux?: unknown }).lux
})

describe('AramPanel', () => {
  it('渲染换/留判定与目标英雄', () => {
    render(<AramPanel snapshot={snap} />)
    expect(screen.getByText(/换 艾希/, { selector: '.champ-name' })).toBeTruthy()
    expect(screen.getByText(/闪现 \+ 标记/)).toBeTruthy()
    expect(screen.getByText(/符文：致命节奏/)).toBeTruthy() // 基石 8008 → 中文名
  })

  it('替补席：渲染头像行（title 为英雄名），swap 目标高亮；建议行展示换入头像', async () => {
    const getChampionIcon = vi.fn(async (id: number) => `data:image/png;base64,ID${id}`)
    ;(window as unknown as { lux: unknown }).lux = { getChampionIcon }
    const benchSnap: UiSnapshot = {
      kind: 'aram',
      queueId: 450,
      names: { 711: '薇克丝', 22: '艾希', 57: '茂凯' },
      aram: {
        action: 'swap',
        reason: '建议换 艾希：版本强势：大乱斗胜率 54.6%',
        current: { championId: 711, score: 49.3, factors: [], dominantFactor: 'beginner', reason: '操作上手简单', partialData: false },
        bench: [
          { championId: 22, score: 66.4, factors: [], dominantFactor: 'strength', reason: '版本强势', partialData: false },
          { championId: 57, score: 52.0, factors: [], dominantFactor: 'beginner', reason: '操作上手简单', partialData: false },
        ],
        swapTo: { championId: 22, score: 66.4, factors: [], dominantFactor: 'strength', reason: '版本强势', partialData: false },
        runes: null,
        spells: null,
      },
    }
    const { container } = render(<AramPanel snapshot={benchSnap} />)
    await waitFor(() => {
      expect(container.querySelectorAll('.bench-row img.champ-icon')).toHaveLength(2)
    })
    // 建议行：显示换入目标（22）的头像
    expect(container.querySelector('.primary-row img')?.getAttribute('src')).toBe('data:image/png;base64,ID22')
    // swap 目标头像高亮，其余不高亮
    const benchImgs = container.querySelectorAll('.bench-row img')
    expect(benchImgs[0]?.className).toContain('champ-icon-active')
    expect(benchImgs[1]?.className).not.toContain('champ-icon-active')
    expect(container.querySelector('.bench-row [title="艾希"]')).toBeTruthy()
  })

  it('掷骰子判定且无符文/技能时显示暂无', () => {
    const reroll: UiSnapshot = {
      kind: 'aram',
      queueId: 450,
      names: { 711: '薇克丝' },
      aram: {
        action: 'reroll',
        reason: '同池没有明显更强的英雄',
        current: { championId: 711, score: 49.3, factors: [], dominantFactor: 'beginner', reason: '操作上手简单', partialData: false },
        bench: [],
        swapTo: null,
        runes: null,
        spells: null,
      },
    }
    render(<AramPanel snapshot={reroll} />)
    expect(screen.getByText(/掷骰子/)).toBeTruthy()
    expect(screen.getByText(/符文：暂无/)).toBeTruthy()
    expect(screen.getByText(/技能：暂无/)).toBeTruthy()
  })

  it('一键应用按钮调用桥（与主面板一致）', async () => {
    const applyRunes = vi.fn(async () => ({ ok: true }))
    const applySpells = vi.fn(async () => true)
    ;(window as unknown as { lux: unknown }).lux = { applyRunes, applySpells }
    render(<AramPanel snapshot={snap} />)
    const runesBtn = screen.getByText('一键应用符文')
    const spellsBtn = screen.getByText('携带技能')
    expect((runesBtn as HTMLButtonElement).disabled).toBe(false)
    expect((spellsBtn as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(runesBtn)
    expect(applyRunes).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('符文已应用')).toBeTruthy()
  })

  it('无符文/技能时应用按钮禁用', () => {
    const reroll: UiSnapshot = {
      kind: 'aram',
      queueId: 450,
      aram: {
        action: 'keep',
        reason: '留着',
        current: { championId: 711, score: 49.3, factors: [], dominantFactor: null, reason: '', partialData: false },
        bench: [],
        swapTo: null,
        runes: null,
        spells: null,
      },
    }
    render(<AramPanel snapshot={reroll} />)
    expect((screen.getByText('一键应用符文') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByText('携带技能') as HTMLButtonElement).disabled).toBe(true)
  })
})
