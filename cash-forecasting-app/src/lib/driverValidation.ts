import type { DriverFields, DriverType, NetsuiteMapping } from './types'

export function validateDriverFields(type: DriverType, f: DriverFields, netsuiteMapping?: NetsuiteMapping | null): boolean {
  switch (type) {
    case 'manual_assumption':
      return f.value !== undefined && !Number.isNaN(f.value)
    case 'manual_series':
      return Object.keys(f.valuesByPeriod ?? {}).length > 0
    case 'plan_allocation':
      return !!f.rawTotalAmount && !!f.spreadAcross
    case 'erp_trailing_stat':
      return !!netsuiteMapping?.subsidiary && !!netsuiteMapping?.account && f.actualsHorizonWeeks !== undefined
    case 'erp_due_date_direct':
      return !!netsuiteMapping?.subsidiary && !!netsuiteMapping?.account && !!f.dueDateFieldRef
    case 'recurring':
      return !!f.payBasis && !!f.startPeriod && f.amount !== undefined && !Number.isNaN(f.amount)
    case 'dso':
    case 'dpo':
      return f.avgDaysOutstanding !== undefined && !!f.balanceSource
    case 'collection_curve':
      return !!f.sourceRef && (f.curveRows?.length ?? 0) > 0
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
