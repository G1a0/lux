import { useEffect, useState } from 'react'
import { getBridge } from '../bridge'

export interface ChampIconProps {
  id: number
  size?: number
  /** 高亮（替补席上被建议换入的目标） */
  active?: boolean
  /** 图标不可用时的文字兜底（英雄名小标签） */
  name?: string
}

/** 英雄头像：经桥向主进程要 LCU 本地图标（data URL）；拿不到时若有 name 渲染文字标签，否则渲染空 */
export function ChampIcon({ id, size = 28, active = false, name }: ChampIconProps): React.JSX.Element | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setUrl(null) // 换英雄时不闪现旧头像
    void getBridge()
      .getChampionIcon(id)
      .then(u => {
        if (alive) setUrl(u)
      })
      .catch(() => {
        // IPC 失败（如 mock 模式无 handler）：静默降级为无头像
      })
    return () => {
      alive = false
    }
  }, [id])

  if (!url) {
    if (name) {
      return (
        <span className="champ-chip" title={name}>
          {name}
        </span>
      )
    }
    return null
  }
  return (
    <img
      className={active ? 'champ-icon champ-icon-active' : 'champ-icon'}
      src={url}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  )
}
