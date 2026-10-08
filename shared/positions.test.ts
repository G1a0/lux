import { describe, expect, it } from 'vitest'
import {
  normalizeLcuPosition,
  toQq101Lane,
  fromQq101Position,
  POSITION_ORDER,
  POSITION_LABELS,
} from './positions'

describe('normalizeLcuPosition', () => {
  it('maps LCU values to internal positions', () => {
    expect(normalizeLcuPosition('top')).toBe('top')
    expect(normalizeLcuPosition('jungle')).toBe('jungle')
    expect(normalizeLcuPosition('middle')).toBe('mid')
    expect(normalizeLcuPosition('bottom')).toBe('bot')
    expect(normalizeLcuPosition('utility')).toBe('utility')
  })

  it('accepts internal values as-is', () => {
    expect(normalizeLcuPosition('mid')).toBe('mid')
    expect(normalizeLcuPosition('bot')).toBe('bot')
  })

  it('returns empty string for unknown or missing values', () => {
    expect(normalizeLcuPosition('')).toBe('')
    expect(normalizeLcuPosition(undefined)).toBe('')
    expect(normalizeLcuPosition('fill')).toBe('')
  })
})

describe('toQq101Lane', () => {
  it('maps internal positions to QQ101 lane values', () => {
    expect(toQq101Lane('top')).toBe('TOP')
    expect(toQq101Lane('jungle')).toBe('JUNGLE')
    expect(toQq101Lane('mid')).toBe('MIDDLE')
    expect(toQq101Lane('bot')).toBe('BOTTOM')
    expect(toQq101Lane('utility')).toBe('SUPPORT')
  })

  it('returns null when position is unknown', () => {
    expect(toQq101Lane('')).toBeNull()
  })
})

describe('fromQq101Position', () => {
  it('maps QQ101 position strings to internal positions', () => {
    expect(fromQq101Position('TOP')).toBe('top')
    expect(fromQq101Position('MIDDLE')).toBe('mid')
    expect(fromQq101Position('BOTTOM')).toBe('bot')
    expect(fromQq101Position('SUPPORT')).toBe('utility')
    expect(fromQq101Position('JUNGLE')).toBe('jungle')
  })

  it('returns empty string for unknown values', () => {
    expect(fromQq101Position('NONE')).toBe('')
    expect(fromQq101Position('')).toBe('')
  })
})

describe('constants', () => {
  it('exposes label constants', () => {
    expect(POSITION_ORDER).toEqual(['top', 'jungle', 'mid', 'bot', 'utility'])
    expect(POSITION_LABELS.mid).toBe('中路')
    expect(POSITION_LABELS.utility).toBe('辅助')
  })
})
