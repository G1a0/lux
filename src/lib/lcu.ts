import type { ChampSelectSession, SummonerInfo, LCUEventMessage } from '@/types/lcu'
import { LcuEventUri } from '@/types/lcu'

type EventCallback = (message: LCUEventMessage) => void

class LCUManager {
  private eventListeners = new Map<string, Set<EventCallback>>()
  private observedUris = new Set<string>()
  private penguContext: PenguContext | null = null

  bindContext(context: PenguContext) {
    this.penguContext = context
    const uris = Array.from(this.eventListeners.keys())
    this.observedUris.clear()
    uris.forEach(uri => this.observeUriOnSocket(uri))
  }

  private observeUriOnSocket(uri: string) {
    if (!this.penguContext || this.observedUris.has(uri)) return
    this.observedUris.add(uri)
    // Pengu 文档：socket.observe 的 listener 收到 { data, uri, eventType }
    this.penguContext.socket.observe(uri, (raw: unknown) => {
      const message = raw as LCUEventMessage
      this.eventListeners.get(uri)?.forEach(cb => cb(message))
    })
  }

  observe(uri: string, callback: EventCallback): () => void {
    let listeners = this.eventListeners.get(uri)
    if (!listeners) {
      listeners = new Set()
      this.eventListeners.set(uri, listeners)
    }
    listeners.add(callback)
    this.observeUriOnSocket(uri)
    return () => {
      listeners?.delete(callback)
      if (listeners?.size === 0) this.eventListeners.delete(uri)
    }
  }

  // --- REST API ---

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...options.headers },
    })
    if (!res.ok) throw new Error(`[LCU] ${options.method ?? 'GET'} ${url} → ${res.status}`)
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  // --- Champ Select ---

  getChampSelectSession(): Promise<ChampSelectSession> {
    return this.request<ChampSelectSession>('/lol-champ-select/v1/session')
  }

  getPickableChampionIds(): Promise<number[]> {
    return this.request<number[]>('/lol-champ-select/v1/pickable-champion-ids')
  }

  getSummonerInfo(): Promise<SummonerInfo> {
    return this.request<SummonerInfo>('/lol-summoner/v1/current-summoner')
  }
}

export const lcu = new LCUManager()
export { LcuEventUri }
export type { ChampSelectSession, LCUEventMessage }
