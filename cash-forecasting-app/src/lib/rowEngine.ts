import type { LineItem, Period, RowDef } from './types'
import type { DisplayColumn } from './periodAggregate'

export interface CellValue {
  actual?: number
  forecast?: number
  scenario?: Record<string, number>
}

export type RowValues = Record<string, CellValue>

const SCENARIOS = ['base', 'bull', 'bear'] as const

function scenarioMultiplier(scenario: (typeof SCENARIOS)[number], category: 'receipts' | 'disbursements') {
  if (scenario === 'base') return 1
  if (category === 'receipts') return scenario === 'bull' ? 1.06 : 0.94
  return scenario === 'bull' ? 0.97 : 1.03
}

function leafCellValue(li: LineItem, p: Period): CellValue {
  if (p.isClosed) {
    return { actual: li.actuals[p.key], forecast: li.forecast[p.key] }
  }
  const base = li.forecastMode === 'direct' ? li.directValues[p.key] : li.forecast[p.key]
  if (base === undefined) return {}
  const scenario: Record<string, number> = {}
  SCENARIOS.forEach((s) => {
    scenario[s] = Math.round(base * scenarioMultiplier(s, li.category))
  })
  return { forecast: base, scenario }
}

function addCell(a: CellValue, b: CellValue): CellValue {
  const out: CellValue = {}
  if (a.actual !== undefined || b.actual !== undefined) out.actual = (a.actual ?? 0) + (b.actual ?? 0)
  if (a.forecast !== undefined || b.forecast !== undefined) out.forecast = (a.forecast ?? 0) + (b.forecast ?? 0)
  if (a.scenario || b.scenario) {
    out.scenario = {}
    SCENARIOS.forEach((s) => {
      out.scenario![s] = (a.scenario?.[s] ?? 0) + (b.scenario?.[s] ?? 0)
    })
  }
  return out
}

/**
 * Computes, for every row in the layout, its {actual, forecast, scenario} value at every
 * period. Leaf rows read straight from their LineItem; group/subtotal/total rows
 * recursively sum whatever their `sumIds` point to (leaves or other rollups), memoized
 * so shared sub-totals (e.g. a group referenced by the section total) aren't recomputed.
 */
export function computeRowValues(
  rowLayout: RowDef[],
  lineItemsById: Record<string, LineItem>,
  periods: Period[],
): Record<string, RowValues> {
  const rowsById = Object.fromEntries(rowLayout.map((r) => [r.id, r]))
  const memo: Record<string, RowValues> = {}

  function compute(id: string): RowValues {
    if (memo[id]) return memo[id]
    const row = rowsById[id]
    if (!row) return {}
    let result: RowValues
    if (row.kind === 'leaf') {
      const li = row.lineItemId ? lineItemsById[row.lineItemId] : undefined
      result = Object.fromEntries(periods.map((p) => [p.key, li ? leafCellValue(li, p) : {}]))
    } else {
      const childIds = row.sumIds ?? []
      result = Object.fromEntries(periods.map((p) => [p.key, {} as CellValue]))
      childIds.forEach((childId) => {
        const childValues = compute(childId)
        periods.forEach((p) => {
          result[p.key] = addCell(result[p.key], childValues[p.key] ?? {})
        })
      })
    }
    memo[id] = result
    return result
  }

  rowLayout.forEach((r) => compute(r.id))
  return memo
}

// Sums a row's per-period values across a display column's constituent periods (for the
// Week/Month toggle). Flow rows (everything except the balance chain) sum naturally.
export function aggregateForColumn(values: RowValues, column: DisplayColumn): CellValue {
  let actual: number | undefined
  let forecast: number | undefined
  let hasScenario = false
  const scenario: Record<string, number> = { base: 0, bull: 0, bear: 0 }
  column.periodKeys.forEach((k) => {
    const cell = values[k]
    if (!cell) return
    if (cell.actual !== undefined) actual = (actual ?? 0) + cell.actual
    if (cell.forecast !== undefined) forecast = (forecast ?? 0) + cell.forecast
    if (cell.scenario) {
      hasScenario = true
      SCENARIOS.forEach((s) => {
        scenario[s] += cell.scenario?.[s] ?? 0
      })
    }
  })
  return { actual, forecast, scenario: hasScenario ? scenario : undefined }
}

// Balance-chain rows are point-in-time snapshots, not flows — take the opening
// snapshot from the column's first period and the ending snapshot from its last,
// rather than summing (which would wildly overstate a cash balance across a month).
export function aggregateSnapshotForColumn(values: RowValues, column: DisplayColumn, edge: 'first' | 'last'): CellValue {
  const key = edge === 'last' ? column.periodKeys[column.periodKeys.length - 1] : column.periodKeys[0]
  return values[key] ?? {}
}

export function topLevelRows(rowLayout: RowDef[]): RowDef[] {
  return rowLayout.filter((r) => !r.parentId)
}

export function childrenOf(rowLayout: RowDef[], parentId: string): RowDef[] {
  return rowLayout.filter((r) => r.parentId === parentId)
}

// A row is visible unless it's nested under a currently-collapsed group. Nesting is
// exactly one level deep everywhere in this layout (Section 2.2: toggling a group only
// affects its immediate children, never grandchildren), so a single parentId check
// suffices — no recursive ancestor walk needed.
export function visibleRows(rowLayout: RowDef[], collapsedGroupIds: Set<string>): RowDef[] {
  return rowLayout.filter((r) => !r.parentId || !collapsedGroupIds.has(r.parentId))
}

export function toggleCollapsed(collapsedGroupIds: Set<string>, groupId: string): Set<string> {
  const next = new Set(collapsedGroupIds)
  if (next.has(groupId)) next.delete(groupId)
  else next.add(groupId)
  return next
}

export interface BalanceChain {
  beginning: RowValues
  ending: RowValues
}

/**
 * Beginning cash balance / Ending unrestricted cash are a running chain, not a plain
 * rollup: each period's beginning balance is the previous period's ending balance, and
 * ending = beginning + Total Receipts + Net Disbursements for that period.
 */
export function computeBalanceChain(
  rowValues: Record<string, RowValues>,
  totalReceiptsId: string,
  netDisbursementsId: string,
  periods: Period[],
  openingBalanceStart: number,
): BalanceChain {
  const receipts = rowValues[totalReceiptsId] ?? {}
  const netDisb = rowValues[netDisbursementsId] ?? {}
  const beginning: RowValues = {}
  const ending: RowValues = {}

  let runningActual = openingBalanceStart
  let runningForecast = openingBalanceStart
  const runningScenario: Record<string, number> = { base: openingBalanceStart, bull: openingBalanceStart, bear: openingBalanceStart }

  periods.forEach((p) => {
    const rec = receipts[p.key] ?? {}
    const dis = netDisb[p.key] ?? {}
    if (p.isClosed) {
      beginning[p.key] = { actual: runningActual, forecast: runningForecast }
      const netActual = (rec.actual ?? 0) + (dis.actual ?? 0)
      const netForecast = (rec.forecast ?? 0) + (dis.forecast ?? 0)
      runningActual += netActual
      runningForecast += netForecast
      ending[p.key] = { actual: runningActual, forecast: runningForecast }
      SCENARIOS.forEach((s) => {
        runningScenario[s] = runningActual
      })
    } else {
      beginning[p.key] = { forecast: runningScenario.base, scenario: { ...runningScenario } }
      SCENARIOS.forEach((s) => {
        runningScenario[s] += (rec.scenario?.[s] ?? 0) + (dis.scenario?.[s] ?? 0)
      })
      runningForecast += (rec.forecast ?? 0) + (dis.forecast ?? 0)
      ending[p.key] = { forecast: runningForecast, scenario: { ...runningScenario } }
    }
  })

  return { beginning, ending }
}
