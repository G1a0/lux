// LUX_UI_MOCK=1 时的验收装置：向 renderer 推夹具快照/视图指令，--screenshot <dir> 逐视图存 PNG。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BrowserWindow } from 'electron'

export const MOCK_VIEWS = ['main', 'expanded', 'aram', 'pill', 'settings', 'onboarding'] as const
export type MockView = (typeof MOCK_VIEWS)[number]

const RIFT_SNAPSHOT = {
  kind: 'rift',
  queueId: 420,
  advice: {
    ruleMode: false,
    primary: {
      championId: 711,
      score: 58.4,
      factors: [],
      dominantFactor: 'strength',
      reason: '版本强势：排位胜率 52.6%（T2）',
      partialData: false,
    },
    alternates: [
      { championId: 84, score: 52.8, factors: [], dominantFactor: null, reason: '你们缺法术伤害，阿卡丽正好补上', partialData: false },
      { championId: 90, score: 47.2, factors: [], dominantFactor: null, reason: '适合当前阵容', partialData: true },
    ],
    runes: { keystoneId: 8112, runeIds: [8112, 8139, 8140, 8106, 8210, 8226, 5005, 5008, 5001], subStyleCode: 'ws', source: 'qq101' },
    spells: { spellIds: [14, 4], source: 'qq101' },
  },
  names: { 711: '薇克丝', 84: '阿卡丽', 90: '玛尔扎哈' },
}

const ARAM_SNAPSHOT = {
  kind: 'aram',
  queueId: 450,
  aram: {
    action: 'swap',
    reason: '建议换 艾希：版本强势：大乱斗胜率 54.6%',
    swapTo: { championId: 22, score: 66.4, reason: '版本强势：大乱斗胜率 54.6%', factors: [], dominantFactor: 'strength', partialData: false },
    current: { championId: 711, score: 49.3, reason: '操作上手简单，适合新手', factors: [], dominantFactor: 'beginner', partialData: false },
    bench: [],
    runes: { keystoneId: 8008, runeIds: [8008, 8009, 9103, 8014, 8304, 8345, 5005, 5008, 5001], subStyleCode: 'qd', source: 'builtin' },
    spells: { spellIds: [4, 32], source: 'builtin' },
  },
  names: { 711: '薇克丝', 22: '艾希' },
}

export function mockSnapshotFor(view: MockView): unknown {
  if (view === 'aram') return ARAM_SNAPSHOT
  if (view === 'main' || view === 'expanded' || view === 'pill') return RIFT_SNAPSHOT
  return { kind: 'none' }
}

/** 依次切换视图并截图；返回落盘文件列表。 */
export async function captureAllViews(win: BrowserWindow, outDir: string): Promise<string[]> {
  mkdirSync(outDir, { recursive: true })
  const files: string[] = []
  for (const view of MOCK_VIEWS) {
    win.webContents.send('lux:mock-view', view, mockSnapshotFor(view))
    await new Promise(r => setTimeout(r, 400)) // 等一次渲染+动效
    const image = await win.webContents.capturePage()
    const file = join(outDir, `${view}.png`)
    writeFileSync(file, image.toPNG())
    files.push(file)
  }
  return files
}
