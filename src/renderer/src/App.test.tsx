// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { App } from './App'
import { createInertBridge, type UiBridge } from './bridge'

function installBridge(overrides: Partial<UiBridge> = {}): void {
  delete (window as { lux?: unknown }).lux
  ;(window as unknown as { lux: unknown }).lux = {
    ...createInertBridge(),
    getConfig: async () => ({ onboarded: true }),
    ...overrides,
  }
}

beforeEach(() => {
  installBridge()
})

afterEach(() => {
  cleanup()
  delete (window as { lux?: unknown }).lux
})

describe('App 路由', () => {
  it('无快照时显示等待文案', async () => {
    render(<App />)
    expect(await screen.findByText('等待进入选人…')).toBeTruthy()
  })

  it('未完成引导时进入引导视图', async () => {
    installBridge({ getConfig: async () => ({ onboarded: false }) })
    render(<App />)
    expect(await screen.findByText('首启引导（待实现）')).toBeTruthy()
  })
})
