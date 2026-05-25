// src/lib/store.ts

export interface LuxConfig {
  championRecommendation: boolean
}

type ConfigListener<K extends keyof LuxConfig> = (value: LuxConfig[K]) => void

const DEFAULTS: LuxConfig = {
  championRecommendation: true,
}

class LuxStore {
  private cache: LuxConfig
  private listeners = new Map<keyof LuxConfig, Set<ConfigListener<keyof LuxConfig>>>()

  constructor() {
    this.cache = { ...DEFAULTS }
  }

  get<K extends keyof LuxConfig>(key: K): LuxConfig[K] {
    const stored = DataStore.get<LuxConfig[K]>(`lux.${key}`)
    return stored !== undefined ? stored : DEFAULTS[key]
  }

  set<K extends keyof LuxConfig>(key: K, value: LuxConfig[K]) {
    this.cache[key] = value
    DataStore.set(`lux.${key}`, value)
    this.listeners.get(key)?.forEach(fn => fn(value))
  }

  onChange(key: keyof LuxConfig, callback: (value: LuxConfig[keyof LuxConfig]) => void) {
    let set = this.listeners.get(key)
    if (!set) {
      set = new Set()
      this.listeners.set(key, set)
    }
    set.add(callback)
    return () => set!.delete(callback)
  }

  load() {
    for (const key of Object.keys(DEFAULTS) as (keyof LuxConfig)[]) {
      this.cache[key] = this.get(key)
    }
  }
}

export const store = new LuxStore()
