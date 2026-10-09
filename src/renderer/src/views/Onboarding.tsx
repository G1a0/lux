export interface OnboardingProps {
  onDone(): void
}

export function Onboarding({ onDone }: OnboardingProps): React.JSX.Element {
  return (
    <div className="panel drag-region onboarding">
      <div className="panel-title"><span>欢迎使用 Lux</span></div>
      <div className="onboarding-body">
        <p>Lux 在你进入选人阶段时，根据双方阵容给出「选什么英雄、带什么天赋与召唤师技能」的建议，并可一键应用到客户端。</p>
        <p>数据来自腾讯 101 数据站；数据同步仅在允许时段进行（工作日 9-12、14-18 点不联网，其余时段与周末自动同步）。</p>
        <p>本工具为第三方新手辅助：只读取选人信息并写入符文/技能，不做任何代打行为；使用风险自负，与腾讯/Riot 无关。</p>
      </div>
      <button className="no-drag" onClick={onDone}>开始使用</button>
    </div>
  )
}
