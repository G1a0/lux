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

/** 等待态 LcuInfo 基线（按需覆盖字段） */
function waitingInfo(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: 'waiting', lockDir: null, port: null, lastError: null,
    targetDir: null, targetProbe: null, processNote: null, ...overrides,
  }
}

/** LcuDirProbe 基线（按需覆盖字段） */
function dirProbe(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    dir: 'D:\\X\\LeagueClient', dirExists: true, lockfileExists: true,
    lockfileSize: 64, lockfileMtimeMs: 1700000000000, processName: null, contentIssue: null, parsed: true, ...overrides,
  }
}

function renderWithLcuInfo(info: Record<string, unknown>, snapshot: UiSnapshot | null = null): void {
  ;(window as unknown as { lux: unknown }).lux = {
    onLcuInfo: (cb: (info: unknown) => void) => {
      cb(info)
      return () => {}
    },
  }
  render(<MainPanel snapshot={snapshot} onExpand={vi.fn()} onCollapse={vi.fn()} onSettings={vi.fn()} />)
}

describe('MainPanel', () => {
  it('渲染主推、理由、符文与技能的展示名', () => {
    render(<MainPanel snapshot={snap} onExpand={vi.fn()} onCollapse={vi.fn()} onSettings={vi.fn()} />)
    expect(screen.getByText('薇克丝')).toBeTruthy()
    expect(screen.getByText(/版本强势/)).toBeTruthy()
    expect(screen.getByText(/电刑|基石/)).toBeTruthy()
    expect(screen.getByText(/点燃 \+ 闪现/)).toBeTruthy()
  })

  it('无快照时展示 LCU 连接诊断（未发现文案 + 路径提示 + 最近错误）', async () => {
    renderWithLcuInfo(waitingInfo({ lastError: 'connect ECONNREFUSED 127.0.0.1:54321' }))
    expect(await screen.findByText(/未发现游戏客户端/)).toBeTruthy()
    expect(await screen.findByText(/已尝试的常见路径均未命中/)).toBeTruthy()
    expect(await screen.findByText(/connect ECONNREFUSED 127\.0\.0\.1:54321/)).toBeTruthy()
  })

  it('指定了目录但探测详情缺失时展示指定目录与通用排查提示（兼容旧数据）', async () => {
    renderWithLcuInfo(waitingInfo({ targetDir: 'D:\\X\\LeagueClient' }))
    expect(await screen.findByText(/指定目录：D:\\X\\LeagueClient/)).toBeTruthy()
    expect(await screen.findByText(/未在该目录找到 lockfile/)).toBeTruthy()
    expect(screen.queryByText(/已尝试的常见路径均未命中/)).toBeNull()
  })

  it('指定目录不存在时提示检查路径拼写', async () => {
    renderWithLcuInfo(waitingInfo({
      targetDir: 'D:\\X\\LeagueClient',
      targetProbe: dirProbe({ dirExists: false, lockfileExists: false, lockfileSize: null, lockfileMtimeMs: null, parsed: false }),
    }))
    expect(await screen.findByText(/该目录不存在——请检查路径拼写/)).toBeTruthy()
  })

  it('目录存在但无 lockfile 时提示路径层级与客户端运行', async () => {
    renderWithLcuInfo(waitingInfo({
      targetDir: 'D:\\X\\LeagueClient',
      targetProbe: dirProbe({ lockfileExists: false, lockfileSize: null, lockfileMtimeMs: null, parsed: false }),
    }))
    expect(await screen.findByText(/目录存在，但没有 lockfile 文件/)).toBeTruthy()
  })

  it('lockfile 属于 Riot Client（启动器）时提示改选 LeagueClient 文件夹', async () => {
    renderWithLcuInfo(waitingInfo({
      targetDir: 'C:\\Riot Client Data\\User Data\\Config',
      targetProbe: dirProbe({ dir: 'C:\\Riot Client Data\\User Data\\Config', contentIssue: 'foreign', processName: 'Riot Client', parsed: false }),
    }))
    expect(await screen.findByText(/这里的 lockfile 属于 Riot Client，不是游戏客户端——请改选 LeagueClient 文件夹/)).toBeTruthy()
  })

  it('lockfile 为空（0 字节）时展示最后修改时间', async () => {
    const mtimeMs = new Date(2026, 0, 5, 9, 8).getTime()
    renderWithLcuInfo(waitingInfo({
      targetDir: 'D:\\X\\LeagueClient',
      targetProbe: dirProbe({ lockfileSize: 0, lockfileMtimeMs: mtimeMs, contentIssue: 'empty', parsed: false }),
    }))
    expect(await screen.findByText(/lockfile 是空的（0 字节，最后修改 2026\/01\/05 09:08）——客户端可能没在运行/)).toBeTruthy()
  })

  it('已连接且 lockDir 为空串（凭据来自进程命令行）→ 展示来源提示而非常见路径未命中', async () => {
    renderWithLcuInfo(waitingInfo({ status: 'connected', lockDir: '', port: 54321 }))
    expect(await screen.findByText(/（来自客户端进程命令行）/)).toBeTruthy()
    expect(screen.queryByText(/已尝试的常见路径均未命中/)).toBeNull()
    expect(await screen.findByText('状态：已连接（未进入选人） · 端口：54321')).toBeTruthy()
  })

  it('lockDir 非空时展示实际目录', async () => {
    renderWithLcuInfo(waitingInfo({ status: 'connected', lockDir: 'D:\\WeGameApps\\英雄联盟\\LeagueClient' }))
    expect(await screen.findByText(/客户端目录：D:\\WeGameApps\\英雄联盟\\LeagueClient/)).toBeTruthy()
  })

  it('展示进程探测摘要（自动探测行；waiting 且有 processNote 时）', async () => {
    renderWithLcuInfo(waitingInfo({ processNote: '未发现正在运行的 LeagueClientUx / LeagueClient 进程' }))
    expect(await screen.findByText(/自动探测：未发现正在运行的 LeagueClientUx \/ LeagueClient 进程/)).toBeTruthy()
  })

  it('none(aram-pre-pick)：提示已进入大乱斗选人；状态行显示已进入选人', async () => {
    renderWithLcuInfo(
      waitingInfo({ status: 'in-champ-select', port: 61187 }),
      { kind: 'none', reason: 'aram-pre-pick' },
    )
    expect(await screen.findByText('已进入大乱斗选人——请选择/确认你的英雄，随后将给出建议。')).toBeTruthy()
    expect(await screen.findByText('状态：已进入选人 · 端口：61187')).toBeTruthy()
  })

  it('none(compute-error)：提示计算失败请截图反馈', async () => {
    renderWithLcuInfo(waitingInfo({ status: 'in-champ-select', port: 61187 }), { kind: 'none', reason: 'compute-error' })
    expect(await screen.findByText('已检测到选人，但建议计算失败——请将本窗口截图反馈。')).toBeTruthy()
  })

  it('none(mode-off)：提示模式已在设置中关闭', async () => {
    renderWithLcuInfo(waitingInfo({ status: 'in-champ-select' }), { kind: 'none', reason: 'mode-off' })
    expect(await screen.findByText('已检测到选人；该模式已在设置中关闭（可在设置中开启）。')).toBeTruthy()
  })

  it('none 无 reason 且已连接：保持"已连接客户端，等待进入选人…"', async () => {
    renderWithLcuInfo(waitingInfo({ status: 'connected', port: 54321 }), { kind: 'none' })
    expect(await screen.findByText('已连接客户端，等待进入选人…')).toBeTruthy()
  })

  it('状态行：waiting → 未发现客户端 · 端口未知', async () => {
    renderWithLcuInfo(waitingInfo())
    expect(await screen.findByText('状态：未发现客户端 · 端口：未知')).toBeTruthy()
  })

  it('状态行：未知 status 原样显示', async () => {
    renderWithLcuInfo(waitingInfo({ status: 'connecting' }))
    expect(await screen.findByText('状态：connecting · 端口：未知')).toBeTruthy()
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
