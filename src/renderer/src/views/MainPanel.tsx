import type { UiSnapshot } from '../bridge'

export interface MainPanelProps {
  snapshot: UiSnapshot | null
  onExpand(): void
  onCollapse(): void
  onSettings(): void
}

export function MainPanel(props: MainPanelProps): React.JSX.Element {
  return (
    <div className="panel">
      主面板（待实现）
      <button onClick={props.onExpand}>详情</button>
    </div>
  )
}
