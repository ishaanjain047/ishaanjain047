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
    case 'dso':
    case 'dpo':
      return `${f.avgDaysOutstanding ?? '—'} days`
    case 'pay_terms_distribution':
      return `${f.splits?.length ?? 0} splits`
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
  if (driver.type === 'erp_trailing_stat' || driver.type === 'erp_due_date_direct') {
    return driver.fields.account || '— Manual only'
  }
  return '— Manual only'
}
