// 手工/定时跑同步：npx tsx scripts/sync-cli.ts --root ./data --lanes MIDDLE --limit 3
// --version 16.19 # 固定版本（新版本数据未就绪时用）
// 禁窗内直接退出（exit 2），绝不发请求；同步结果 blocked 退出 3，partial 退出 1。
// 全量同步默认放慢（间隔 500ms、并发 3），可用 --interval/--concurrency 覆盖；
// 过快会被腾讯 WAF 限流（2026-10-08 全量 1.7k 突发请求触发过 501）。
import { createQq101Client } from '../shared/qq101/client'
import { syncRiftData, ALL_LANES } from '../shared/qq101/sync'
import { createWarehouse } from '../shared/warehouse/store'
import { isApiAllowed, nextAllowedTime } from '../shared/timegate'
import type { Qq101Lane } from '../shared/positions'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main(): Promise<void> {
  const root = arg('root') ?? './data'
  const version = arg('version')
  const lanesArg = arg('lanes')
  const lanes = (lanesArg ? lanesArg.split(',') : ALL_LANES) as Qq101Lane[]
  const limit = arg('limit') ? Number(arg('limit')) : undefined
  const interval = arg('interval') ? Number(arg('interval')) : 500
  const concurrency = arg('concurrency') ? Number(arg('concurrency')) : 3

  const now = new Date()
  console.log(`[sync] 当前时间：${now.toLocaleString()}（${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]}）`)

  if (!isApiAllowed(now)) {
    console.error(`[sync] 处于禁窗（工作日 9-12 / 14-18），不发任何请求。下个允许时间：${nextAllowedTime(now).toLocaleString()}`)
    process.exit(2)
  }

  const client = createQq101Client({ minIntervalMs: interval })
  const warehouse = createWarehouse(root)
  console.log(`[sync] 数据目录：${root}，位置：${lanes.join(',')}${limit ? `，每位置英雄上限：${limit}` : ''}（间隔 ${interval}ms，并发 ${concurrency}）${version ? `，固定版本：${version}` : ''}`)

  const result = await syncRiftData({
    client,
    warehouse,
    lanes,
    patchOverride: version,
    championLimitPerLane: limit,
    concurrency,
    onProgress: (done, total) => {
      if (total > 0 && (done === total || done % 20 === 0)) console.log(`[sync] 进度 ${done}/${total}`)
    },
  })
  console.log('[sync] 结果：', JSON.stringify(result, null, 2))
  process.exit(result.status === 'partial' ? 1 : result.status === 'blocked' ? 3 : 0)
}

main().catch(error => {
  console.error('[sync] 未处理错误：', error)
  process.exit(1)
})
