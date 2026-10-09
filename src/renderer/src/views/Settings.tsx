export interface SettingsProps {
  onClose(): void
}

export function Settings({ onClose }: SettingsProps): React.JSX.Element {
  return (
    <div className="panel">
      设置（待实现）
      <button onClick={onClose}>关闭</button>
    </div>
  )
}
