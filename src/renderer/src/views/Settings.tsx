import { useEffect, useState } from 'react'
import { getBridge } from '../bridge'

export interface SettingsProps {
  onClose(): void
}

interface Cfg {
  ownedFilter: boolean
  modes: { rift: boolean; aram: boolean }
  onboarded: boolean
}

// mock 窗口（LUX_UI_MOCK）无 IPC handler，getConfig 会 reject；降级为默认配置而非卡在加载中
const FALLBACK_CFG: Cfg = { ownedFilter: false, modes: { rift: true, aram: true }, onboarded: true }

export function Settings({ onClose }: SettingsProps): React.JSX.Element {
  const bridge = getBridge()
  const [cfg, setCfg] = useState<Cfg | null>(null)
  const [manifest, setManifest] = useState<Record<string, unknown> | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  useEffect(() => {
    void bridge.getConfig().then(c => setCfg(c as unknown as Cfg)).catch(() => setCfg(FALLBACK_CFG))
    void bridge.getManifest().then(m => setManifest(m)).catch(() => {})
    return bridge.onSyncProgress((d, t) => setProgress(t > 0 ? `同步中 ${d}/${t}` : null))
  }, [])

  async function patch(p: Partial<Cfg>): Promise<void> {
    const next = await bridge.setConfig(p as Record<string, unknown>)
    setCfg(next as unknown as Cfg)
  }

  async function onSync(): Promise<void> {
    setSyncMsg('同步中…')
    const result = (await bridge.syncNow()) as { status: string; blockedUntil?: string }
    if (result.status === 'blocked-timegate') {
      const until = result.blockedUntil ? new Date(result.blockedUntil).toLocaleString() : ''
      setSyncMsg(`处于时段限制内（工作日 9-12 / 14-18 禁止联网），下个可同步时间：${until}`)
    } else {
      setSyncMsg(`同步结束：${result.status}`)
      setManifest(await bridge.getManifest())
    }
  }

  if (!cfg) return <div className="panel">加载中…</div>
  const manifestText = manifest
    ? `版本 ${manifest.patch} · 数据日期 ${manifest.dataDate}${manifest.aramDate ? ` · 大乱斗 ${manifest.aramDate}` : ''}`
    : '尚未同步（点击下方按钮）'

  return (
    <div className="panel drag-region settings">
      <div className="panel-title no-drag">
        <span>设置</span>
        <span className="panel-actions"><button onClick={onClose}>✕</button></span>
      </div>
      <label className="cfg-row no-drag">
        <input type="checkbox" checked={cfg.ownedFilter} onChange={e => void patch({ ownedFilter: e.target.checked })} />
        候选池仅显示已拥有/周免
      </label>
      <label className="cfg-row no-drag">
        <input type="checkbox" checked={cfg.modes.rift} onChange={e => void patch({ modes: { ...cfg.modes, rift: e.target.checked } })} />
        启用排位/匹配推荐
      </label>
      <label className="cfg-row no-drag">
        <input type="checkbox" checked={cfg.modes.aram} onChange={e => void patch({ modes: { ...cfg.modes, aram: e.target.checked } })} />
        启用大乱斗换/留判定
      </label>
      <div className="cfg-section">
        <div className="dim">数据：{manifestText}</div>
        {progress && <div className="dim">{progress}</div>}
        <button className="no-drag" onClick={() => void onSync()}>立即同步</button>
        {syncMsg && <div className="dim">{syncMsg}</div>}
      </div>
      <div className="cfg-section about dim">
        <div>关于：Lux 为第三方新手辅助工具，数据来自腾讯 101 数据站（非官方产品）。</div>
        <div>声明：本工具只读取游戏客户端选人信息并写入符文/技能，不做任何代打行为；使用风险自负。</div>
      </div>
    </div>
  )
}
