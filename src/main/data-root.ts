// 数据仓布局：打包版 = <安装目录>/data（用户可见）；开发版 = userData/data；LUX_DATA_DIR 可覆盖。
// 首启引导顺序：已有数据 → 迁移旧 userData/data → 复制安装包内置种子 data-seed → 空仓等同步。
// 安装目录不可写（如 Program Files）时，整套引导回退到 fallbackDir（AppData）。
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
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

/** 对单个目录跑一遍引导序列（已有 → 旧版迁移 → 内置种子）。引导失败不抛错（交由后续同步补齐）。 */
function bootstrapInto(dataRoot: string, legacyDir: string | null, seedDir: string | null): void {
  try {
    if (hasData(dataRoot)) return
    mkdirSync(dataRoot, { recursive: true })
    if (legacyDir && legacyDir !== dataRoot && hasData(legacyDir)) copyDirSync(legacyDir, dataRoot)
    else if (seedDir && seedDir !== dataRoot && hasData(seedDir)) copyDirSync(seedDir, dataRoot)
  } catch (error) {
    console.warn('[data] 数据目录引导失败（将以空仓启动，等待同步）：', error)
  }
}

/** 写探针：实际写入并删除探测文件，能走通才算该目录可写。 */
function isWritable(dir: string): boolean {
  try {
    writeFileSync(join(dir, '.write-probe'), '')
    unlinkSync(join(dir, '.write-probe'))
    return true
  } catch {
    return false
  }
}

/** 返回数据根目录：dataRoot 不可写时改用 fallbackDir；全部失败则返回 dataRoot（空仓降级）。永不抛错。 */
export function bootstrapDataRoot(options: {
  dataRoot: string
  legacyDir: string | null
  seedDir: string | null
  fallbackDir: string
}): string {
  const { dataRoot, legacyDir, seedDir, fallbackDir } = options
  bootstrapInto(dataRoot, legacyDir, seedDir)
  if (isWritable(dataRoot)) return dataRoot
  console.warn(`[data] 安装目录不可写，数据仓回退到：${fallbackDir}`)
  bootstrapInto(fallbackDir, legacyDir, seedDir)
  return isWritable(fallbackDir) ? fallbackDir : dataRoot
}
