import type { DriverFields, DriverType } from './types'

export function validateDriverFields(type: DriverType, f: DriverFields): boolean {
  switch (type) {
    case 'manual_assumption':
      return f.value !== undefined && !Number.isNaN(f.value)
    case 'manual_series':
      return Object.keys(f.valuesByPeriod ?? {}).length > 0
    case 'plan_allocation':
      return !!f.rawTotalAmount && !!f.spreadAcross
    case 'erp_trailing_stat':
      return !!f.subsidiary && !!f.account
    case 'erp_due_date_direct':
      return !!f.subsidiary && !!f.account
    case 'dso':
    case 'dpo':
      return f.avgDaysOutstanding !== undefined && !!f.balanceSource
    case 'pay_terms_distribution':
      return (f.splits?.length ?? 0) > 0
    case 'ml_suggested':
      return !!f.modelSourceNote
    case 'calibration_factor':
      return !!f.multiplier && !!f.appliedTo
    case 'ratio':
      return !!f.sourceRef && f.percentage !== undefined
    default:
      return false
  }
}
