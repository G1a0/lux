// 符文基石 / 召唤师技能的展示名（MainPanel 与 AramPanel 共用，避免两处重复维护）
export const SPELL_NAMES: Record<number, string> = {
  1: '净化', 3: '虚弱', 4: '闪现', 6: '疾跑', 7: '治疗', 11: '惩戒', 12: '传送', 14: '点燃', 21: '护盾', 32: '标记',
}

export const KEYSTONES: Record<number, string> = {
  8005: '强攻', 8008: '致命节奏', 8010: '征服者', 8021: '迅捷步法',
  8112: '电刑', 8124: '掠食者', 8128: '黑暗收割', 9923: '丛刃',
  8214: '召唤艾黎', 8229: '奥术彗星', 8230: '相位猛冲',
  8437: '余震', 8439: '守护者', 8465: '不灭之握',
  8351: '冰川增幅', 8360: '启封的秘籍', 8369: '先攻', 8992: '冥火之触',
}

/** 基石 id → 中文名；未知回退 `基石{id}` */
export function keystoneName(id: number): string {
  return KEYSTONES[id] ?? `基石${id}`
}

/** 召唤师技能 id → 中文名；未知回退数字字符串 */
export function spellName(id: number): string {
  return SPELL_NAMES[id] ?? String(id)
}
