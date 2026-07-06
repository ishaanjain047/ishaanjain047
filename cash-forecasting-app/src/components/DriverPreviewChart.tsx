import { useState } from 'react'
import { LabelCaps } from './ui'
import { formatMoney } from '../lib/format'
import type { DriverPreview } from '../lib/driverEngine'

const CHART_HEIGHT = 150
const HALF_HEIGHT = CHART_HEIGHT / 2

export function DriverPreviewChart({ preview }: { preview: DriverPreview }) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (preview.emptyMessage) {
    return (
      <div>
        <LabelCaps className="mb-2">13-Week Preview</LabelCaps>
        <div className="flex h-32 flex-col items-center justify-center gap-1 rounded-input border border-dashed border-border-input bg-page/50">
          <span className="text-lg text-ink-muted">—</span>
          <p className="text-xs text-ink-secondary">{preview.emptyMessage}</p>
        </div>
      </div>
    )
  }

  const maxAbs = Math.max(1, ...preview.weeks.map((w) => Math.abs(w.value ?? 0)))
  const hoveredWeek = hovered !== null ? preview.weeks[hovered] : null

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <LabelCaps>13-Week Preview</LabelCaps>
        {hoveredWeek && (
          <span className="text-xs text-ink-secondary">
            {hoveredWeek.value === undefined ? '—' : formatMoney(hoveredWeek.value)}
          </span>
        )}
      </div>
      <div className="rounded-input border border-border bg-card p-4">
        <div className="flex items-stretch gap-1" style={{ height: CHART_HEIGHT }}>
          {preview.weeks.map((w, i) => {
            const value = w.value ?? 0
            const hasBar = w.value !== undefined && value !== 0
            const barHeight = Math.max(2, (Math.abs(value) / maxAbs) * (HALF_HEIGHT - 6))
            const isPositive = value >= 0
            const color = w.value === undefined ? '#E0DDD6' : isPositive ? '#53B071' : '#D35E59'
            return (
              <div
                key={w.index}
                className="relative flex flex-1 flex-col items-center justify-center"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              >
                <div className="relative w-full" style={{ height: HALF_HEIGHT - 1 }}>
                  {hasBar && isPositive && (
                    <div
                      className="absolute bottom-0 left-1/2 w-2/3 -translate-x-1/2 rounded-t-sm transition-opacity"
                      style={{ height: barHeight, backgroundColor: color, opacity: hovered === null || hovered === i ? 1 : 0.4 }}
                    />
                  )}
                </div>
                <div className="h-px w-full bg-border" />
                <div className="relative w-full" style={{ height: HALF_HEIGHT - 1 }}>
                  {hasBar && !isPositive && (
                    <div
                      className="absolute left-1/2 top-0 w-2/3 -translate-x-1/2 rounded-b-sm transition-opacity"
                      style={{ height: barHeight, backgroundColor: color, opacity: hovered === null || hovered === i ? 1 : 0.4 }}
                    />
                  )}
                </div>
                {hovered === i && (
                  <div className="absolute bottom-full left-1/2 z-10 mb-1.5 w-max max-w-[220px] -translate-x-1/2 rounded-md bg-ink-primary px-2.5 py-1.5 text-center text-[11px] leading-snug text-white shadow-none">
                    {w.note}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-1.5 flex gap-1">
          {preview.weeks.map((w) => (
            <div key={w.index} className="flex-1 text-center text-[10px] text-ink-muted">
              {w.label}
            </div>
          ))}
        </div>
      </div>
      {preview.applicabilityLabel && <p className="mt-2 text-xs text-ink-muted">{preview.applicabilityLabel}</p>}
    </div>
  )
}
