// Lux 实时选人助手 CLI（真实客户端联调入口）：轮询 LCU 选人会话，实时打印中文建议；
// --apply 时同步应用符文页与召唤师技能。两种模式：
//   - 离线预览：--mock <draft|aram> 启动内嵌 Mock LCU（复用 shared/lcu/mock 与 fixtures），
//     用于无客户端/无网络环境下的回归自检；
//   - 真实模式：自动发现 lockfile 连接本机客户端（--lcu-dir 或环境变量 LUX_LCU_DIR 可覆盖）。
//
// 用法（在仓库根目录执行）：
//   离线预览：
//     npx tsx scripts/lux-live-cli.ts --mock draft --once
//     npx tsx scripts/lux-live-cli.ts --mock aram --once --apply
//   真实客户端：
//     npx tsx scripts/lux-live-cli.ts                        # 默认 ./data，每 1.5s 轮询
//     npx tsx scripts/lux-live-cli.ts --apply                # 应用推荐的符文页 + 召唤师技能
//     npx tsx scripts/lux-live-cli.ts --dump                 # 附加打印原始会话 JSON
//     npx tsx scripts/lux-live-cli.ts --root ./data --interval 1000 --lcu-dir 'D:/WeGameApps/英雄联盟/LeagueClient'
//
// 参数：--root <dir>（数据仓目录，默认 ./data）· --interval <ms>（轮询间隔，默认 1500）
//      --apply（应用符文/技能）· --dump（打印原始会话 JSON）· --once（单次轮询后退出）
//      --mock <draft|aram>（内嵌 Mock 场景）· --lcu-dir <path>（lockfile 目录覆盖）
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createEngineData, type EngineData } from '../shared/engine/data'
import { judgeAram } from '../shared/engine/aram'
import { recommendRift } from '../shared/engine/recommend'
import type { AramJudgeResult, RiftAdvice, RuneAdvice, SpellAdvice } from '../shared/engine/types'
import { createLcuHttp, type LcuHttp } from '../shared/lcu/http'
import { discoverLockfile, type LcuLockfile } from '../shared/lcu/lockfile'
import { mapAramInput, mapRiftContext, proficiencyFromMastery } from '../shared/lcu/map-session'
import { createMockLcu, type MockLcu } from '../shared/lcu/mock/server'
import { createLcuReaders, type LcuReaders } from '../shared/lcu/readers'
import { buildChampionIndex } from '../shared/lcu/resources'
import type { ChampSelectSession } from '../shared/lcu/types'
import { applyRunePage, carrySpells } from '../shared/lcu/writers'
import { createWarehouse } from '../shared/warehouse/store'

// ---------- 参数 ----------

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const root = arg('root') ?? './data'
const intervalRaw = Number(arg('interval'))
const intervalMs = Number.isFinite(intervalRaw) && intervalRaw > 0 ? intervalRaw : 1500
const shouldApply = process.argv.includes('--apply')
const shouldDump = process.argv.includes('--dump')
const once = process.argv.includes('--once')
const lcuDirArg = arg('lcu-dir')

let mockScenario: 'draft' | 'aram' | null = null
if (process.argv.includes('--mock')) {
  const value = arg('mock')
  if (value !== 'draft' && value !== 'aram') {
    console.error('用法：--mock <draft|aram>')
    process.exit(2)
  }
  mockScenario = value
}

// tsx 以 ESM 直接运行时没有 __dirname（vitest 有 vite 注入，故测试文件可用）；从 import.meta.url 推导
const scriptDir = dirname(fileURLToPath(import.meta.url))
const FIX = join(scriptDir, '..', 'shared', 'lcu', 'fixtures')
const readFixture = (name: string) => JSON.parse(readFileSync(join(FIX, name), 'utf-8'))

// ---------- 显示 ----------

// 位置中文映射按 CLI 展示口径（shared/positions.ts 的 POSITION_LABELS 面向另一场景，措辞不同）
const POSITION_CN: Record<string, string> = { top: '上单', jungle: '打野', mid: '中单', bot: '下路', utility: '辅助' }

const SPELL_CN: Record<number, string> = {
  1: '净化', 3: '虚弱', 4: '闪现', 6: '疾跑', 7: '治疗',
  11: '惩戒', 12: '传送', 14: '点燃', 21: '护盾', 32: '标记',
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))
const stamp = () => `[${new Date().toTimeString().slice(0, 8)}]`
const fmtScore = (score: number) => String(Math.round(score * 10) / 10)
const spellName = (id: number) => SPELL_CN[id] ?? `技能${id}`
const errText = (error: unknown) => (error instanceof Error ? error.message : String(error))

let lineOpen = false
function endOpenLine(): void {
  if (lineOpen) {
    process.stdout.write('\n')
    lineOpen = false
  }
}
function printBlock(lines: string[]): void {
  endOpenLine()
  console.log(lines.join('\n'))
}

// ---------- 运行态 ----------

let mock: MockLcu | null = null
let exiting = false
let http: LcuHttp
let readers: LcuReaders
let data: EngineData
const roster = { ownedChampionIds: [] as number[], proficiency: {} as Record<number, number> }
let rosterRefreshedAt = 0
let lastKey: string | null = null
let hadSession = false
let idlePolls = 0

const nameOf = (championId: number): string => data.champion(championId)?.name ?? `英雄${championId}`

// ---------- 退出 ----------

async function shutdown(code: number, message?: string): Promise<void> {
  if (exiting) process.exit(code) // 二次 Ctrl+C：不再等待清理
  exiting = true
  endOpenLine()
  if (message) console.log(message)
  if (mock) {
    try {
      await mock.stop()
    } catch {
      // 清理失败不阻塞退出
    }
  }
  process.exit(code)
}

process.on('SIGINT', () => {
  void shutdown(0, '再见')
})

// ---------- 连接 ----------

function currentLockfile(): LcuLockfile | null {
  // mock 模式指向内嵌服务器；live 模式 --lcu-dir > LUX_LCU_DIR > 默认候选（discoverLockfile 内处理）
  return mock ? discoverLockfile({ envDir: mock.lcuDir }) : discoverLockfile({ envDir: lcuDirArg })
}

async function awaitLockfile(): Promise<LcuLockfile | null> {
  let warned = false
  for (;;) {
    const lockfile = currentLockfile()
    if (lockfile) return lockfile
    if (once) return null // --once：单次发现失败由调用方打印消息并以 1 退出
    if (!warned) {
      console.log('未发现客户端（等待中… 请启动游戏客户端）')
      warned = true
    }
    await sleep(3000)
  }
}

async function refreshRoster(force: boolean): Promise<void> {
  if (!force && Date.now() - rosterRefreshedAt < 60_000) return
  const [owned, free, masteryPoints] = await Promise.all([
    readers.getOwnedChampionIds(),
    readers.getFreeRotationIds(),
    readers.getChampionMasteryPoints(),
  ])
  roster.ownedChampionIds = [...new Set([...owned, ...free])]
  roster.proficiency = Object.fromEntries(
    Object.entries(masteryPoints).map(([id, points]) => [id, proficiencyFromMastery(points)]),
  )
  rosterRefreshedAt = Date.now()
}

async function connect(lockfile: LcuLockfile): Promise<void> {
  http = createLcuHttp({ port: lockfile.port, password: lockfile.password })
  readers = createLcuReaders(http)
  if (!data) {
    const index = await buildChampionIndex(http)
    const warehouse = createWarehouse(root)
    data = createEngineData(warehouse, index)
    if (warehouse.readManifest() === null) {
      console.log('提示：未发现数据仓（--root 指向的目录无 manifest），结果将退化为规则模式')
    }
  }
  await refreshRoster(true)
}

// ---------- 变化检测与渲染 ----------

function changeKey(session: ChampSelectSession): string {
  const me = session.myTeam.find(p => p.cellId === session.localPlayerCellId)
  return JSON.stringify({
    queueId: session.queueId,
    me: me ? me.championId : null,
    myTeam: session.myTeam.map(p => p.championId),
    theirTeam: session.theirTeam.map(p => p.championId),
    bench: session.benchChampions.map(b => b.championId),
    rerolls: session.rerollsRemaining,
    bans: [...session.bans.myTeamBans, ...session.bans.theirTeamBans],
  })
}

function runeLine(runes: RuneAdvice | null): string {
  if (!runes) return '符文：暂无'
  return `符文：基石 ${runes.keystoneId} · 副系 ${runes.subStyleCode ?? '-'} · [${runes.runeIds.join(', ')}]`
}

function spellLine(spells: SpellAdvice | null): string {
  if (!spells) return '技能：暂无'
  return `技能：${spellName(spells.spellIds[0])} + ${spellName(spells.spellIds[1])}`
}

function riftBlock(session: ChampSelectSession, position: string, advice: RiftAdvice): string[] {
  const primary = advice.primary
  const alternates = advice.alternates.slice(0, 2)
  return [
    `${stamp()} 选人会话 ${session.queueId} · 位置：${POSITION_CN[position] ?? '未知'}`,
    `主推：${nameOf(primary.championId)}（${fmtScore(primary.score)} 分）— ${primary.reason}${primary.partialData ? '（部分数据缺失）' : ''}`,
    alternates.length > 0
      ? `备选：${alternates.map(a => `${nameOf(a.championId)}（${fmtScore(a.score)}）— ${a.reason}`).join('；')}`
      : '备选：无',
    runeLine(advice.runes),
    spellLine(advice.spells),
  ]
}

function aramSuggestion(result: AramJudgeResult): string {
  if (result.action === 'swap' && result.swapTo) {
    const target = result.swapTo
    return `建议：换 ${nameOf(target.championId)}（${fmtScore(target.score)}）— ${target.reason}`
  }
  if (result.action === 'reroll') {
    // reason 原文已含"建议掷骰子"（如：手里英雄都不强，建议掷骰子），这里去掉重复尾缀
    const reason = result.reason.replace(/，?建议掷骰子$/, '') || result.reason
    return `建议：掷骰子 — ${reason}`
  }
  // reason 原文形如"留着 <名>：手里最好"，这里去掉重复前缀
  const reason = result.reason.replace(/^留着[^：]+：/, '') || result.reason
  return `建议：留着 — ${reason}`
}

function aramBlock(result: AramJudgeResult): string[] {
  const current = result.current
  return [
    `${stamp()} 大乱斗 · 当前：${nameOf(current.championId)}（${fmtScore(current.score)} 分）`,
    aramSuggestion(result),
    runeLine(result.runes),
    spellLine(result.spells),
  ]
}

async function applyAdvice(pageName: string, runes: RuneAdvice | null, spells: SpellAdvice | null): Promise<void> {
  const parts: string[] = []
  if (runes) {
    const applied = await applyRunePage(http, {
      name: pageName,
      keystoneId: runes.keystoneId,
      subStyleCode: runes.subStyleCode ?? 'jj',
      runeIds: runes.runeIds,
    })
    parts.push(applied.ok ? '符文页：成功' : `符文页：失败（${applied.reason ?? '未知原因'}）`)
  }
  if (spells) {
    const carried = await carrySpells(http, spells.spellIds)
    parts.push(carried ? '技能：成功' : '技能：失败')
  }
  console.log(parts.length > 0 ? `[apply] ${parts.join(' ')}` : '[apply] 无可应用内容（缺符文与技能数据）')
}

// ---------- 轮询 ----------

async function watch(): Promise<'reconnect' | 'done'> {
  for (;;) {
    try {
      await refreshRoster(false)
    } catch {
      return 'reconnect'
    }
    let session: ChampSelectSession | null
    try {
      session = await readers.getChampSelectSession()
    } catch {
      return 'reconnect'
    }

    if (!session) {
      if (hadSession) {
        printBlock([`${stamp()} 已离开选人`])
        hadSession = false
        lastKey = null
        idlePolls = 0
      } else if (once) {
        printBlock([`${stamp()} 当前无选人会话`])
      } else {
        idlePolls += 1
        if (idlePolls % 10 === 0) {
          process.stdout.write('.')
          lineOpen = true
        }
      }
      if (once) return 'done'
      await sleep(intervalMs)
      continue
    }

    const key = changeKey(session)
    if (key === lastKey && !once) {
      await sleep(intervalMs)
      continue
    }
    lastKey = key
    hadSession = true
    idlePolls = 0

    try {
      if (session.queueId === 450) {
        const input = mapAramInput(session)
        if (input) {
          const result = judgeAram(input, data)
          printBlock(aramBlock(result))
          if (shouldDump) console.log(JSON.stringify(session, null, 2))
          if (shouldApply) await applyAdvice(result.action, result.runes, result.spells)
        } else {
          printBlock([`${stamp()} 大乱斗 · 英雄尚未分配，等待中`])
        }
      } else {
        const ctx = mapRiftContext(session, { proficiency: roster.proficiency })
        if (ctx) {
          const advice = recommendRift({ ...ctx, ownedChampionIds: roster.ownedChampionIds }, data)
          printBlock(riftBlock(session, ctx.myPosition ?? '', advice))
          if (shouldDump) console.log(JSON.stringify(session, null, 2))
          if (shouldApply) await applyAdvice('排位', advice.runes, advice.spells)
        } else {
          printBlock([`${stamp()} 不支持的模式（queueId=${session.queueId}，等待进入受支持的选人）`])
        }
      }
    } catch (error) {
      printBlock([`${stamp()} 建议计算失败：${errText(error)}`])
    }

    if (once) return 'done'
    await sleep(intervalMs)
  }
}

// ---------- 主流程 ----------

async function main(): Promise<void> {
  if (mockScenario) {
    mock = await createMockLcu({
      certDir: join(FIX, 'test-certs'),
      routes: {
        '/lol-champ-select/v1/session': { json: readFixture(mockScenario === 'aram' ? 'session-aram.json' : 'session-draft-mid.json') },
        '/lol-summoner/v1/current-summoner': { json: { summonerId: 33, displayName: 'Lux 开发者' } },
        '/lol-champions/v1/inventories/33/champions': { json: readFixture('owned-champions.json') },
        '/lol-champions/v1/free-rotation': { json: readFixture('free-rotation.json') },
        '/lol-champion-mastery/v1/local-player/champion-mastery': { json: readFixture('champion-mastery.json') },
        '/lol-game-data/assets/v1/champion-summary.json': { json: readFixture('champion-summary.json') },
        '/lol-game-data/assets/v1/champions/84.json': { json: readFixture('champion-detail-84.json') },
        '/lol-game-data/assets/v1/champions/112.json': { json: readFixture('champion-detail-112.json') },
        '/lol-perks/v1/pages': { handler: (_body, req) => (req.method === 'POST' ? { json: { id: 9001 } } : { json: [] }) },
        '/lol-champ-select/v1/session/my-selection': { status: 204 },
      },
    })
  }

  try {
    let announced = false
    for (;;) {
      const lockfile = await awaitLockfile()
      if (!lockfile) {
        console.log('未发现客户端（等待中… 请启动游戏客户端）')
        process.exitCode = 1
        return
      }

      try {
        await connect(lockfile)
      } catch (error) {
        if (once) throw error
        console.log(`连接初始化失败（${errText(error)}），3 秒后重试…`)
        await sleep(3000)
        continue
      }

      if (!announced) {
        console.log(`已连接客户端：${lockfile.processName} · pid ${lockfile.pid} · 端口 ${lockfile.port}`)
        announced = true
      }

      const outcome = await watch()
      if (outcome === 'done') return

      endOpenLine()
      console.log('与客户端的连接中断，重新寻找客户端…')
      lastKey = null
      hadSession = false
      idlePolls = 0
    }
  } finally {
    if (mock) {
      await mock.stop()
      mock = null
    }
  }
}

main().catch(error => {
  endOpenLine()
  console.error('[lux-live] 失败：', error)
  process.exitCode = 1
})
