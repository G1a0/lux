// 3A 验收 CLI：用 Mock LCU + 真实 ./data 数据仓，跑通「读会话 → 出推荐」；
// 用法：npx tsx scripts/lux-dev-cli.ts [--scenario draft|aram] [--apply] [--root ./data]
// --apply 会向 Mock 发起符文/技能写入并打印 Mock 收到的请求（验证写入链路）。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMockLcu } from '../shared/lcu/mock/server'
import { buildChampionIndex } from '../shared/lcu/resources'
import { createLcuHttp } from '../shared/lcu/http'
import { createLcuReaders } from '../shared/lcu/readers'
import { mapAramInput, mapRiftContext } from '../shared/lcu/map-session'
import { applyRunePage, carrySpells } from '../shared/lcu/writers'
import { createWarehouse } from '../shared/warehouse/store'
import { createEngineData } from '../shared/engine/data'
import { recommendRift } from '../shared/engine/recommend'
import { judgeAram } from '../shared/engine/aram'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const root = arg('root') ?? './data'
const scenario = process.argv.includes('aram') ? 'aram' : 'draft'
const shouldApply = process.argv.includes('--apply')

// tsx 以 ESM 直接运行时没有 __dirname（vitest 有 vite 注入，故测试文件可用）；从 import.meta.url 推导
const scriptDir = dirname(fileURLToPath(import.meta.url))
const FIX = join(scriptDir, '..', 'shared', 'lcu', 'fixtures')
const readFixture = (name: string) => JSON.parse(readFileSync(join(FIX, name), 'utf-8'))

async function main(): Promise<void> {
  const mock = await createMockLcu({
    certDir: join(FIX, 'test-certs'),
    routes: {
      '/lol-champ-select/v1/session': { json: readFixture(`session-${scenario === 'aram' ? 'aram' : 'draft-mid'}.json`) },
      '/lol-summoner/v1/current-summoner': { json: { summonerId: 33, displayName: 'Lux 开发者' } },
      '/lol-champions/v1/inventories/33/champions': { json: readFixture('owned-champions.json') },
      '/lol-champions/v1/free-rotation': { json: readFixture('free-rotation.json') },
      '/lol-game-data/assets/v1/champion-summary.json': { json: readFixture('champion-summary.json') },
      '/lol-game-data/assets/v1/champions/84.json': { json: readFixture('champion-detail-84.json') },
      '/lol-game-data/assets/v1/champions/112.json': { json: readFixture('champion-detail-112.json') },
      '/lol-perks/v1/pages': { handler: (_b, req) => (req.method === 'POST' ? { json: { id: 9001 } } : { json: [] }) },
      '/lol-champ-select/v1/session/my-selection': { status: 204 },
    },
  })

  const http = createLcuHttp({ port: mock.port, password: mock.password })
  const readers = createLcuReaders(http)
  const index = await buildChampionIndex(http)
  const warehouse = createWarehouse(root)
  const data = createEngineData(warehouse, index)

  const session = await readers.getChampSelectSession()
  if (!session) throw new Error('Mock 未返回会话')

  if (scenario === 'aram') {
    const input = mapAramInput(session)
    if (!input) throw new Error('大乱斗映射失败')
    const result = judgeAram(input, data)
    console.log('=== 大乱斗 换/留 判定（Mock 会话） ===')
    console.log(JSON.stringify({ action: result.action, reason: result.reason, runes: result.runes, spells: result.spells }, null, 2))
    if (shouldApply && result.runes) {
      const applied = await applyRunePage(http, {
        name: result.action, // 前缀由 applyRunePage 统一添加（Lux·）
        keystoneId: result.runes.keystoneId,
        subStyleCode: result.runes.subStyleCode ?? 'jj',
        runeIds: result.runes.runeIds,
      })
      const carried = await carrySpells(http, result.spells!.spellIds)
      console.log(`[apply] 符文=${applied.ok} 技能=${carried}`)
    }
  } else {
    const ctx = mapRiftContext(session)
    if (!ctx) throw new Error('征召映射失败')
    const owned = [...(await readers.getOwnedChampionIds()), ...(await readers.getFreeRotationIds())]
    const advice = recommendRift({ ...ctx, ownedChampionIds: owned }, data)
    console.log('=== 排位·中单 推荐（Mock 会话 + 真实数据仓） ===')
    console.log(JSON.stringify({ ruleMode: advice.ruleMode, primary: advice.primary, alternates: advice.alternates, runes: advice.runes, spells: advice.spells }, null, 2))
    if (shouldApply && advice.spells) {
      const applied = await applyRunePage(http, {
        name: '排位', // 前缀由 applyRunePage 统一添加（Lux·）
        keystoneId: advice.runes?.keystoneId ?? 0,
        subStyleCode: advice.runes?.subStyleCode ?? 'jj',
        runeIds: advice.runes?.runeIds ?? [],
      })
      const carried = await carrySpells(http, advice.spells.spellIds)
      console.log(`[apply] 符文=${applied.ok} 技能=${carried}`)
    }
  }

  if (shouldApply) {
    console.log('--- Mock 收到的写请求 ---')
    for (const r of mock.received) console.log(`${r.method} ${r.url}`, JSON.stringify(r.body ?? ''))
  }

  await mock.stop()
}

main().catch(error => {
  console.error('[lux-dev-cli] 失败：', error)
  process.exit(1)
})
