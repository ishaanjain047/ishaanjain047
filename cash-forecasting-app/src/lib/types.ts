export type DriverType =
  | 'manual_assumption'
  | 'manual_series'
  | 'plan_allocation'
  | 'erp_trailing_stat'
  | 'erp_due_date_direct'
  | 'dso'
  | 'dpo'
  | 'pay_terms_distribution'
  | 'ml_suggested'
  | 'calibration_factor'
  | 'ratio'

export type DriverFamily = 'manual' | 'erp' | 'statistical' | 'ml'

export const DRIVER_FAMILY: Record<DriverType, DriverFamily> = {
  manual_assumption: 'manual',
  manual_series: 'manual',
  plan_allocation: 'erp',
  erp_trailing_stat: 'erp',
  erp_due_date_direct: 'erp',
  dso: 'statistical',
  dpo: 'statistical',
  pay_terms_distribution: 'statistical',
  calibration_factor: 'statistical',
  ratio: 'statistical',
  ml_suggested: 'ml',
}

export const DRIVER_TYPE_LABEL: Record<DriverType, string> = {
  manual_assumption: 'Manual Assumption',
  manual_series: 'Manual Series',
  plan_allocation: 'Plan Allocation',
  erp_trailing_stat: 'ERP Actual + Trailing Stat',
  erp_due_date_direct: 'ERP Actual — Due Date Direct',
  dso: 'DSO',
  dpo: 'DPO',
  pay_terms_distribution: 'Pay-Terms Distribution',
  ml_suggested: 'ML-Suggested',
  calibration_factor: 'Calibration/Correction Factor',
  ratio: 'Ratio',
}

export interface PayTermSplit {
  offsetDays: number
  weightPct: number
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
  // erp_trailing_stat / erp_due_date_direct
  subsidiary?: string
  account?: string
  queryMethod?: string
  actualsHorizonWeeks?: number
  fallbackMethod?: string
  dueDateFieldRef?: string
  // dso / dpo
  avgDaysOutstanding?: number
  balanceSource?: string
  // pay_terms_distribution
  splits?: PayTermSplit[]
  // ml_suggested
  modelSourceNote?: string
  predictedValuesByPeriod?: Record<string, number>
  // calibration_factor
  multiplier?: number
  appliedTo?: string
  // ratio
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
  fields: DriverFields
  derivationLogic: string
  history: HistoryEntry[]
  updatedAt: string
  updatedBy: string
}

export type LineItemCategory = 'receipts' | 'disbursements'
export type LineItemKind = 'formula' | 'direct'

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

export interface CashFlowModel {
  id: string
  name: string
  fiscalYear: string
  description: string
  status: 'Published' | 'Draft'
  lineItemIds: string[]
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

export interface ForecastRow {
  id: string
  label: string
  kind: 'balance' | 'group' | 'child' | 'total'
  category?: LineItemCategory
  values: Record<string, { actual?: number; forecast?: number; scenario?: Record<string, number> }>
}

export interface Forecast {
  id: string
  name: string
  entity: string
  modelId: string
  periods: Period[]
  rows: ForecastRow[]
}
