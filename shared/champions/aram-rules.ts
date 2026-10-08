// 大乱斗内置规则表：101 无按英雄的大乱斗符文/技能数据（2026-10-08 侦察确认），
// 这里按英雄定位给出「代表英雄的 101 峡谷符文页」（采集样本见 qq101/fixtures/recon-rule-*），
// 技能统一为 闪现(4) + 标记/冲刺(32)。全部为可调配置。
import type { ChampionIndex, ChampionRole } from './meta'

export type AramRuleKey = ChampionRole

export interface AramRule {
  key: AramRuleKey
  label: string
  /** 来源（哪个英雄的峡谷符文页） */
  sourceChampionId: number
  keystoneId: number
  runeIds: number[]
  spellIds: [number, number]
}

export const ARAM_RULES: Record<AramRuleKey, AramRule> = {
  assassin: {
    key: 'assassin', label: '刺客',
    sourceChampionId: 84, // 采集于 recon-runeinfo-84-mid-20261008.json 第 1 页
    keystoneId: 8112,
    runeIds: [8112, 8143, 8140, 8106, 8444, 8451, 5008, 5008, 5001],
    spellIds: [4, 32],
  },
  mage: {
    key: 'mage', label: '法师',
    sourceChampionId: 112, // 采集于 recon-rule-mage-112-20261008.json 第 1 页
    keystoneId: 8992,
    runeIds: [8992, 8226, 8210, 8237, 8401, 8473, 5005, 5008, 5001],
    spellIds: [4, 32],
  },
  tank: {
    key: 'tank', label: '坦克',
    sourceChampionId: 57, // 采集于 recon-rule-tank-57-20261008.json 第 1 页
    keystoneId: 8437,
    runeIds: [8437, 8446, 8444, 8451, 8345, 8347, 5005, 5001, 5001],
    spellIds: [4, 32],
  },
  marksman: {
    key: 'marksman', label: '射手',
    sourceChampionId: 81, // 采集于 recon-rule-marksman-81-20261008.json 第 1 页
    keystoneId: 8008,
    runeIds: [8008, 8009, 9103, 8014, 8304, 8345, 5005, 5008, 5001],
    spellIds: [4, 32],
  },
  support: {
    key: 'support', label: '辅助',
    sourceChampionId: 117, // 采集于 recon-rule-support-117-20261008.json 第 1 页
    keystoneId: 8214,
    runeIds: [8214, 8226, 8210, 8237, 8453, 8473, 5007, 5008, 5001],
    spellIds: [4, 32],
  },
  fighter: {
    key: 'fighter', label: '战士',
    sourceChampionId: 122, // 采集于 recon-rule-fighter-122-20261008.json 第 1 页
    keystoneId: 8010,
    runeIds: [8010, 9111, 9104, 8299, 8224, 8234, 5005, 5008, 5001],
    spellIds: [4, 32],
  },
}

// 优先级：前排/开团优先（坦克→辅助），避免开团型辅助被路由到艾黎保护页；
// 纯保护型辅助（仅 support 角色）不受影响。全员冻结，防止下游就地修改共享数组。
const PRIORITY: AramRuleKey[] = ['tank', 'support', 'assassin', 'mage', 'marksman', 'fighter']

Object.freeze(ARAM_RULES)
for (const rule of Object.values(ARAM_RULES)) {
  Object.freeze(rule.runeIds)
  Object.freeze(rule.spellIds)
  Object.freeze(rule)
}

export function aramRuleFor(championId: number, index: ChampionIndex): AramRule {
  const meta = index.get(championId)
  if (meta) {
    for (const key of PRIORITY) {
      if (meta.roles.includes(key)) return ARAM_RULES[key]
    }
  }
  return ARAM_RULES.fighter
}
