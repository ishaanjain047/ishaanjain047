import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LabelCaps, SecondaryButton, SegmentedControl, Select } from '../components/ui'
import { RowLine, RowTableBody, RowTableHeader, SectionBanner } from '../components/RowTable'
import { OPENING_BALANCE_START } from '../data/seed'
import { useStore } from '../lib/store'
import { formatMoney } from '../lib/format'
import { buildColumns, type DisplayColumn, type ViewMode } from '../lib/periodAggregate'
import {
  aggregateForColumn,
  aggregateSnapshotForColumn,
  computeBalanceChain,
  computeRowValues,
  type CellValue,
} from '../lib/rowEngine'
import type { RowDef } from '../lib/types'

type ScenarioCase = 'base' | 'bull' | 'bear'

function Cell({ value, column }: { value: CellValue; column: DisplayColumn }) {
  const { actual, forecast } = value

  if (column.isClosed) {
    const variance = actual !== undefined && forecast !== undefined ? actual - forecast : undefined
    return (
      <div className="px-4 py-3 text-right">
        <div className="text-sm font-medium tabular-nums text-ink-primary">{formatMoney(actual)}</div>
        {variance !== undefined && (
          <div className={`text-xs tabular-nums ${variance >= 0 ? 'text-green-text' : 'text-red-text'}`}>
            vs fcst {variance >= 0 ? '+' : '−'}
            {formatMoney(Math.abs(variance)).replace('-', '')}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 py-3 text-right">
      <div className="text-sm font-medium tabular-nums text-ink-primary">{formatMoney(forecast)}</div>
    </div>
  )
}

function ScenarioCell({ value, column, scenarioCase }: { value: CellValue; column: DisplayColumn; scenarioCase: ScenarioCase }) {
  if (column.isClosed) return <Cell value={value} column={column} />
  const { forecast, scenario } = value
  if (!scenario || scenarioCase === 'base') {
    return (
      <div className="px-4 py-3 text-right">
        <div className="text-sm font-medium tabular-nums text-ink-primary">{formatMoney(forecast)}</div>
      </div>
    )
  }
  return (
    <div className="px-4 py-3 text-right">
      <div className="text-sm font-medium tabular-nums text-ink-primary">{formatMoney(scenario[scenarioCase])}</div>
      <div className="text-xs tabular-nums text-ink-muted">base: {formatMoney(scenario.base)}</div>
    </div>
  )
}

export default function ForecastDetailPage() {
  const { forecastId } = useParams<{ forecastId: string }>()
  const navigate = useNavigate()
  const { forecast, getModel, lineItems } = useStore()
  const [view, setView] = useState<ViewMode>('week')
  const [scenarioCase, setScenarioCase] = useState<ScenarioCase>('base')
  const [scenario, setScenario] = useState('hikeAnalysis')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (!forecastId || forecast.id !== forecastId) {
    return (
      <div className="p-8">
        <p className="text-sm text-ink-secondary">Forecast not found.</p>
        <button onClick={() => navigate('/forecasts')} className="mt-3 text-sm font-medium underline">
          Back to forecasts
        </button>
      </div>
    )
  }

  const resolvedModel = getModel(forecast.modelId)
  const columns = buildColumns(forecast.periods, view)
  const lineItemsById = useMemo(() => Object.fromEntries(lineItems.map((li) => [li.id, li])), [lineItems])
  const rowLayout = resolvedModel?.rowLayout ?? []
  const rowValues = useMemo(() => computeRowValues(rowLayout, lineItemsById, forecast.periods), [rowLayout, lineItemsById, forecast.periods])
  const balanceChain = useMemo(
    () => computeBalanceChain(rowValues, 'totalReceipts', 'netDisbursements', forecast.periods, OPENING_BALANCE_START),
    [rowValues, forecast.periods],
  )

  const receiptsRows = rowLayout.filter((r) => r.category === 'receipts')
  const disbursementsRows = rowLayout.filter((r) => r.category === 'disbursements')

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderCell(row: RowDef, column: DisplayColumn) {
    const values = rowValues[row.id] ?? {}
    const value = aggregateForColumn(values, column)
    return <ScenarioCell value={value} column={column} scenarioCase={scenarioCase} />
  }

  return (
    <div>
      <div className="border-b border-border bg-page px-8 py-5">
        <div className="mb-4 flex items-center gap-3">
          <SecondaryButton onClick={() => navigate('/forecasts')}>← Back</SecondaryButton>
          <h1 className="font-serif text-xl text-ink-primary">{forecast.name}</h1>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <LabelCaps>Entity</LabelCaps>
              <div className="text-sm font-medium text-ink-primary">{forecast.entity}</div>
            </div>
            <div>
              <LabelCaps>Model</LabelCaps>
              <div className="text-sm font-medium text-ink-primary">{resolvedModel?.name ?? forecast.modelId}</div>
            </div>
            <SegmentedControl
              options={[
                { value: 'base', label: 'Base' },
                { value: 'bull', label: 'Bull' },
                { value: 'bear', label: 'Bear' },
              ]}
              value={scenarioCase}
              onChange={setScenarioCase}
            />
            <div className="w-48">
              <LabelCaps className="mb-1">Scenario</LabelCaps>
              <Select
                value={scenario}
                onChange={setScenario}
                options={[
                  { value: 'hikeAnalysis', label: 'Hike Analysis' },
                  { value: 'none', label: 'None (base model)' },
                ]}
              />
            </div>
          </div>
          <SegmentedControl
            options={[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            value={view}
            onChange={setView}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          <RowTableHeader columns={columns} />

          <RowLine
            label="Beginning cash balance"
            columns={columns}
            bold
            tint
            renderCell={(c) => {
              const value = aggregateSnapshotForColumn(balanceChain.beginning, c, 'first')
              return <ScenarioCell value={value} column={c} scenarioCase={scenarioCase} />
            }}
          />

          <SectionBanner label="RECEIPTS" bg="#F0F6F2" text="#376A42" columns={columns} />
          <RowTableBody rowLayout={receiptsRows} columns={columns} collapsedGroupIds={collapsed} onToggleGroup={toggle} renderCell={renderCell} />

          <SectionBanner label="Disbursements" bg="#FBF1EF" text="#B14434" columns={columns} />
          <RowTableBody
            rowLayout={disbursementsRows}
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
              const value: CellValue = {
                actual: receipts.actual !== undefined || netDisb.actual !== undefined ? (receipts.actual ?? 0) + (netDisb.actual ?? 0) : undefined,
                forecast:
                  receipts.forecast !== undefined || netDisb.forecast !== undefined ? (receipts.forecast ?? 0) + (netDisb.forecast ?? 0) : undefined,
                scenario:
                  receipts.scenario || netDisb.scenario
                    ? {
                        base: (receipts.scenario?.base ?? 0) + (netDisb.scenario?.base ?? 0),
                        bull: (receipts.scenario?.bull ?? 0) + (netDisb.scenario?.bull ?? 0),
                        bear: (receipts.scenario?.bear ?? 0) + (netDisb.scenario?.bear ?? 0),
                      }
                    : undefined,
              }
              return <ScenarioCell value={value} column={c} scenarioCase={scenarioCase} />
            }}
          />

          <RowLine
            label="Ending unrestricted cash"
            columns={columns}
            bold
            tint
            renderCell={(c) => {
              const value = aggregateSnapshotForColumn(balanceChain.ending, c, 'last')
              return <ScenarioCell value={value} column={c} scenarioCase={scenarioCase} />
            }}
          />
        </div>
      </div>
    </div>
  )
}
