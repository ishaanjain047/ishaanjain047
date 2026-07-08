import type { Driver, DriverFamily } from './types'
import { DRIVER_FAMILY } from './types'
import { formatMoney } from './format'

export const FAMILY_COLORS: Record<DriverFamily, { bg: string; text: string; label: string }> = {
  manual: { bg: '#F7F7F7', text: '#424242', label: 'Manual' },
  erp: { bg: '#E2F9E8', text: '#34744B', label: 'ERP-sourced' },
  statistical: { bg: '#D6E8FD', text: '#356FE7', label: 'Statistical' },
  ml: { bg: '#FCF1CC', text: '#CE6F2A', label: 'ML' },
}

export function familyOf(driver: Driver): DriverFamily {
  return DRIVER_FAMILY[driver.type]
}

export function currentValueDisplay(driver: Driver): string {
  const f = driver.fields
  switch (driver.type) {
    case 'manual_assumption':
      return f.isPercent ? `${((f.value ?? 0) * 100).toFixed(1)}%` : formatMoney(f.value)
    case 'manual_series':
      return 'Series'
    case 'plan_allocation':
      return formatMoney(f.rawTotalAmount)
    case 'erp_trailing_stat':
    case 'erp_due_date_direct':
      return 'Series'
    case 'recurring': {
      const basis = f.payBasis ?? 'Weekly'
      const freq = f.recurringFrequency && f.recurringFrequency > 1 ? ` ×${f.recurringFrequency}` : ''
      return `${formatMoney(f.amount)} / ${basis}${freq}`
    }
    case 'dso':
    case 'dpo':
      return `${f.avgDaysOutstanding ?? '—'} days`
    case 'collection_curve': {
      const rows = f.curveRows ?? []
      const sum = rows.reduce((s, r) => s + (r.percentage || 0), 0)
      return rows.length === 0 ? '—' : `${rows.length} pts, ${sum}%`
    }
    case 'ml_suggested':
      return 'Series'
    case 'calibration_factor':
      return `×${f.multiplier ?? '—'}`
    case 'ratio':
      return `${f.percentage ?? '—'}%`
    default:
      return '—'
  }
}

export function netsuiteMappingDisplay(driver: Driver): string {
  return driver.netsuiteMapping?.account || '— Manual only'
}
