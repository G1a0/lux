// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { ChampIcon } from './ChampIcon'

afterEach(() => {
  cleanup()
  delete (window as { lux?: unknown }).lux
})

function setBridge(getChampionIcon: (id: number) => Promise<string | null>): void {
  ;(window as unknown as { lux: unknown }).lux = { getChampionIcon }
}

describe('ChampIcon', () => {
  it('桥返回 data URL → 渲染 img（尺寸/类名）', async () => {
    const getChampionIcon = vi.fn(async (id: number) => `data:image/png;base64,ID${id}`)
    setBridge(getChampionIcon)
    const { container } = render(<ChampIcon id={22} size={24} />)
    await waitFor(() => {
      expect(container.querySelector('img.champ-icon')).toBeTruthy()
    })
    const img = container.querySelector('img.champ-icon') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('data:image/png;base64,ID22')
    expect(img.getAttribute('width')).toBe('24')
    expect(img.getAttribute('height')).toBe('24')
    expect(getChampionIcon).toHaveBeenCalledWith(22)
  })

  it('桥返回 null（无连接/无图标）→ 不渲染 img，不抛错', async () => {
    const getChampionIcon = vi.fn(async () => null)
    setBridge(getChampionIcon)
    const { container } = render(<ChampIcon id={22} />)
    await waitFor(() => {
      expect(getChampionIcon).toHaveBeenCalledWith(22)
    })
    expect(container.querySelector('img')).toBeNull()
  })

  it('active 时带 champ-icon-active 高亮类', async () => {
    setBridge(async () => 'data:image/png;base64,AAAA')
    const { container } = render(<ChampIcon id={22} active />)
    await waitFor(() => {
      expect(container.querySelector('img.champ-icon-active')).toBeTruthy()
    })
  })

  it('切换 id 重新取图（旧图不残留）', async () => {
    const getChampionIcon = vi.fn(async (id: number) => `data:image/png;base64,ID${id}`)
    setBridge(getChampionIcon)
    const { container, rerender } = render(<ChampIcon id={22} />)
    await waitFor(() => {
      expect(container.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,ID22')
    })
    rerender(<ChampIcon id={57} />)
    await waitFor(() => {
      expect(container.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,ID57')
    })
    expect(getChampionIcon).toHaveBeenCalledWith(57)
  })
})
