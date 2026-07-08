import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LineItemDrawer } from '../components/LineItemDrawer'
import { RowLine, RowTableBody, RowTableHeader, SectionBanner } from '../components/RowTable'
import { Timeline, TimelineEntry } from '../components/Timeline'
import { PlusIcon, PrimaryButton, SecondaryButton, SegmentedControl } from '../components/ui'
import { periods as allPeriods, OPENING_BALANCE_START } from '../data/seed'
import { formatDateTime, formatMoney } from '../lib/format'
import { buildColumns, type DisplayColumn, type ViewMode } from '../lib/periodAggregate'
import { aggregateForColumn, aggregateSnapshotForColumn, computeBalanceChain, computeRowValues, type CellValue } from '../lib/rowEngine'
import { useStore } from '../lib/store'
import type { LineItemCategory, LineItemKind, RowDef } from '../lib/types'

function Cell({ value, column }: { value: CellValue; column: DisplayColumn }) {
  const shown = column.isClosed ? value.actual : value.forecast
  return (
    <div className="px-4 py-3 text-right text-sm tabular-nums text-ink-primary">
      {shown === undefined ? <span className="text-ink-muted">—</span> : formatMoney(shown)}
    </div>
  )
}

export default function ModelWorksheetPage() {
  const { modelId } = useParams<{ modelId: string }>()
  const navigate = useNavigate()
  const { getModel, lineItems, addLineItem, updateLineItem, removeLineItem, drivers } = useStore()
  const model = getModel(modelId ?? '')

  const [view, setView] = useState<ViewMode>('week')
  const [tab, setTab] = useState<'worksheet' | 'history'>('worksheet')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [drawerState, setDrawerState] = useState<{ mode: 'new'; category: LineItemCategory } | { mode: 'edit'; id: string } | null>(
    null,
  )

  const lineItemsById = useMemo(() => Object.fromEntries(lineItems.map((li) => [li.id, li])), [lineItems])
  const rowLayout = model?.rowLayout ?? []
  const columns = buildColumns(allPeriods, view)
  const rowValues = useMemo(() => computeRowValues(rowLayout, lineItemsById, allPeriods), [rowLayout, lineItemsById])
  const balanceChain = useMemo(
    () => computeBalanceChain(rowValues, 'totalReceipts', 'netDisbursements', allPeriods, OPENING_BALANCE_START),
    [rowValues],
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
  // Split each category right before its first section-terminal total, so the
  // "+ Add … driver" affordance lands exactly where a new ad-hoc leaf would be
  // inserted (store.addLineItem appends before that same total). Any *later* totals
  // in the category (e.g. disbursements' Total Other / Net Disbursements) stay in
  // their natural position within the second slice — nothing gets reordered.
  const receiptsAll = rowLayout.filter((r) => r.category === 'receipts')
  const receiptsSplitAt = receiptsAll.findIndex((r) => r.kind === 'total')
  const receiptsRows = receiptsSplitAt === -1 ? receiptsAll : receiptsAll.slice(0, receiptsSplitAt)
  const receiptsTotal = receiptsSplitAt === -1 ? [] : receiptsAll.slice(receiptsSplitAt)

  const disbursementsAll = rowLayout.filter((r) => r.category === 'disbursements')
  const disbursementsSplitAt = disbursementsAll.findIndex((r) => r.kind === 'total')
  const disbursementsRows = disbursementsSplitAt === -1 ? disbursementsAll : disbursementsAll.slice(0, disbursementsSplitAt)
  const disbursementsTotals = disbursementsSplitAt === -1 ? [] : disbursementsAll.slice(disbursementsSplitAt)

  const editingLineItem = drawerState?.mode === 'edit' ? lineItems.find((li) => li.id === drawerState.id) ?? null : null

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderCell(row: RowDef, column: DisplayColumn) {
    const value = aggregateForColumn(rowValues[row.id] ?? {}, column)
    return <Cell value={value} column={column} />
  }

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
    if (drawerState?.mode === 'edit') {
      updateLineItem(modelId2, drawerState.id, patch)
    } else {
      addLineItem(modelId2, patch.category, { ...patch, forecast: {} })
    }
    setDrawerState(null)
  }

  function handleDelete(row: RowDef) {
    removeLineItem(modelId2, row.id)
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
            <RowTableHeader columns={columns} />

            <RowLine
              label="Beginning cash balance"
              columns={columns}
              bold
              tint
              renderCell={(c) => <Cell value={aggregateSnapshotForColumn(balanceChain.beginning, c, 'first')} column={c} />}
            />

            <SectionBanner label="RECEIPTS" bg="#F0F6F2" text="#376A42" columns={columns} />
            <RowTableBody
              rowLayout={receiptsRows}
              columns={columns}
              collapsedGroupIds={collapsed}
              onToggleGroup={toggle}
              renderCell={renderCell}
              onEditLeaf={(row) => (row.kind === 'leaf' ? setDrawerState({ mode: 'edit', id: row.id }) : undefined)}
              onDeleteLeaf={(row) => (row.kind === 'leaf' ? handleDelete(row) : undefined)}
            />
            <button
              onClick={() => setDrawerState({ mode: 'new', category: 'receipts' })}
              className="flex w-full items-center gap-1.5 border-b border-border px-6 py-3 pl-10 text-sm font-medium text-ink-secondary hover:bg-page hover:text-ink-primary"
            >
              <PlusIcon className="h-3.5 w-3.5" /> Add inflow driver
            </button>
            <RowTableBody
              rowLayout={receiptsTotal}
              columns={columns}
              collapsedGroupIds={collapsed}
              onToggleGroup={toggle}
              renderCell={renderCell}
            />

            <SectionBanner label="Disbursements" bg="#FBF1EF" text="#B14434" columns={columns} />
            <RowTableBody
              rowLayout={disbursementsRows}
              columns={columns}
              collapsedGroupIds={collapsed}
              onToggleGroup={toggle}
              renderCell={renderCell}
              onEditLeaf={(row) => (row.kind === 'leaf' ? setDrawerState({ mode: 'edit', id: row.id }) : undefined)}
              onDeleteLeaf={(row) => (row.kind === 'leaf' ? handleDelete(row) : undefined)}
            />
            <button
              onClick={() => setDrawerState({ mode: 'new', category: 'disbursements' })}
              className="flex w-full items-center gap-1.5 border-b border-border px-6 py-3 pl-10 text-sm font-medium text-ink-secondary hover:bg-page hover:text-ink-primary"
            >
              <PlusIcon className="h-3.5 w-3.5" /> Add outflow driver
            </button>
            <RowTableBody
              rowLayout={disbursementsTotals}
              columns={columns}
              collapsedGroupIds={collapsed}
              onToggleGroup={toggle}
              renderCell={renderCell}
            />

            <RowLine
              label="Net unrestricted cash increase/(decrease)"
              columns={columns}
              bold
              renderCell={(c) => {
                const receipts = aggregateForColumn(rowValues['totalReceipts'] ?? {}, c)
                const netDisb = aggregateForColumn(rowValues['netDisbursements'] ?? {}, c)
                const shown = c.isClosed
                  ? receipts.actual !== undefined || netDisb.actual !== undefined
                    ? (receipts.actual ?? 0) + (netDisb.actual ?? 0)
                    : undefined
                  : receipts.forecast !== undefined || netDisb.forecast !== undefined
                    ? (receipts.forecast ?? 0) + (netDisb.forecast ?? 0)
                    : undefined
                return <Cell value={c.isClosed ? { actual: shown } : { forecast: shown }} column={c} />
              }}
            />

            <RowLine
              label="Ending unrestricted cash"
              columns={columns}
              bold
              tint
              renderCell={(c) => <Cell value={aggregateSnapshotForColumn(balanceChain.ending, c, 'last')} column={c} />}
            />
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
                      Structural change: <span className="font-medium">&ldquo;{h.lineItemName}&rdquo;</span>
                    </>
                  )}
                  {h.change === 'formula_changed' && (
                    <>
                      Formula changed: <span className="font-medium">&ldquo;{h.lineItemName}&rdquo;</span>
                    </>
                  )}
                </div>
                {(h.change === 'formula_changed' || h.change === 'reordered') && (
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
        lineItem={editingLineItem}
        defaultCategory={drawerState?.mode === 'new' ? drawerState.category : 'receipts'}
        periods={allPeriods}
        drivers={drivers}
        otherLineItems={lineItems}
        onSave={handleSaveLineItem}
      />
    </div>
  )
}
