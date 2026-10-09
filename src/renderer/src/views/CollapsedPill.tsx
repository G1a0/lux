export interface CollapsedPillProps {
  onClick(): void
}

export function CollapsedPill({ onClick }: CollapsedPillProps): React.JSX.Element {
  return (
    <div className="panel">
      收起药丸（待实现）
      <button onClick={onClick}>展开</button>
    </div>
  )
}
