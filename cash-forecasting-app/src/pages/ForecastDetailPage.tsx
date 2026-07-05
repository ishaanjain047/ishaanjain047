import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LabelCaps, SecondaryButton, SegmentedControl, Select } from '../components/ui'
import { useStore } from '../lib/store'
import { formatMoney } from '../lib/format'
import { buildColumns, type DisplayColumn, type ViewMode } from '../lib/periodAggregate'
import type { ForecastRow } from '../lib/types'

type ScenarioCase = 'base' | 'bull' | 'bear'

function aggregateCell(row: ForecastRow, column: DisplayColumn) {
  // Balance rows are point-in-time snapshots, not flows — take the
  // opening snapshot from the first period and the ending snapshot from
  // the last period rather than summing across the month.
  if (row.kind === 'balance') {
    const key = row.id === 'endingBalance' ? column.periodKeys[column.periodKeys.length - 1] : column.periodKeys[0]
    const cell = row.values[key]
    return cell ?? { actual: undefined, forecast: undefined, scenario: undefined }
  }

  let actualSum: number | undefined
  let forecastSum: number | undefined
  const scenarioSum: Record<string, number> = { base: 0, bull: 0, bear: 0 }
  let hasScenario = false

  column.periodKeys.forEach((k) => {
    const cell = row.values[k]
    if (!cell) return
    if (cell.actual !== undefined) actualSum = (actualSum ?? 0) + cell.actual
    if (cell.forecast !== undefined) forecastSum = (forecastSum ?? 0) + cell.forecast
    if (cell.scenario) {
      hasScenario = true
      ;(['base', 'bull', 'bear'] as const).forEach((s) => {
        scenarioSum[s] += cell.scenario?.[s] ?? 0
      })
    }
  })

  return { actual: actualSum, forecast: forecastSum, scenario: hasScenario ? scenarioSum : undefined }
}

function Cell({
  row,
  column,
  scenarioCase,
}: {
  row: ForecastRow
  column: DisplayColumn
  scenarioCase: ScenarioCase
}) {
  const { actual, forecast, scenario } = aggregateCell(row, column)

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
  const { forecast, getModel } = useStore()
  const [view, setView] = useState<ViewMode>('week')
  const [scenarioCase, setScenarioCase] = useState<ScenarioCase>('base')
  const [scenario, setScenario] = useState('hikeAnalysis')

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

  const model = getModel(forecast.modelId)
  const columns = buildColumns(forecast.periods, view)

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
              <div className="text-sm font-medium text-ink-primary">{model?.name ?? forecast.modelId}</div>
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
          <div className="grid border-b border-border bg-table-header" style={{ gridTemplateColumns: `240px repeat(${columns.length}, 1fr)` }}>
            <div className="sticky left-0 bg-table-header px-6 py-3">
              <LabelCaps>Particulars</LabelCaps>
            </div>
            {columns.map((c) => (
              <div key={c.key} className="px-4 py-3 text-right">
                <LabelCaps>{c.label}</LabelCaps>
              </div>
            ))}
          </div>

          {forecast.rows.map((row) => {
            if (row.kind === 'group') {
              const bg = row.category === 'receipts' ? '#F0F6F2' : '#FBF1EF'
              const text = row.category === 'receipts' ? '#376A42' : '#9B3B37'
              return (
                <div
                  key={row.id}
                  className="grid items-center border-b border-border px-6 py-2.5 text-sm font-semibold"
                  style={{ gridTemplateColumns: `240px repeat(${columns.length}, 1fr)`, backgroundColor: bg, color: text }}
                >
                  <div className="sticky left-0" style={{ backgroundColor: bg }}>
                    {row.label}
                  </div>
                  {columns.map((c) => (
                    <div key={c.key} />
                  ))}
                </div>
              )
            }

            const isEmphasis = row.kind === 'balance' || row.kind === 'total'
            return (
              <div
                key={row.id}
                className={`grid items-center border-b border-border ${isEmphasis ? 'bg-page/60 font-semibold' : ''}`}
                style={{ gridTemplateColumns: `240px repeat(${columns.length}, 1fr)` }}
              >
                <div
                  className={`sticky left-0 border-r border-border px-6 py-3 text-sm text-ink-primary ${
                    row.kind === 'child' ? 'pl-10' : ''
                  } ${isEmphasis ? 'bg-page' : 'bg-card'}`}
                >
                  {row.label}
                </div>
                {columns.map((c) => (
                  <Cell key={c.key} row={row} column={c} scenarioCase={scenarioCase} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
