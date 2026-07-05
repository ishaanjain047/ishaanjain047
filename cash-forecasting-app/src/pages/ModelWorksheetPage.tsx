import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LineItemDrawer } from '../components/LineItemDrawer'
import { Timeline, TimelineEntry } from '../components/Timeline'
import {
  LabelCaps,
  PencilIcon,
  PlusIcon,
  PrimaryButton,
  SecondaryButton,
  SegmentedControl,
  TrashIcon,
} from '../components/ui'
import { periods as allPeriods } from '../data/seed'
import { formatDateTime, formatMoney } from '../lib/format'
import { buildColumns, sumByColumn, type ViewMode } from '../lib/periodAggregate'
import { useStore } from '../lib/store'
import type { LineItem, LineItemCategory, LineItemKind } from '../lib/types'

function lineItemSeries(li: LineItem): Record<string, number | undefined> {
  const merged: Record<string, number | undefined> = {}
  allPeriods.forEach((p) => {
    if (p.isClosed) {
      merged[p.key] = li.actuals[p.key]
    } else {
      merged[p.key] = li.forecastMode === 'direct' ? li.directValues[p.key] : li.forecast[p.key]
    }
  })
  return merged
}

export default function ModelWorksheetPage() {
  const { modelId } = useParams<{ modelId: string }>()
  const navigate = useNavigate()
  const { getModel, lineItems, addLineItem, updateLineItem, removeLineItem, drivers } = useStore()
  const model = getModel(modelId ?? '')

  const [view, setView] = useState<ViewMode>('week')
  const [tab, setTab] = useState<'worksheet' | 'history'>('worksheet')
  const [drawerState, setDrawerState] = useState<{ mode: 'new'; category: LineItemCategory } | { mode: 'edit'; id: string } | null>(
    null,
  )

  if (!model) {
    return (
      <div className="p-8">
        <p className="text-sm text-ink-secondary">Model not found.</p>
        <button onClick={() => navigate('/models')} className="mt-3 text-sm font-medium underline">
          Back to models
        </button>
      </div>
    )
  }

  const modelId2 = model.id
  const modelLineItems = model.lineItemIds.map((id) => lineItems.find((li) => li.id === id)).filter((li): li is LineItem => !!li)
  const inflows = modelLineItems.filter((li) => li.category === 'receipts')
  const outflows = modelLineItems.filter((li) => li.category === 'disbursements')
  const columns = buildColumns(allPeriods, view)

  const editingItem = drawerState?.mode === 'edit' ? lineItems.find((li) => li.id === drawerState.id) ?? null : null

  function handleSaveLineItem(patch: {
    name: string
    category: LineItemCategory
    forecastMode: LineItemKind
    formula: string
    directValues: Record<string, number>
    actualsMode: LineItemKind
    actualsFormula: string
    actuals: Record<string, number>
  }) {
    if (!model) return
    if (drawerState?.mode === 'edit') {
      updateLineItem(model.id, drawerState.id, patch)
    } else {
      addLineItem(model.id, { ...patch, forecast: {} })
    }
    setDrawerState(null)
  }

  function Row({ li }: { li: LineItem }) {
    const series = lineItemSeries(li)
    return (
      <div className="group grid items-center gap-0 border-b border-border" style={{ gridTemplateColumns: `280px repeat(${columns.length}, 1fr)` }}>
        <div className="sticky left-0 flex items-center gap-1.5 border-r border-border bg-card px-6 py-3 pl-10 text-sm text-ink-primary">
          <span className="truncate">{li.name}</span>
          <span className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={() => setDrawerState({ mode: 'edit', id: li.id })}
              className="rounded p-1 text-ink-muted hover:bg-page hover:text-ink-primary"
              aria-label="Edit line item"
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => removeLineItem(modelId2, li.id)}
              className="rounded p-1 text-red-text opacity-70 hover:bg-red-bg hover:opacity-100"
              aria-label="Delete line item"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
        {columns.map((col) => {
          const val = sumByColumn(series, col)
          return (
            <div key={col.key} className="px-4 py-3 text-right text-sm tabular-nums text-ink-primary">
              {val === undefined ? <span className="text-ink-muted">—</span> : formatMoney(val)}
            </div>
          )
        })}
      </div>
    )
  }

  function GroupHeader({ label, bg, text }: { label: string; bg: string; text: string }) {
    return (
      <div
        className="grid items-center border-b border-border px-6 py-2.5 text-sm font-semibold"
        style={{ gridTemplateColumns: `280px repeat(${columns.length}, 1fr)`, backgroundColor: bg, color: text }}
      >
        <div className="sticky left-0" style={{ backgroundColor: bg }}>
          {label}
        </div>
        {columns.map((c) => (
          <div key={c.key} />
        ))}
      </div>
    )
  }

  function AddRow({ category }: { category: LineItemCategory }) {
    return (
      <button
        onClick={() => setDrawerState({ mode: 'new', category })}
        className="flex w-full items-center gap-1.5 border-b border-border px-6 py-3 pl-10 text-sm font-medium text-ink-secondary hover:bg-page hover:text-ink-primary"
      >
        <PlusIcon className="h-3.5 w-3.5" /> Add {category === 'receipts' ? 'inflow' : 'outflow'} driver
      </button>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border bg-page px-8 py-5">
        <div className="flex items-center gap-4">
          <SecondaryButton onClick={() => navigate('/models')}>← Back</SecondaryButton>
          <div>
            <h1 className="font-serif text-xl text-ink-primary">{model.name}</h1>
            <p className="text-xs text-ink-muted">{model.fiscalYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SegmentedControl
            options={[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            value={view}
            onChange={setView}
          />
          <PrimaryButton>Publish</PrimaryButton>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border bg-page px-8 pt-3">
        {(['worksheet', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? 'border border-b-0 border-border bg-card text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'worksheet' ? (
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div
              className="grid border-b border-border bg-table-header"
              style={{ gridTemplateColumns: `280px repeat(${columns.length}, 1fr)` }}
            >
              <div className="sticky left-0 bg-table-header px-6 py-3">
                <LabelCaps>Particulars</LabelCaps>
              </div>
              {columns.map((c) => (
                <div key={c.key} className="px-4 py-3 text-right">
                  <LabelCaps>{c.label}</LabelCaps>
                </div>
              ))}
            </div>

            <GroupHeader label="Cash Inflows" bg="#F0F6F2" text="#376A42" />
            {inflows.map((li) => (
              <Row key={li.id} li={li} />
            ))}
            <AddRow category="receipts" />

            <GroupHeader label="Cash Outflows" bg="#FBF1EF" text="#9B3B37" />
            {outflows.map((li) => (
              <Row key={li.id} li={li} />
            ))}
            <AddRow category="disbursements" />
          </div>
        </div>
      ) : (
        <div className="px-8 py-6">
          <Timeline>
            {model.history.map((h, i) => (
              <TimelineEntry key={i} date={formatDateTime(h.date)} editor={h.editor}>
                <div>
                  {h.change === 'line_item_added' && (
                    <>
                      Line item added: <span className="font-medium">&ldquo;{h.lineItemName}&rdquo;</span>
                    </>
                  )}
                  {h.change === 'line_item_removed' && (
                    <>
                      Line item removed: <span className="font-medium">&ldquo;{h.lineItemName}&rdquo;</span>
                    </>
                  )}
                  {h.change === 'reordered' && (
                    <>
                      Line item reordered: <span className="font-medium">&ldquo;{h.lineItemName}&rdquo;</span>
                    </>
                  )}
                  {h.change === 'formula_changed' && (
                    <>
                      Formula changed: <span className="font-medium">&ldquo;{h.lineItemName}&rdquo;</span>
                    </>
                  )}
                </div>
                {h.change === 'formula_changed' && (
                  <div className="mt-1 font-mono text-xs text-ink-secondary">
                    {h.oldFormula} → {h.newFormula}
                  </div>
                )}
              </TimelineEntry>
            ))}
            {model.history.length === 0 && <p className="text-sm text-ink-muted">No structural changes yet.</p>}
          </Timeline>
        </div>
      )}

      <LineItemDrawer
        open={!!drawerState}
        onClose={() => setDrawerState(null)}
        lineItem={editingItem}
        defaultCategory={drawerState?.mode === 'new' ? drawerState.category : 'receipts'}
        periods={allPeriods}
        drivers={drivers}
        otherLineItems={modelLineItems}
        onSave={handleSaveLineItem}
      />
    </div>
  )
}
