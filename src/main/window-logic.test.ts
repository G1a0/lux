import { describe, expect, it } from 'vitest'
import { snapToEdge, clampToWorkArea } from './window-logic'

const area = { x: 0, y: 0, width: 1920, height: 1080 }

describe('snapToEdge', () => {
  it('靠近左/右边缘（≤24px）时吸附', () => {
    expect(snapToEdge({ x: 10, y: 300 }, { width: 380, height: 240 }, area, 24)).toEqual({ x: 0, y: 300 })
    expect(snapToEdge({ x: 1920 - 380 - 10, y: 300 }, { width: 380, height: 240 }, area, 24)).toEqual({ x: 1920 - 380, y: 300 })
  })

  it('远离边缘保持原位', () => {
    expect(snapToEdge({ x: 700, y: 300 }, { width: 380, height: 240 }, area, 24)).toEqual({ x: 700, y: 300 })
  })
})

describe('clampToWorkArea', () => {
  it('越界坐标被约束回工作区', () => {
    expect(clampToWorkArea({ x: -50, y: -50 }, { width: 380, height: 240 }, area)).toEqual({ x: 0, y: 0 })
    expect(clampToWorkArea({ x: 99999, y: 99999 }, { width: 380, height: 240 }, area)).toEqual({ x: 1540, y: 840 })
  })
})
