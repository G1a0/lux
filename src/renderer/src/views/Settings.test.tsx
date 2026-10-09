// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
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
})
