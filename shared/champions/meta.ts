// 英雄元数据：Phase 2 由调用方注入（演示字典 / 测试假数据）；
// Phase 3 接 LCU 资源接口后替换数据来源，接口不变。
export type ChampionRole = 'fighter' | 'tank' | 'mage' | 'assassin' | 'marksman' | 'support'

export type DamageType = 'ad' | 'ap' | 'mixed'

export interface ChampionMeta {
  id: number
  name: string
  damageType: DamageType
  roles: ChampionRole[]
  /** 官方难度 1-10（越高越难） */
  difficulty: number
}

export interface ChampionIndex {
  get(id: number): ChampionMeta | null
  all(): ChampionMeta[]
}

export function createChampionIndex(list: ChampionMeta[]): ChampionIndex {
  const byId = new Map(list.map(c => [c.id, c]))
  return {
    get: id => byId.get(id) ?? null,
    all: () => [...byId.values()],
  }
}

export function isFrontline(meta: ChampionMeta | null): boolean {
  if (!meta) return false
  return meta.roles.includes('tank') || meta.roles.includes('fighter')
}
