import { useEffect, useState } from 'react'

export function App(): React.JSX.Element {
  const [view, setView] = useState('none')
  const [snap, setSnap] = useState<unknown>(null)

  useEffect(() => {
    window.lux?.onView?.((v, s) => {
      setView(v)
      setSnap(s)
    })
  }, [])

  // 托盘「设置」等主进程指令：切换视图（Task 9 重写 App 后仍沿用此通道）
  useEffect(() => window.lux?.onOpenView?.(v => setView(v)), [])

  if (view === 'none') {
    return <div className="placeholder">Lux 启动中…</div>
  }
  return (
    <div className="placeholder">
      <div>
        <div>[mock] view={view}</div>
        <pre style={{ maxWidth: 360, overflow: 'auto' }}>{JSON.stringify(snap, null, 2)}</pre>
      </div>
    </div>
  )
}
