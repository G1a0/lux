import type { UiSnapshot } from '../bridge'

export interface ExpandedPanelProps {
  snapshot: UiSnapshot
}

export function ExpandedPanel({ snapshot }: ExpandedPanelProps): React.JSX.Element {
  return (
    <div className="panel">
      展开详情（待实现）
      <div>{snapshot.kind}</div>
    </div>
  )
}
