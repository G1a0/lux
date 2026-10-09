import type { UiSnapshot } from '../bridge'

const SPELL_NAMES: Record<number, string> = { 1: '净化', 3: '虚弱', 4: '闪现', 6: '疾跑', 7: '治疗', 11: '惩戒', 12: '传送', 14: '点燃', 21: '护盾', 32: '标记' }

export interface AramPanelProps {
  snapshot: UiSnapshot
}

export function AramPanel({ snapshot }: AramPanelProps): React.JSX.Element {
  if (snapshot.kind !== 'aram') return <div className="panel">…</div>
  const { aram } = snapshot
  const name = (id: number): string => snapshot.names?.[id] ?? `英雄${id}`
  const headline =
    aram.action === 'swap' && aram.swapTo
      ? `换 ${name(aram.swapTo.championId)}（${aram.swapTo.score}）`
      : aram.action === 'reroll'
        ? '掷骰子'
        : '留着'
  return (
    <div className="panel drag-region">
      <div className="panel-title no-drag"><span>大乱斗 · 当前：{name(aram.current.championId)}（{aram.current.score}）</span></div>
      <div className="primary-row"><span className="champ-name">建议：{headline}</span></div>
      <div className="reason">{aram.reason}</div>
      <div className="loadout">
        <div>符文：{aram.runes ? `基石${aram.runes.keystoneId}` : '暂无'}</div>
        <div>技能：{aram.spells ? aram.spells.spellIds.map(id => SPELL_NAMES[id] ?? id).join(' + ') : '暂无'}</div>
      </div>
    </div>
  )
}
