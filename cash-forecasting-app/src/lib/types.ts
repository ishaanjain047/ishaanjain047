export type DriverType =
  | 'manual_assumption'
  | 'manual_series'
  | 'plan_allocation'
  | 'erp_trailing_stat'
  | 'erp_due_date_direct'
  | 'recurring'
  | 'dso'
  | 'dpo'
  | 'collection_curve'
  | 'ml_suggested'
  | 'calibration_factor'
  | 'ratio'

export type DriverFamily = 'manual' | 'erp' | 'statistical' | 'ml'

// Order matches the 12-row catalog in the Drivers Module spec (Section 4).
export const DRIVER_FAMILY: Record<DriverType, DriverFamily> = {
  manual_assumption: 'manual',
  manual_series: 'manual',
  plan_allocation: 'erp',
  erp_trailing_stat: 'erp',
  erp_due_date_direct: 'erp',
  recurring: 'manual',
  dso: 'statistical',
  dpo: 'statistical',
  collection_curve: 'statistical',
  ml_suggested: 'ml',
  calibration_factor: 'statistical',
  ratio: 'statistical',
}

export const DRIVER_TYPE_LABEL: Record<DriverType, string> = {
  manual_assumption: 'Manual Assumption',
  manual_series: 'Manual Series',
  plan_allocation: 'Plan Allocation',
  erp_trailing_stat: 'ERP Actual + Trailing Stat',
  erp_due_date_direct: 'ERP Actual — Due Date Direct',
  recurring: 'Recurring',
  dso: 'DSO',
  dpo: 'DPO',
  collection_curve: 'Collection Curve',
  ml_suggested: 'ML-Suggested',
  calibration_factor: 'Calibration/Correction Factor',
  ratio: 'Ratio',
}

export type PayBasis = 'Monthly' | 'Weekly' | 'Quarterly' | 'Annual'
export type CalibrationSource = 'manual' | 'derived_from_history'
export type RefreshCadence = 'Monthly' | 'Quarterly' | 'Manual trigger'
export type ApplicabilityWindow = 'forecasted_only' | 'all_periods'

export interface CurveRow {
  offsetPeriods: number
  percentage: number
}

// Present (possibly null) on every driver, regardless of type — see Section 2/3 of the
// Drivers Module spec. A real NetSuite transaction for a given period always takes hard
// precedence over the driver's declared forecast method for that period.
export interface NetsuiteMapping {
  subsidiary: string | null
  account: string | null
  queryDescription: string | null
}

export function emptyNetsuiteMapping(): NetsuiteMapping {
  return { subsidiary: null, account: null, queryDescription: null }
}

export function isNetsuiteMappingEmpty(m: NetsuiteMapping | null | undefined): boolean {
  return !m || (!m.subsidiary && !m.account && !m.queryDescription)
}

export interface DriverFields {
  // manual_assumption
  value?: number
  isPercent?: boolean
  frequencySelect?: 'Weekly' | 'Monthly review' | 'Quarterly' | 'One-time'
  // manual_series / ml_suggested
  valuesByPeriod?: Record<string, number>
  // plan_allocation
  rawTotalAmount?: number
  spreadAcross?: number
  sourceNote?: string
  // erp_trailing_stat / erp_due_date_direct (subsidiary/account/query live in
  // the universal netsuiteMapping envelope, not here)
  actualsHorizonWeeks?: number
  fallbackMethod?: string
  dueDateFieldRef?: string
  // recurring
  payBasis?: PayBasis
  startPeriod?: string
  recurringFrequency?: number
  numberOfOccurrences?: number
  indefiniteOccurrences?: boolean
  amount?: number
  // dso / dpo
  avgDaysOutstanding?: number
  balanceSource?: string
  // collection_curve
  curveRows?: CurveRow[]
  applicabilityWindow?: ApplicabilityWindow
  calibrationSource?: CalibrationSource
  refreshCadence?: RefreshCadence
  // ml_suggested
  modelSourceNote?: string
  predictedValuesByPeriod?: Record<string, number>
  // calibration_factor
  multiplier?: number
  appliedTo?: string
  // ratio / collection_curve source reference
  sourceRef?: string
  percentage?: number
}

export interface HistoryEntry {
  date: string
  editor: string
  field: string
  oldValue: string
  newValue: string
  reason: string
}

export interface Driver {
  id: string
  name: string
  type: DriverType
  frequency: string
  netsuiteMapping: NetsuiteMapping | null
  fields: DriverFields
  derivationLogic: string
  lastEditReason: string
  history: HistoryEntry[]
  updatedAt: string
  updatedBy: string
}

export type LineItemCategory = 'receipts' | 'disbursements'
export type LineItemKind = 'formula' | 'direct'

// An editable, driver-wireable detail record. Every 'leaf' RowDef points at exactly one
// of these. Groups/subtotals/totals are pure structural rollups and have no LineItem of
// their own — see RowDef below.
export interface LineItem {
  id: string
  name: string
  category: LineItemCategory
  forecastMode: LineItemKind
  formula: string
  actualsMode: LineItemKind
  actualsFormula: string
  actuals: Record<string, number>
  forecast: Record<string, number>
  directValues: Record<string, number>
}

export interface ModelHistoryEntry {
  date: string
  editor: string
  change: 'line_item_added' | 'line_item_removed' | 'formula_changed' | 'reordered'
  lineItemName: string
  oldFormula?: string
  newFormula?: string
}

// The default line-item table structure (Section 1 of the Drivers Module follow-up
// spec) mirrors the ChargePoint workbook one-to-one: groups with a flat list of leaf
// entities, optional mid-group subtotal checkpoints (e.g. "Total North American
// Collections"), and section-terminal totals (e.g. "Total Receipts"). This is expressed
// as a single flat, ordered array rather than a recursive tree because every group in
// the workbook is exactly one level deep — subtotal/total rows are themselves flat
// siblings, just tagged with which preceding rows they roll up.
export type RowKind = 'group' | 'leaf' | 'subtotal' | 'total'

export interface RowDef {
  id: string
  name: string
  kind: RowKind
  category: LineItemCategory
  // Present on 'leaf' and 'subtotal' rows that are nested one level under a 'group' row.
  // Absent for top-level rows (including top-level leaves like "Customer Refunds").
  parentId?: string
  // Present on 'group' | 'subtotal' | 'total' rows: the ids of the rows to sum for this
  // row's own value. May reference leaf rows directly or other group/subtotal/total rows
  // (already-computed rollups), never both redundantly for the same underlying amount.
  sumIds?: string[]
  // Present on 'leaf' rows only — the id of the editable LineItem record.
  lineItemId?: string
}

export interface CashFlowModel {
  id: string
  name: string
  fiscalYear: string
  description: string
  status: 'Published' | 'Draft'
  rowLayout: RowDef[]
  history: ModelHistoryEntry[]
  updatedAt: string
}

export interface Period {
  key: string
  label: string
  monthLabel: string
  isClosed: boolean
  isPivot: boolean
}

export interface Scenario {
  id: 'base' | 'bull' | 'bear'
  name: string
}

export interface Forecast {
  id: string
  name: string
  entity: string
  modelId: string
  periods: Period[]
}
