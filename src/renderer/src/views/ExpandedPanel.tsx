import type { UiSnapshot } from '../bridge'

export interface ExpandedPanelProps {
  snapshot: UiSnapshot
}

export function ExpandedPanel({ snapshot }: ExpandedPanelProps): React.JSX.Element {
  if (snapshot.kind !== 'rift') return <div className="panel">…</div>
  return (
    <div className="panel drag-region">
      <div className="panel-title no-drag"><span>候选详情</span></div>
      <ul className="alt-list">
        {snapshot.advice.alternates.map(alt => (
          <li key={alt.championId}>
            <div className="alt-head">
              <span className="champ-name">{snapshot.names?.[alt.championId] ?? `英雄${alt.championId}`}</span>
              <span className="score">{alt.score}</span>
            </div>
            <div className="reason">{alt.reason}{alt.partialData ? '（部分数据缺失）' : ''}</div>
          </li>
        ))}
      </ul>
      <div className="dim">主推：{snapshot.names?.[snapshot.advice.primary.championId] ?? ''}（{snapshot.advice.primary.score}）· {snapshot.advice.primary.reason}</div>
    </div>
  )
}
