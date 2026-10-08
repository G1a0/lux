// API 时段硬约束：工作日 9:00-12:00、14:00-18:00 禁止一切外部请求（含开发调试）。
// 所有网络入口必须通过 isApiAllowed；边界语义 [start, end)。

export interface BlockWindow {
  /** JS getDay()：0=周日 … 6=周六 */
  days: number[]
  startMinutes: number
  endMinutes: number
}

export const DEFAULT_BLOCK_WINDOWS: BlockWindow[] = [
  { days: [1, 2, 3, 4, 5], startMinutes: 9 * 60, endMinutes: 12 * 60 },
  { days: [1, 2, 3, 4, 5], startMinutes: 14 * 60, endMinutes: 18 * 60 },
]

export function isApiAllowed(now: Date, windows: BlockWindow[] = DEFAULT_BLOCK_WINDOWS): boolean {
  const day = now.getDay()
  const minutes = now.getHours() * 60 + now.getMinutes()
  return !windows.some(w => w.days.includes(day) && minutes >= w.startMinutes && minutes < w.endMinutes)
}

export function nextAllowedTime(now: Date, windows: BlockWindow[] = DEFAULT_BLOCK_WINDOWS): Date {
  const t = new Date(now)
  t.setSeconds(0, 0)
  for (let i = 0; i <= 8 * 24 * 60; i++) {
    if (isApiAllowed(t, windows)) return new Date(t)
    t.setMinutes(t.getMinutes() + 1)
  }
  return new Date(t)
}
