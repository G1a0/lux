import { useEffect, useState } from 'react'
import { getBridge, type UiSnapshot } from './bridge'
import { MainPanel } from './views/MainPanel'
import { ExpandedPanel } from './views/ExpandedPanel'
import { AramPanel } from './views/AramPanel'
import { CollapsedPill } from './views/CollapsedPill'
import { Settings } from './views/Settings'
import { Onboarding } from './views/Onboarding'

type View = 'none' | 'main' | 'expanded' | 'aram' | 'pill' | 'settings' | 'onboarding'

export function App(): React.JSX.Element {
  const bridge = getBridge()
  const [view, setView] = useState<View>('none')
  const [snapshot, setSnapshot] = useState<UiSnapshot | null>(null)
  const [onboarded, setOnboarded] = useState(true)

  useEffect(() => {
    void bridge
      .getConfig()
      .then(cfg => {
        const onboardedFlag = cfg.onboarded !== false
        setOnboarded(onboardedFlag)
        if (!onboardedFlag) {
          setView('onboarding')
          bridge.setWindowState('onboarding')
        }
      })
      .catch(() => {}) // mock 窗口无 IPC handler 时会 reject；降级为默认已引导即可
    const offSnap = bridge.onSnapshot(s => {
      setSnapshot(s)
      setView(prev => {
        if (prev === 'settings' || prev === 'onboarding') return prev
        if (s.kind === 'rift') return 'main'
        if (s.kind === 'aram') return 'aram'
        if (s.kind === 'unsupported') return 'main'
        return 'none'
      })
    })
    const offView = bridge.onView((v, s) => {
      setView(v as View)
      if (s) setSnapshot(s as UiSnapshot)
    })
    const offOpen = bridge.onOpenView(v => {
      setView(v as View)
      bridge.setWindowState(v)
    })
    return () => {
      offSnap()
      offView()
      offOpen()
    }
  }, [])

  if (view === 'none') {
    return <div className="placeholder">等待进入选人…</div>
  }
  if (view === 'onboarding') {
    return (
      <Onboarding
        onDone={() => {
          void bridge.setConfig({ onboarded: true })
          setOnboarded(true)
          setView('main')
          bridge.setWindowState('main')
        }}
      />
    )
  }
  if (view === 'settings') {
    return (
      <Settings
        onClose={() => {
          setView('main')
          bridge.setWindowState('main')
        }}
      />
    )
  }
  if (view === 'aram' && snapshot) return <AramPanel snapshot={snapshot} />
  if (view === 'pill') {
    return (
      <CollapsedPill
        onClick={() => {
          setView('main')
          bridge.setWindowState('main')
        }}
      />
    )
  }
  if (view === 'expanded' && snapshot) return <ExpandedPanel snapshot={snapshot} />
  return (
    <MainPanel
      snapshot={snapshot}
      onExpand={() => {
        setView('expanded')
        bridge.setWindowState('expanded')
      }}
      onCollapse={() => {
        setView('pill')
        bridge.setWindowState('pill')
      }}
      onSettings={() => {
        setView('settings')
        bridge.setWindowState('settings')
      }}
    />
  )
}
