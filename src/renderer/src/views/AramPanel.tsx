import type { UiSnapshot } from '../bridge'

export interface AramPanelProps {
  snapshot: UiSnapshot
}

export function AramPanel({ snapshot }: AramPanelProps): React.JSX.Element {
  return (
    <div className="panel">
      大乱斗面板（待实现）
      <div>{snapshot.kind}</div>
    </div>
  )
}
