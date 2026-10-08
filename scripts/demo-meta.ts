// 演示用英雄元数据（Phase 3 由 LCU 资源接口替换）。
import type { ChampionMeta } from '../shared/champions/meta'

export const DEMO_META: ChampionMeta[] = [
  { id: 84, name: '阿卡丽', damageType: 'ap', roles: ['assassin'], difficulty: 7 },
  { id: 112, name: '维克托', damageType: 'ap', roles: ['mage'], difficulty: 5 },
  { id: 711, name: '薇克丝', damageType: 'ap', roles: ['mage'], difficulty: 4 },
  { id: 101, name: '泽拉斯', damageType: 'ap', roles: ['mage'], difficulty: 5 },
  { id: 105, name: '菲兹', damageType: 'ap', roles: ['assassin'], difficulty: 6 },
  { id: 57, name: '茂凯', damageType: 'ap', roles: ['tank'], difficulty: 3 },
  { id: 111, name: '诺提勒斯', damageType: 'ap', roles: ['tank', 'support'], difficulty: 3 },
  { id: 122, name: '德莱厄斯', damageType: 'ad', roles: ['fighter'], difficulty: 6 },
  { id: 86, name: '盖伦', damageType: 'ad', roles: ['fighter', 'tank'], difficulty: 3 },
  { id: 64, name: '李青', damageType: 'ad', roles: ['fighter'], difficulty: 9 },
  { id: 81, name: '伊泽瑞尔', damageType: 'ad', roles: ['marksman'], difficulty: 5 },
  { id: 22, name: '艾希', damageType: 'ad', roles: ['marksman'], difficulty: 4 },
  { id: 117, name: '璐璐', damageType: 'ap', roles: ['support'], difficulty: 4 },
  { id: 412, name: '锤石', damageType: 'ad', roles: ['support', 'tank'], difficulty: 8 },
  { id: 99, name: '拉克丝', damageType: 'ap', roles: ['mage', 'support'], difficulty: 4 },
  { id: 90, name: '玛尔扎哈', damageType: 'ap', roles: ['mage'], difficulty: 3 },
  { id: 3, name: '加里奥', damageType: 'ap', roles: ['tank', 'mage'], difficulty: 4 },
  { id: 876, name: '莉莉娅', damageType: 'ap', roles: ['fighter'], difficulty: 6 },
]
