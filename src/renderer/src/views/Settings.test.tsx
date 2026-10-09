// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Settings } from './Settings'
import { createInertBridge } from '../bridge'

beforeEach(() => {
  ;(window as unknown as { lux: unknown }).lux = {
    ...createInertBridge(),
    getConfig: async () => ({ ownedFilter: true, modes: { rift: true, aram: true }, onboarded: true }),
    setConfig: vi.fn(async p => p),
    getManifest: async () => ({ patch: '16.19', dataDate: '20261007', updatedAt: '2026-10-08T00:00:00Z' }),
    syncNow: vi.fn(async () => ({ status: 'synced' })),
  }
})

afterEach(() => {
  cleanup()
  delete (window as { lux?: unknown }).lux
})

describe('Settings', () => {
  it('加载配置与 manifest 并渲染开关', async () => {
    render(<Settings onClose={vi.fn()} />)
    expect(await screen.findByText(/16\.19/)).toBeTruthy()
    expect(screen.getByLabelText('候选池仅显示已拥有/周免')).toBeTruthy()
  })

  it('手动同步结束后展示结果', async () => {
    render(<Settings onClose={vi.fn()} />)
    fireEvent.click(await screen.findByText('立即同步'))
    expect(await screen.findByText('同步结束：synced')).toBeTruthy()
  })

  it('回填已保存的手动客户端目录', async () => {
    const dir = 'D:\\Games\\LoL\\LeagueClient'
    ;(window as unknown as { lux: unknown }).lux = {
      ...createInertBridge(),
      getConfig: async () => ({ ownedFilter: true, modes: { rift: true, aram: true }, onboarded: true, lcuDir: dir }),
      getManifest: async () => null,
    }
    render(<Settings onClose={vi.fn()} />)
    const input = (await screen.findByPlaceholderText('自动发现')) as HTMLInputElement
    await waitFor(() => expect(input.value).toBe(dir))
  })

  it('浏览…通过文件夹选择器写入目录并保存', async () => {
    const picked = 'E:\\Lol\\LeagueClient'
    // 真实 set-config 返回合并后的完整配置；mock 同样返回全量，避免部分配置导致渲染崩溃
    const setConfig = vi.fn(async (p: Record<string, unknown>) => ({
      ownedFilter: true, modes: { rift: true, aram: true }, onboarded: true, ...p,
    }))
    ;(window as unknown as { lux: unknown }).lux = {
      ...createInertBridge(),
      getConfig: async () => ({ ownedFilter: true, modes: { rift: true, aram: true }, onboarded: true }),
      setConfig,
      getManifest: async () => null,
      pickLcuDir: async () => picked,
    }
    render(<Settings onClose={vi.fn()} />)
    fireEvent.click(await screen.findByText('浏览…'))
    await waitFor(() => expect(setConfig).toHaveBeenCalledWith({ lcuDir: picked }))
  })
})
