// LCU 仅有的两类写入（设计 §6）：符文页应用、召唤师技能携带。
// keystone → 主系推导：8000s 精确；8100s 主宰；8200s 巫术；8300s 启迪；8400s 坚决；
// 特例：9923（丛刃）属主宰 8100。
import { LcuHttpError, type LcuHttp } from './http'

const SUB_STYLE_IDS: Record<string, number> = {
  jm: 8000, // 精密
  zj: 8100,
  zz: 8100, // 主宰（两码都见过）
  ws: 8200, // 巫术
  jj: 8400, // 坚决
  qd: 8300, // 启迪
}

export function subStyleCodeToStyleId(code: string): number | null {
  return SUB_STYLE_IDS[code.toLowerCase()] ?? null
}

export function keystoneToPrimaryStyleId(keystoneId: number): number | null {
  if (keystoneId === 9923) return 8100
  if (keystoneId === 8992) return 8200 // 冥火之触（巫术系，编号不在 8xxx 带内）
  const band = Math.floor(keystoneId / 100) * 100
  return [8000, 8100, 8200, 8300, 8400].includes(band) ? band : null
}

export interface RunePageInput {
  /** 页面名（不含前缀；应用时自动加 `Lux·`） */
  name: string
  keystoneId: number
  subStyleCode: string
  runeIds: number[]
}

export interface WriteResult {
  ok: boolean
  reason?: string
}

interface PerkPage {
  id: number
  current?: boolean
  isDeletable?: boolean
  name?: string
}

/** 本应用创建的符文页前缀：清理时只删自己的旧页，绝不触碰用户自建页 */
export const PAGE_NAME_PREFIX = 'Lux·'

export async function applyRunePage(http: LcuHttp, page: RunePageInput): Promise<WriteResult> {
  const primaryStyleId = keystoneToPrimaryStyleId(page.keystoneId)
  if (primaryStyleId === null) return { ok: false, reason: '无法识别基石符文的主系' }
  const subStyleId = subStyleCodeToStyleId(page.subStyleCode)
  if (subStyleId === null) return { ok: false, reason: `无法识别副系（${page.subStyleCode}）` }
  if (page.runeIds.length < 6) return { ok: false, reason: '符文列表不完整' }

  const body = {
    name: `${PAGE_NAME_PREFIX}${page.name}`.slice(0, 40),
    primaryStyleId,
    subStyleId,
    selectedPerkIds: page.runeIds,
    current: true,
  }

  // 优先就地更新自有页。旧策略「先删自有页再新建」会在自有页恰为当前页时失败：
  // 客户端不允许删除 current 页，删除报错被吞后在页数已满时整体失败（真机反馈）。
  // 就地 PUT（body 带 current:true）不依赖删除权限，且不占用新页位。
  try {
    const pages = (await http.get<PerkPage[]>('/lol-perks/v1/pages')) ?? []
    const own = pages.filter(p => (p.name ?? '').startsWith(PAGE_NAME_PREFIX))
    if (own.length > 0) {
      await http.put<{ id: number }>(`/lol-perks/v1/pages/${own[0].id}`, body)
      // 其余自有页尽力而为清理（单个失败忽略：例如仍为 current 页不可删），不阻塞本次应用
      for (const stale of own.slice(1)) {
        try {
          await http.del(`/lol-perks/v1/pages/${stale.id}`)
        } catch {
          // 忽略：留着不影响本次应用
        }
      }
      return { ok: true }
    }
  } catch {
    // 列页失败或更新失败：落入下方创建分支
  }

  try {
    await http.post<{ id: number }>('/lol-perks/v1/pages', body)
    return { ok: true }
  } catch (error) {
    const status = error instanceof LcuHttpError ? error.status : 0
    return { ok: false, reason: `符文页写入失败（HTTP ${status}）——若持续失败，请检查客户端符文页是否已满或手动设置` }
  }
}

export async function carrySpells(http: LcuHttp, spellIds: [number, number]): Promise<boolean> {
  try {
    await http.patch('/lol-champ-select/v1/session/my-selection', { spell1Id: spellIds[0], spell2Id: spellIds[1] })
    return true
  } catch {
    return false
  }
}
