import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mapAramInput, mapRiftContext, proficiencyFromMastery } from './map-session'
import type { ChampSelectSession } from './types'

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf-8')) as ChampSelectSession

describe('mapRiftContext', () => {
  it('420 中单：位置/我方/敌方/ban 正确提取，我未选时排除自己', () => {
    const ctx = mapRiftContext(fixture('session-draft-mid.json'))
    expect(ctx).not.toBeNull()
    expect(ctx!.queueId).toBe(420)
    expect(ctx!.myPosition).toBe('mid')
    expect(ctx!.allies.map(a => a.championId).sort((a, b) => a - b)).toEqual([64, 86])
    expect(ctx!.enemies.map(e => e.championId)).toEqual([112])
    expect(ctx!.bans?.sort((a, b) => a - b)).toEqual([99, 105])
  })

  it('不支持的模式返回 null', () => {
    const session = { ...fixture('session-draft-mid.json'), queueId: 1700 }
    expect(mapRiftContext(session)).toBeNull()
  })

  it('450 走 aram 输入：当前英雄/备战席/骰子/双方阵容', () => {
    const input = mapAramInput(fixture('session-aram.json'))
    expect(input).not.toBeNull()
    expect(input!.current).toBe(711)
    expect(input!.bench).toEqual([84, 57])
    expect(input!.diceLeft).toBe(2)
    expect(input!.allies?.sort((a, b) => a - b)).toEqual([90, 111])
    expect(input!.enemies?.sort((a, b) => a - b)).toEqual([64, 105])
  })

  it('450 但当前英雄为 0（换人中间态）返回 null', () => {
    const session = fixture('session-aram.json')
    session.myTeam[2].championId = 0
    expect(mapAramInput(session)).toBeNull()
  })

  it('熟练度折算 0-100 并可注入上下文', () => {
    expect(proficiencyFromMastery(35000)).toBe(100)
    expect(proficiencyFromMastery(8000)).toBe(23)
    expect(proficiencyFromMastery(0)).toBe(0)
    const ctx = mapRiftContext(fixture('session-draft-mid.json'), { proficiency: { 84: 23 } })
    expect(ctx!.proficiency).toEqual({ 84: 23 })
  })
})
