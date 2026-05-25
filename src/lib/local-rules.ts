// src/lib/local-rules.ts

import counterData from '@/data/local-rules.json'

const COUNTER_MAP: Record<string, number[]> = counterData.counters ?? {}
const SYNERGY_MAP: Record<string, number[]> = counterData.synergies ?? {}

/**
 * 获取 championId 对 targetId 的克制分数（0-100）
 */
export function getCounterScore(championId: number, targetId: number): number {
  const counteredBy = COUNTER_MAP[String(targetId)]
  if (counteredBy?.includes(championId)) return 80
  return 50
}

/**
 * 获取 championId 与 allyId 的协同分数（0-100）
 */
export function getSynergyScore(championId: number, allyId: number): number {
  const synergies = SYNERGY_MAP[String(allyId)]
  if (synergies?.includes(championId)) return 80
  return 50
}

/**
 * 获取版本强度分（0-100）
 * 本地降级时所有英雄统一返回中性分
 */
export function getMetaScore(_championId: number): number {
  return 50
}
