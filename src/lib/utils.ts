// src/lib/utils.ts

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, delayMs)
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index])
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker)
  await Promise.all(workers)
  return results
}

export function normalizeScore(scores: Map<number, number>): Map<number, number> {
  const entries = Array.from(scores.entries())
  if (entries.length === 0) return scores

  const min = Math.min(...entries.map(([, v]) => v))
  const max = Math.max(...entries.map(([, v]) => v))

  if (max === min) {
    return new Map(entries.map(([k]) => [k, 50]))
  }

  return new Map(
    entries.map(([k, v]) => [k, Math.round(((v - min) / (max - min)) * 100)]),
  )
}
