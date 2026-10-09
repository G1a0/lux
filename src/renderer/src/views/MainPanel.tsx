import { useEffect, useState } from 'react'
import { getBridge, type LcuInfo, type UiSnapshot } from '../bridge'

const SPELL_NAMES: Record<number, string> = {
  1: '净化', 3: '虚弱', 4: '闪现', 6: '疾跑', 7: '治疗', 11: '惩戒', 12: '传送', 14: '点燃', 21: '护盾', 32: '标记',
}
/** queueId → 模式中文名；未知队列回退 '对局' */
const MODE_LABELS: Record<number, string> = {
  400: '征召', 420: '排位', 430: '匹配', 440: '排位', 450: '大乱斗',
}
const KEYSTONES: Record<number, string> = {
  8005: '强攻', 8008: '致命节奏', 8010: '征服者', 8021: '迅捷步法',
  8112: '电刑', 8124: '掠食者', 8128: '黑暗收割', 9923: '丛刃',
  8214: '召唤艾黎', 8229: '奥术彗星', 8230: '相位猛冲',
  8437: '余震', 8439: '守护者', 8465: '不灭之握',
  8351: '冰川增幅', 8360: '启封的秘籍', 8369: '先攻', 8992: '冥火之触',
}

export interface MainPanelProps {
  snapshot: UiSnapshot | null
  onExpand(): void
  onCollapse(): void
  onSettings(): void
}

function nameOf(id: number, snap: UiSnapshot | null): string {
  const names = snap && 'names' in snap ? snap.names : undefined
  return names?.[id] ?? `英雄${id}`
}

export function MainPanel({ snapshot, onExpand, onCollapse, onSettings }: MainPanelProps): React.JSX.Element {
  const bridge = getBridge()
  const [applyMsg, setApplyMsg] = useState<string | null>(null)
  // LCU 连接诊断（主进程 2s 推送）：等待/未发现客户端时展示命中路径与最近错误，供跨机器排障
  const [lcuInfo, setLcuInfo] = useState<LcuInfo | null>(null)

  // 快照变化（换英雄/重算）时清除上一次的应用反馈
  useEffect(() => {
    setApplyMsg(null)
  }, [snapshot])

  useEffect(() => bridge.onLcuInfo(setLcuInfo), [])

  if (!snapshot || snapshot.kind === 'none') {
    return (
      <div className="panel drag-region">
        <div className="panel-title no-drag">
          <span>Lux</span>
          <span className="panel-actions">
            <button onClick={onSettings} title="设置">⚙</button>
            <button onClick={onCollapse} title="收起">━</button>
          </span>
        </div>
        <div className="dim">等待进入选人…</div>
        {lcuInfo && (
          <>
            <div className="dim">
              {lcuInfo.status === 'waiting'
                ? '未发现游戏客户端。请先启动英雄联盟；若已启动，请将下方信息反馈：'
                : '已连接客户端，等待进入选人…'}
            </div>
            {lcuInfo.status === 'waiting' && (
              <div className="dim">若长时间未发现，可在设置中手动指定客户端目录。</div>
            )}
            <div className="dim">客户端目录：{lcuInfo.lockDir ?? '已尝试的常见路径均未命中'}</div>
            <div className="dim">端口：{lcuInfo.port ?? '未知'}</div>
            {lcuInfo.lastError && <div className="dim">{lcuInfo.lastError.slice(0, 120)}</div>}
          </>
        )}
      </div>
    )
  }
  if (snapshot.kind === 'unsupported') {
    return (
      <div className="panel drag-region">
        <div className="panel-title no-drag">
          <span>Lux</span>
          <span className="panel-actions"><button onClick={onSettings}>⚙</button><button onClick={onCollapse}>━</button></span>
        </div>
        <div className="dim">当前模式暂不支持（queueId={snapshot.queueId}）</div>
      </div>
    )
  }
  if (snapshot.kind !== 'rift') return <div className="panel">…</div>

  const { advice } = snapshot
  const primary = advice.primary
  const runes = advice.runes
  const spells = advice.spells

  async function onApplyRunes(): Promise<void> {
    const r = await bridge.applyRunes()
    setApplyMsg(r.ok ? '符文已应用' : `符文应用失败：${r.reason ?? '未知原因'}`)
  }
  async function onApplySpells(): Promise<void> {
    const ok = await bridge.applySpells()
    setApplyMsg(ok ? '技能已携带' : '技能携带失败（可在客户端手动设置）')
  }

  return (
    <div className="panel drag-region">
      <div className="panel-title no-drag">
        <span>Lux · {MODE_LABELS[snapshot.queueId] ?? '对局'}</span>
        <span className="panel-actions">
          <button onClick={onExpand} title="详情">▾</button>
          <button onClick={onSettings} title="设置">⚙</button>
          <button onClick={onCollapse} title="收起">━</button>
        </span>
      </div>
      <div className="primary-row">
        <span className="champ-name">{nameOf(primary.championId, snapshot)}</span>
        <span className="score">{primary.score}</span>
      </div>
      <div className="reason">{primary.reason}{primary.partialData ? '（部分数据缺失）' : ''}</div>
      <div className="loadout">
        <div>符文：{runes ? `${KEYSTONES[runes.keystoneId] ?? `基石${runes.keystoneId}`}` : '暂无'}</div>
        <div>技能：{spells ? spells.spellIds.map(id => SPELL_NAMES[id] ?? id).join(' + ') : '暂无'}</div>
      </div>
      <div className="actions no-drag">
        <button onClick={() => void onApplyRunes()} disabled={!runes}>一键应用符文</button>
        <button onClick={() => void onApplySpells()} disabled={!spells}>携带技能</button>
      </div>
      {applyMsg && <div className="dim">{applyMsg}</div>}
    </div>
  )
}
