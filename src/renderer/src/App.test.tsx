// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App（脚手架占位）', () => {
  it('渲染占位文本', () => {
    render(<App />)
    expect(screen.getByText('Lux 启动中…')).toBeTruthy()
  })
})
