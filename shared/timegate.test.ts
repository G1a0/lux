import { describe, expect, it } from 'vitest'
import { isApiAllowed, nextAllowedTime } from './timegate'

// 2026-10-05 是周一；2026-10-10 是周六
function at(y: number, m: number, d: number, hh: number, mm: number): Date {
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

describe('isApiAllowed', () => {
  it('工作日 9:00-12:00 禁止', () => {
    expect(isApiAllowed(at(2026, 10, 5, 8, 59))).toBe(true)
    expect(isApiAllowed(at(2026, 10, 5, 9, 0))).toBe(false)
    expect(isApiAllowed(at(2026, 10, 5, 11, 59))).toBe(false)
    expect(isApiAllowed(at(2026, 10, 5, 12, 0))).toBe(true)
  })

  it('工作日 14:00-18:00 禁止', () => {
    expect(isApiAllowed(at(2026, 10, 5, 13, 59))).toBe(true)
    expect(isApiAllowed(at(2026, 10, 5, 14, 0))).toBe(false)
    expect(isApiAllowed(at(2026, 10, 5, 17, 59))).toBe(false)
    expect(isApiAllowed(at(2026, 10, 5, 18, 0))).toBe(true)
  })

  it('周末全天允许', () => {
    expect(isApiAllowed(at(2026, 10, 10, 10, 0))).toBe(true)
    expect(isApiAllowed(at(2026, 10, 11, 15, 0))).toBe(true)
  })
})

describe('nextAllowedTime', () => {
  it('上午禁窗中 → 返回当天 12:00', () => {
    expect(nextAllowedTime(at(2026, 10, 5, 9, 30))).toEqual(at(2026, 10, 5, 12, 0))
  })

  it('下午禁窗中 → 返回当天 18:00', () => {
    expect(nextAllowedTime(at(2026, 10, 5, 17, 30))).toEqual(at(2026, 10, 5, 18, 0))
  })

  it('已允许 → 返回当前分钟（秒清零）', () => {
    expect(nextAllowedTime(at(2026, 10, 5, 20, 15))).toEqual(at(2026, 10, 5, 20, 15))
  })
})
