import { describe, expect, it } from 'vitest'
import { mapWithConcurrency } from '@/lib/utils'

describe('mapWithConcurrency', () => {
  it('preserves result order', async () => {
    const results = await mapWithConcurrency([3, 1, 2], 2, async n => n * 10)
    expect(results).toEqual([30, 10, 20])
  })

  it('never exceeds the concurrency limit', async () => {
    let active = 0
    let peak = 0
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async () => {
      active++
      peak = Math.max(peak, active)
      await new Promise(resolve => setTimeout(resolve, 5))
      active--
      return null
    })
    expect(peak).toBe(2)
  })

  it('handles empty input', async () => {
    expect(await mapWithConcurrency([], 3, async n => n)).toEqual([])
  })
})
