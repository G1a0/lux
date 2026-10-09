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
