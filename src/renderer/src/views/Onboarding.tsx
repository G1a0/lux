export interface OnboardingProps {
  onDone(): void
}

export function Onboarding({ onDone }: OnboardingProps): React.JSX.Element {
  return (
    <div className="panel">
      首启引导（待实现）
      <button onClick={onDone}>完成</button>
    </div>
  )
}
