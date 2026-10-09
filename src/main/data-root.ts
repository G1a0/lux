// 数据仓布局：打包版 = <安装目录>/data（用户可见）；开发版 = userData/data；LUX_DATA_DIR 可覆盖。
// 首启引导顺序：已有数据 → 迁移旧 userData/data → 复制安装包内置种子 data-seed → 空仓等同步。
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'

export interface DataRootContext {
  envDir: string | undefined
  isPackaged: boolean
  resourcesPath: string
  userDataPath: string
}

export function resolveDataRoot(ctx: DataRootContext): string {
  if (ctx.envDir) return ctx.envDir
  if (ctx.isPackaged) return join(dirname(ctx.resourcesPath), 'data')
  return join(ctx.userDataPath, 'data')
}

export function copyDirSync(from: string, to: string): void {
  mkdirSync(to, { recursive: true })
  for (const entry of readdirSync(from)) {
    const src = join(from, entry)
    const dst = join(to, entry)
    if (statSync(src).isDirectory()) copyDirSync(src, dst)
    else copyFileSync(src, dst)
  }
}

const hasData = (dir: string): boolean => existsSync(join(dir, 'qq101', 'manifest.json'))

/** 返回数据根目录；按顺序引导（已有 → 旧版迁移 → 内置种子）。引导失败不抛错（交由后续同步补齐）。 */
export function bootstrapDataRoot(options: {
  dataRoot: string
  legacyDir: string | null
  seedDir: string | null
}): string {
  const { dataRoot, legacyDir, seedDir } = options
  try {
    if (hasData(dataRoot)) return dataRoot
    mkdirSync(dataRoot, { recursive: true })
    if (legacyDir && hasData(legacyDir)) copyDirSync(legacyDir, dataRoot)
    else if (seedDir && hasData(seedDir)) copyDirSync(seedDir, dataRoot)
  } catch (error) {
    console.warn('[data] 数据目录引导失败（将以空仓启动，等待同步）：', error)
  }
  return dataRoot
}
