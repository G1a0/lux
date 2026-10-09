import { useEffect, useState } from 'react'
import { getBridge } from '../bridge'

export interface SettingsProps {
  onClose(): void
}

interface Cfg {
  ownedFilter: boolean
  modes: { rift: boolean; aram: boolean }
  onboarded: boolean
  lcuDir?: string
}

// mock 窗口（LUX_UI_MOCK）无 IPC handler，getConfig 会 reject；降级为默认配置而非卡在加载中
const FALLBACK_CFG: Cfg = { ownedFilter: false, modes: { rift: true, aram: true }, onboarded: true }

export function Settings({ onClose }: SettingsProps): React.JSX.Element {
  const bridge = getBridge()
  const [cfg, setCfg] = useState<Cfg | null>(null)
  const [manifest, setManifest] = useState<Record<string, unknown> | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [lcuDir, setLcuDir] = useState('')

  useEffect(() => {
    void bridge.getConfig().then(c => {
      setCfg(c as unknown as Cfg)
      setLcuDir(String((c as { lcuDir?: string }).lcuDir ?? ''))
    }).catch(() => setCfg(FALLBACK_CFG))
    void bridge.getManifest().then(m => setManifest(m)).catch(() => {})
    return bridge.onSyncProgress((d, t) => setProgress(t > 0 ? `同步中 ${d}/${t}` : null))
  }, [])

  async function patch(p: Partial<Cfg>): Promise<void> {
    const next = await bridge.setConfig(p as Record<string, unknown>)
    setCfg(next as unknown as Cfg)
  }

  async function onSync(): Promise<void> {
    setSyncMsg('同步中…')
    const result = (await bridge.syncNow()) as { status: string }
    setSyncMsg(`同步结束：${result.status}`)
    setManifest(await bridge.getManifest())
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
        <div className="dim">游戏客户端目录（自动发现失败时手动指定；修改后重启 Lux 生效）</div>
        <div className="cfg-row no-drag">
          <input
            type="text"
            value={lcuDir}
            placeholder="自动发现"
            onChange={e => setLcuDir(e.target.value)}
            onBlur={() => void patch({ lcuDir: lcuDir.trim() || undefined })}
            style={{ flex: 1, background: '#0a1428', color: 'var(--text)', border: '1px solid var(--border-gold)', borderRadius: 4, padding: '4px 6px', fontSize: 12 }}
          />
          <button
            className="no-drag"
            onClick={async () => {
              const picked = await bridge.pickLcuDir()
              if (picked) {
                setLcuDir(picked)
                void patch({ lcuDir: picked })
              }
            }}
          >
            浏览…
          </button>
        </div>
        <div className="dim">路径示例：D:\WeGameApps\英雄联盟\LeagueClient（可在 WeGame → 英雄联盟 → 右键 → 打开所在文件夹 找到）</div>
      </div>
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
