// src/components/RecommendationPanel.tsx

import { createPortal } from 'react-dom'
import type { ChampionScore, DataSource } from '@/lib/scorer'
import { getChampionName, getDamageType, getChampionPositions } from '@/lib/champion-data'
import { POSITION_LABELS, type InternalPosition } from '@/lib/positions'

interface PanelProps {
  scores: ChampionScore[]
  assignedPosition: InternalPosition | ''
  dataSource: DataSource
  dataDate: string
  visible: boolean
  onClose: () => void
}

export function RecommendationPanel({ scores, assignedPosition, dataSource, dataDate, visible, onClose }: PanelProps) {
  if (!visible) return null

  const grouped = groupByPosition(scores, assignedPosition)

  return createPortal(
    <div id="lux-recommendation-panel" style={{
      position: 'fixed', right: 0, top: '10%',
      width: '320px', maxHeight: '80%',
      background: 'rgba(20,20,30,0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px 0 0 8px',
      color: '#cdd6f4',
      zIndex: 9999,
      overflow: 'auto',
      padding: '16px',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#f0c040' }}>
          Lux 推荐
          {dataSource === 'local'
            ? <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>(本地数据)</span>
            : dataDate ? <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>数据 {dataDate}</span> : null}
        </h3>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#888',
          cursor: 'pointer', fontSize: '18px',
        }}>x</button>
      </div>

      <Section title="推荐位">
        {grouped.recommended.slice(0, 3).map(s => (
          <ChampionRow key={s.championId} score={s} />
        ))}
      </Section>

      <Section title="各位置速览">
        {Object.entries(grouped.byPosition).map(([pos, champs]) => {
          const top = champs[0]
          if (!top) return null
          return (
            <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: '#888', minWidth: '32px', fontSize: '12px' }}>
                {POSITION_LABELS[pos] ?? pos}
              </span>
              <ChampionRow score={top} compact />
            </div>
          )
        })}
      </Section>

      <Section title="阵容分析">
        <CompositionAnalysis scores={scores} />
      </Section>
    </div>,
    document.body,
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#a6adc8' }}>{title}</h4>
      {children}
    </div>
  )
}

function ChampionRow({ score, compact = false }: { score: ChampionScore; compact?: boolean }) {
  const name = getChampionName(score.championId)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: compact ? '2px 0' : '6px 8px',
      background: compact ? 'none' : 'rgba(255,255,255,0.05)',
      borderRadius: '4px',
      marginBottom: compact ? 0 : '4px',
    }}>
      <span style={{
        width: compact ? '20px' : '28px', height: compact ? '20px' : '28px',
        background: '#e84057', borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: compact ? '10px' : '12px', fontWeight: 'bold',
        color: '#fff', flexShrink: 0,
      }}>
        {score.score}
      </span>
      <span style={{ flex: 1, fontWeight: compact ? 'normal' : '600' }}>{name}</span>
      {!compact && (
        <span style={{ fontSize: '11px', color: '#888' }}>
          {'协'}{score.synergy} | {'克'}{score.counter} | {'强'}{score.meta}
        </span>
      )}
    </div>
  )
}

function CompositionAnalysis({ scores }: { scores: ChampionScore[] }) {
  const top5 = scores.slice(0, 5)
  const apChamps = top5.filter(s => getDamageType(s.championId) === 'ap').length
  const adCount = top5.filter(s => {
    const type = getDamageType(s.championId)
    return type === 'ad' || type === 'mixed'
  }).length

  return (
    <div style={{ fontSize: '11px', color: '#888', lineHeight: 1.6 }}>
      <div>Top 5 推荐中: AP {apChamps} | AD {adCount}</div>
      {apChamps === 0 ? <div style={{ color: '#f38ba8' }}> 无 AP 选择，阵容可能缺法伤</div> : null}
      {adCount === 0 ? <div style={{ color: '#f38ba8' }}> 无 AD 选择，阵容可能缺物伤</div> : null}
    </div>
  )
}

function groupByPosition(scores: ChampionScore[], assigned: InternalPosition | '') {
  const byPosition: Record<string, ChampionScore[]> = {}
  for (const s of scores) {
    for (const pos of getChampionPositions(s.championId)) {
      if (!byPosition[pos]) byPosition[pos] = []
      byPosition[pos].push(s)
    }
  }

  const recommended = assigned && byPosition[assigned] ? byPosition[assigned] : scores
  return { recommended, byPosition }
}
