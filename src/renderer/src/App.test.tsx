// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { App } from './App'

afterEach(() => {
  cleanup()
  delete (window as { lux?: unknown }).lux
})

describe('App（mock 视图占位）', () => {
  it('初始渲染显示启动占位', () => {
    render(<App />)
    expect(screen.getByText('Lux 启动中…')).toBeTruthy()
  })

  it('window.lux.onView 推送后渲染视图与快照', () => {
    let handler: ((view: string, snap: unknown) => void) | undefined
    ;(window as unknown as { lux: unknown }).lux = {
      onView: (cb: (view: string, snap: unknown) => void) => {
        handler = cb
        return () => {}
      },
    }
    render(<App />)
    act(() => handler?.('main', { kind: 'rift' }))
    expect(screen.getByText('[mock] view=main')).toBeTruthy()
  })
})
