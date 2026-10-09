// 真实装配：LCU advisor + 引擎 + 数据仓 + 同步器 → CompanionService。
import { app } from 'electron'
import { join } from 'node:path'
import { createLcuAdvisor } from '../../shared/lcu/advisor'
import { buildChampionIndex } from '../../shared/lcu/resources'
import { createWarehouse } from '../../shared/warehouse/store'
import { createEngineData, type EngineData } from '../../shared/engine/data'
import { createChampionIndex, type ChampionIndex } from '../../shared/champions/meta'
import { mapAramInput, mapRiftContext } from '../../shared/lcu/map-session'
import { recommendRift } from '../../shared/engine/recommend'
import { judgeAram } from '../../shared/engine/aram'
import { createQq101Client } from '../../shared/qq101/client'
import { resolvePopulatedPatch, syncRiftData } from '../../shared/qq101/sync'
import { createConfigStore, type ConfigStore } from './config'
import { bootstrapDataRoot, resolveDataRoot } from './data-root'
import { createCompanionService, type AdviceSource, type CompanionService } from './service'

export interface AppBundle {
  service: CompanionService
  /** 全应用共享的配置实例（窗口管理器与设置页必须共用，避免双实例互相覆盖） */
  config: ConfigStore
  dataRoot: string
  configDir: string
}

export interface AppPaths {
  configDir: string
  dataRoot: string
}

export function createAppWithPaths(
  paths: AppPaths,
  io: { createSource?: () => AdviceSource } = {},
): AppBundle {
  const config = createConfigStore(paths.configDir)
  const warehouse = createWarehouse(paths.dataRoot)

  // datasetRef：引擎数据随「资源索引就绪」与「每次同步成功」重建；compute 闭包经 ref 读取最新值。
  // 关键修复：首启时索引可能先于首次同步完成——同步成功后必须重建（否则 patch=null 时推荐为空直到重启）。
  const datasetRef: { current: EngineData } = {
    current: createEngineData(warehouse, createChampionIndex([])),
  }
  const builtIndexRef: { current: ChampionIndex | null } = { current: null }
  const rebuildDataset = (): void => {
    datasetRef.current = createEngineData(warehouse, builtIndexRef.current ?? createChampionIndex([]))
  }

  let source: AdviceSource
  if (io.createSource) {
    source = io.createSource()
  } else {
    const advisor = createLcuAdvisor({ compute: () => ({ kind: 'none', sessionQueueId: 0 }) as never })
    source = {
      start: () => advisor.start(),
      stop: () => advisor.stop(),
      onAdvice: handler => advisor.onAdvice(handler as never),
      onStatus: handler => advisor.onStatus(handler as never),
      http: () => advisor.http(),
      readers: () => advisor.readers(),
    }
    // 客户端连上后构建英雄资源索引（每 2s 重试；仅成功后停止重试）
    const timer = setInterval(() => {
      const http = advisor.http()
      if (!http) return
      void buildChampionIndex(http)
        .then(index => {
          builtIndexRef.current = index
          rebuildDataset()
          clearInterval(timer)
        })
        .catch(error => console.warn('[app] 英雄资源构建失败（将重试）：', error))
    }, 2000)
  }

  const service = createCompanionService({
    source,
    config,
    computeRift: (session, cfg, caches) => {
      const ctx = mapRiftContext(session, { proficiency: caches.proficiency })
      if (!ctx) throw new Error('非征召会话')
      return recommendRift({ ...ctx, ownedChampionIds: cfg.ownedFilter ? caches.owned : undefined }, datasetRef.current)
    },
    computeAram: session => {
      const input = mapAramInput(session)
      if (!input) throw new Error('非大乱斗会话')
      return judgeAram(input, datasetRef.current)
    },
    syncRunner: async onProgress => {
      const client = createQq101Client({ minIntervalMs: 500 })
      let patch: string | null = null
      try {
        patch = await resolvePopulatedPatch(client)
      } catch {
        return { status: 'failed', patch: null }
      }
      const result = await syncRiftData({
        client,
        warehouse,
        onProgress,
        concurrency: 3,
        patchOverride: patch ?? undefined,
      })
      if (result.patch) rebuildDataset() // 同步成功 → 数据仓就绪/更新：重建引擎数据（修复首启竞态）
      return { status: result.status, patch: result.patch }
    },
    dataRoot: paths.dataRoot,
    manifestReader: () => warehouse.readManifest(),
    championName: id => datasetRef.current.champion(id)?.name ?? null,
  })

  return { service, config, dataRoot: paths.dataRoot, configDir: paths.configDir }
}

export function createApp(): AppBundle {
  const configDir = app.getPath('userData')
  const resolved = resolveDataRoot({
    envDir: process.env.LUX_DATA_DIR,
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    userDataPath: app.getPath('userData'),
  })
  const legacy = join(app.getPath('userData'), 'data')
  const dataRoot = bootstrapDataRoot({
    dataRoot: resolved,
    // 开发版无覆盖时 legacy === dataRoot（同一目录）：置 null，避免自拷贝
    legacyDir: legacy === resolved ? null : legacy,
    seedDir: app.isPackaged ? join(process.resourcesPath, 'data-seed') : null,
  })
  return createAppWithPaths({ configDir, dataRoot })
}
