import { useEffect, useState } from 'react'
import { getBridge, type UiSnapshot } from '../bridge'
import { keystoneName, spellName } from '../names'
import { ChampIcon } from './ChampIcon'

export interface AramPanelProps {
  snapshot: UiSnapshot
}

export function AramPanel({ snapshot }: AramPanelProps): React.JSX.Element {
  const bridge = getBridge()
  const [applyMsg, setApplyMsg] = useState<string | null>(null)

  // 快照变化（换英雄/重算）时清除上一次的应用反馈
  useEffect(() => {
    setApplyMsg(null)
  }, [snapshot])

  if (snapshot.kind !== 'aram') return <div className="panel">…</div>
  const { aram } = snapshot
  const name = (id: number): string => snapshot.names?.[id] ?? `英雄${id}`
  const headline =
    aram.action === 'swap' && aram.swapTo
      ? `换 ${name(aram.swapTo.championId)}（${aram.swapTo.score}）`
      : aram.action === 'reroll'
        ? '掷骰子'
        : '留着'
  // 建议头像：要换则展示换入目标，否则展示当前英雄
  const suggested = aram.action === 'swap' && aram.swapTo ? aram.swapTo.championId : aram.current.championId

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
      <div className="panel-title no-drag"><span>大乱斗 · 当前：{name(aram.current.championId)}（{aram.current.score}）</span></div>
      <div className="primary-row">
        <span className="champ-name">
          <ChampIcon id={suggested} size={40} />
          建议：{headline}
        </span>
      </div>
      <div className="reason">{aram.reason}</div>
      <div className="loadout">
        <div>符文：{aram.runes ? keystoneName(aram.runes.keystoneId) : '暂无'}</div>
        <div>技能：{aram.spells ? aram.spells.spellIds.map(id => spellName(id)).join(' + ') : '暂无'}</div>
      </div>
      {aram.bench.length > 0 && (
        <div className="bench-row">
          {aram.bench.map(b => (
            <span key={b.championId} title={name(b.championId)}>
              <ChampIcon
                id={b.championId}
                size={24}
                active={aram.action === 'swap' && aram.swapTo?.championId === b.championId}
                name={name(b.championId)}
              />
            </span>
          ))}
        </div>
      )}
      <div className="actions no-drag">
        <button onClick={() => void onApplyRunes()} disabled={!aram.runes}>一键应用符文</button>
        <button onClick={() => void onApplySpells()} disabled={!aram.spells}>携带技能</button>
      </div>
      {applyMsg && <div className="dim">{applyMsg}</div>}
    </div>
  )
}
