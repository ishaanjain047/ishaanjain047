import type { ReactNode } from 'react'
import { LabelCaps, PencilIcon, TrashIcon } from './ui'
import type { DisplayColumn } from '../lib/periodAggregate'
import type { RowDef } from '../lib/types'
import { visibleRows } from '../lib/rowEngine'

const PARTICULARS_WIDTH = 280

function gridTemplate(columnCount: number) {
  return `${PARTICULARS_WIDTH}px repeat(${columnCount}, 1fr)`
}

export function RowTableHeader({ columns, label = 'Particulars' }: { columns: DisplayColumn[]; label?: string }) {
  return (
    <div className="grid border-b border-border bg-table-header" style={{ gridTemplateColumns: gridTemplate(columns.length) }}>
      <div className="sticky left-0 bg-table-header px-6 py-3">
        <LabelCaps>{label}</LabelCaps>
      </div>
      {columns.map((c) => (
        <div key={c.key} className="px-4 py-3 text-right">
          <LabelCaps>{c.label}</LabelCaps>
        </div>
      ))}
    </div>
  )
}

export function SectionBanner({ label, bg, text, columns }: { label: string; bg: string; text: string; columns: DisplayColumn[] }) {
  return (
    <div
      className="grid items-center border-b border-border px-0 py-2.5 text-sm font-semibold"
      style={{ gridTemplateColumns: gridTemplate(columns.length), backgroundColor: bg, color: text }}
    >
      <div className="px-6" style={{ backgroundColor: bg }}>
        {label}
      </div>
      {columns.map((c) => (
        <div key={c.key} />
      ))}
    </div>
  )
}

export function RowLine({
  label,
  columns,
  bold,
  tint,
  renderCell,
}: {
  label: string
  columns: DisplayColumn[]
  bold?: boolean
  tint?: boolean
  renderCell: (column: DisplayColumn) => ReactNode
}) {
  return (
    <div
      className={`grid items-center border-b border-border ${bold ? 'font-semibold' : ''} ${tint ? 'bg-page' : 'bg-card'}`}
      style={{ gridTemplateColumns: gridTemplate(columns.length) }}
    >
      <div className={`sticky left-0 border-r border-border px-6 py-3 text-sm text-ink-primary ${tint ? 'bg-page' : 'bg-card'}`}>
        {label}
      </div>
      {columns.map((c) => (
        <div key={c.key}>{renderCell(c)}</div>
      ))}
    </div>
  )
}

export function RowTableBody({
  rowLayout,
  columns,
  collapsedGroupIds,
  onToggleGroup,
  renderCell,
  onEditLeaf,
  onDeleteLeaf,
}: {
  rowLayout: RowDef[]
  columns: DisplayColumn[]
  collapsedGroupIds: Set<string>
  onToggleGroup: (id: string) => void
  renderCell: (row: RowDef, column: DisplayColumn) => ReactNode
  onEditLeaf?: (row: RowDef) => void
  onDeleteLeaf?: (row: RowDef) => void
}) {
  const rows = visibleRows(rowLayout, collapsedGroupIds)

  return (
    <>
      {rows.map((row) => {
        const isNested = !!row.parentId
        const gridStyle = { gridTemplateColumns: gridTemplate(columns.length) }

        if (row.kind === 'group') {
          const collapsed = collapsedGroupIds.has(row.id)
          return (
            <div key={row.id} className="group grid items-center border-b border-border bg-card font-semibold" style={gridStyle}>
              <div className="sticky left-0 flex items-center gap-1.5 border-r border-border bg-card px-6 py-3 text-sm text-ink-primary">
                <button
                  onClick={() => onToggleGroup(row.id)}
                  className="flex h-4 w-4 items-center justify-center text-ink-secondary transition hover:text-ink-primary"
                  aria-label={collapsed ? `Expand ${row.name}` : `Collapse ${row.name}`}
                >
                  <svg viewBox="0 0 20 20" fill="none" className={`h-3.5 w-3.5 transition-transform ${collapsed ? '-rotate-90' : ''}`}>
                    <path d="M5 7.5l5 5.5 5-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span className="truncate">{row.name}</span>
              </div>
              {columns.map((c) => (
                <div key={c.key}>{renderCell(row, c)}</div>
              ))}
            </div>
          )
        }

        if (row.kind === 'subtotal') {
          return (
            <div
              key={row.id}
              className="grid items-center border-b border-t border-border-input bg-card text-sm font-semibold text-ink-secondary"
              style={gridStyle}
            >
              <div className="sticky left-0 border-r border-border bg-card px-6 py-2.5 pl-10 text-ink-secondary">{row.name}</div>
              {columns.map((c) => (
                <div key={c.key}>{renderCell(row, c)}</div>
              ))}
            </div>
          )
        }

        if (row.kind === 'total') {
          return (
            <div key={row.id} className="grid items-center border-b border-border bg-page font-semibold" style={gridStyle}>
              <div className="sticky left-0 border-r border-border bg-page px-6 py-3 text-sm text-ink-primary">{row.name}</div>
              {columns.map((c) => (
                <div key={c.key}>{renderCell(row, c)}</div>
              ))}
            </div>
          )
        }

        // leaf
        return (
          <div key={row.id} className="group grid items-center border-b border-border bg-card" style={gridStyle}>
            <div
              className={`sticky left-0 flex items-center gap-1.5 border-r border-border bg-card px-6 py-3 text-sm text-ink-primary ${
                isNested ? 'pl-10' : ''
              }`}
            >
              <span className="truncate">{row.name}</span>
              {(onEditLeaf || onDeleteLeaf) && (
                <span className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  {onEditLeaf && (
                    <button
                      onClick={() => onEditLeaf(row)}
                      className="rounded p-1 text-ink-muted hover:bg-page hover:text-ink-primary"
                      aria-label={`Edit ${row.name}`}
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onDeleteLeaf && (
                    <button
                      onClick={() => onDeleteLeaf(row)}
                      className="rounded p-1 text-red-text opacity-70 hover:bg-red-bg hover:opacity-100"
                      aria-label={`Delete ${row.name}`}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              )}
            </div>
            {columns.map((c) => (
              <div key={c.key}>{renderCell(row, c)}</div>
            ))}
          </div>
        )
      })}
    </>
  )
}

export { gridTemplate }
