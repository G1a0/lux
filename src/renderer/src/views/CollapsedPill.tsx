export interface CollapsedPillProps {
  onClick(): void
}

export function CollapsedPill({ onClick }: CollapsedPillProps): React.JSX.Element {
  return (
    <button className="pill drag-region no-drag" onClick={onClick} onMouseEnter={onClick}>
      Lux ▸
    </button>
  )
}
