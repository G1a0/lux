// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { Onboarding } from './Onboarding'

afterEach(cleanup)

describe('Onboarding', () => {
  it('展示用途/时段说明/免责声明，点击开始回调', () => {
    const onDone = vi.fn()
    render(<Onboarding onDone={onDone} />)
    expect(screen.getByText(/选人阶段/)).toBeTruthy()
    expect(screen.getByText(/9.*12.*14.*18|9-12.*14-18/)).toBeTruthy()
    expect(screen.getByText(/免责|第三方/)).toBeTruthy()
    fireEvent.click(screen.getByText('开始使用'))
    expect(onDone).toHaveBeenCalled()
  })
})
