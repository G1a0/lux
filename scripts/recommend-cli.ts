// 推荐引擎冒烟：用 ./data 数据仓 + 演示英雄字典跑两个场景。
// 用法：npx tsx scripts/recommend-cli.ts --root ./data rift
//       npx tsx scripts/recommend-cli.ts --root ./data aram
import { readFileSync } from 'node:fs'
import { createWarehouse } from '../shared/warehouse/store'
import { createEngineData, type EngineData } from '../shared/engine/data'
import { createChampionIndex } from '../shared/champions/meta'
import { recommendRift } from '../shared/engine/recommend'
import { judgeAram } from '../shared/engine/aram'
import { parseQq101AramOverview } from '../shared/qq101/parse'
import { DEMO_META } from './demo-meta'
import type { DraftContext } from '../shared/engine/types'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const root = arg('root') ?? './data'
const scenario = process.argv.includes('aram') ? 'aram' : 'rift'

const warehouse = createWarehouse(root)
const index = createChampionIndex(DEMO_META)
let data: EngineData = createEngineData(warehouse, index)

if (scenario === 'aram' && data.aramOverview() === null) {
  // ./data 尚无大乱斗总览（等允许窗口补同步）时，退回已入库的侦察样本
  const sample = JSON.parse(readFileSync('shared/qq101/fixtures/recon-aram-hero-overview-20261008.json', 'utf-8'))
  const heroes = parseQq101AramOverview(sample)
  data = { ...data, aramOverview: () => heroes }
  console.log('[cli] 提示：数据仓无大乱斗总览，使用侦察样本代替')
}

if (scenario === 'rift') {
  const ctx: DraftContext = {
    queueId: 420,
    myPosition: 'mid',
    allies: [
      { championId: 111, position: 'utility' },
      { championId: 64, position: 'jungle' },
    ],
    enemies: [
      { championId: 112, position: 'mid' },
      { championId: 86, position: 'top' },
      { championId: 81, position: 'bot' },
      { championId: 117, position: 'utility' },
    ],
    bans: [105],
  }
  const advice = recommendRift(ctx, data)
  if (advice.ruleMode) console.log('[cli] 提示：数据仓榜单缺失，规则模式输出')
  console.log('=== 排位·中单 推荐 ===')
  console.log(JSON.stringify(advice, null, 2))
} else {
  const result = judgeAram({
    current: 711,
    bench: [84, 57, 22],
    diceLeft: 2,
    allies: [90, 111, 22, 412],
    enemies: [105, 64],
  }, data)
  console.log('=== 大乱斗 换/留 判定 ===')
  console.log(JSON.stringify(result, null, 2))
}
