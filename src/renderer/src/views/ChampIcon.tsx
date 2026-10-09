import { useEffect, useState } from 'react'
import { getBridge } from '../bridge'

export interface ChampIconProps {
  id: number
  size?: number
  /** 高亮（替补席上被建议换入的目标） */
  active?: boolean
}

/** 英雄头像：经桥向主进程要 LCU 本地图标（data URL）；拿不到则渲染空（纯文本降级） */
export function ChampIcon({ id, size = 28, active = false }: ChampIconProps): React.JSX.Element | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setUrl(null) // 换英雄时不闪现旧头像
    void getBridge()
      .getChampionIcon(id)
      .then(u => {
        if (alive) setUrl(u)
      })
    return () => {
      alive = false
    }
  }, [id])

  if (!url) return null
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
