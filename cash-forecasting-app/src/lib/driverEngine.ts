import { formatMoney } from './format'
import type { Driver, DriverFields, PayBasis } from './types'

// Mock evaluation engine for the Driver Registry's 13-Week Preview. This models, at
// small scale, the same shape described in the Drivers Module spec's evaluation-engine
// section: every type resolves one period independently except Collection Curve, which
// reads a lookback window of its source reference driver's own series (Section 7).

export const PREVIEW_WEEK_COUNT = 13

function mondayOnOrAfter(d: Date): Date {
  const day = d.getDay() // 0 = Sunday, 1 = Monday, ...
  const delta = (8 - day) % 7
  const monday = new Date(d)
  monday.setDate(monday.getDate() + delta)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function previewAnchor(): Date {
  return mondayOnOrAfter(new Date())
}

export function weekIndexToDate(weekIndex: number): Date {
  const d = new Date(previewAnchor())
  d.setDate(d.getDate() + (weekIndex - 1) * 7)
  return d
}

export function weekIndexLabel(weekIndex: number): string {
  const d = weekIndexToDate(weekIndex)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function shortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function wavePreview(base: number, amplitude: number, i: number, phase = 0): number {
  return Math.round((base + amplitude * Math.sin(i * 0.7 + phase)) / 1000) * 1000
}

function addPayBasisUnits(start: Date, basis: PayBasis, n: number): Date {
  const d = new Date(start)
  if (basis === 'Weekly') d.setDate(d.getDate() + 7 * n)
  else if (basis === 'Monthly') d.setMonth(d.getMonth() + n)
  else if (basis === 'Quarterly') d.setMonth(d.getMonth() + 3 * n)
  else if (basis === 'Annual') d.setFullYear(d.getFullYear() + n)
  return d
}

function recurringOccurrenceInWeek(fields: DriverFields, weekIndex: number): Date | null {
  if (!fields.startPeriod || !fields.payBasis) return null
  const weekStart = weekIndexToDate(weekIndex)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const start = new Date(fields.startPeriod + 'T00:00:00')
  const freq = Math.max(1, fields.recurringFrequency || 1)
  const maxOcc = fields.indefiniteOccurrences ? Infinity : fields.numberOfOccurrences ?? 0
  for (let k = 0; k < 400 && k < maxOcc; k++) {
    const occDate = addPayBasisUnits(start, fields.payBasis, k * freq)
    if (occDate.getTime() > weekEnd.getTime()) break
    if (occDate.getTime() >= weekStart.getTime()) return occDate
  }
  return null
}

export interface EvalResult {
  value: number | undefined
  note: string
}

export function evaluateDriverAt(
  driver: Driver,
  weekIndex: number,
  driversById: Record<string, Driver>,
  depth = 0,
): EvalResult {
  if (depth > 25) return { value: undefined, note: 'Circular reference detected' }
  const f = driver.fields

  switch (driver.type) {
    case 'manual_assumption':
      return { value: f.value ?? 0, note: 'Manual assumption — fixed value every period' }

    case 'manual_series': {
      const key = `P${weekIndex}`
      const v = f.valuesByPeriod?.[key]
      return v === undefined
        ? { value: undefined, note: 'No manually entered value for this period' }
        : { value: v, note: `Manually entered for period ${weekIndex}` }
    }

    case 'plan_allocation': {
      const spread = f.spreadAcross ?? 0
      if (weekIndex < 1 || weekIndex > spread) {
        return { value: undefined, note: `Outside the ${spread}-period allocation window` }
      }
      const per = (f.rawTotalAmount ?? 0) / (spread || 1)
      return { value: per, note: `${formatMoney(f.rawTotalAmount)} spread over ${spread} periods` }
    }

    case 'erp_trailing_stat': {
      const horizon = f.actualsHorizonWeeks ?? 8
      if (weekIndex <= horizon) {
        const txCount = 3 + (weekIndex % 5)
        return { value: wavePreview(240000, 26000, weekIndex), note: `Sourced from NetSuite, ${txCount} transactions` }
      }
      return { value: wavePreview(240000, 10000, weekIndex, 1), note: f.fallbackMethod || 'Trailing average fallback' }
    }

    case 'erp_due_date_direct': {
      const txCount = 2 + (weekIndex % 4)
      return { value: wavePreview(90000, 12000, weekIndex, 0.5), note: `Sourced from NetSuite, ${txCount} transactions` }
    }

    case 'recurring': {
      const occ = recurringOccurrenceInWeek(f, weekIndex)
      if (!occ) return { value: 0, note: 'No occurrence this week' }
      return { value: f.amount ?? 0, note: `Occurrence on ${shortDate(occ)}` }
    }

    case 'dso':
    case 'dpo':
      return {
        value: f.avgDaysOutstanding ?? 0,
        note: `${f.avgDaysOutstanding ?? '—'}-day assumption, applied to ${f.balanceSource || 'the referenced balance'}`,
      }

    case 'collection_curve': {
      const source = f.sourceRef ? driversById[f.sourceRef] : undefined
      if (!source) return { value: undefined, note: 'No source reference selected' }
      const rows = f.curveRows ?? []
      if (rows.length === 0) return { value: undefined, note: 'No curve rows defined yet' }

      let total = 0
      let anyDefined = false
      const parts: string[] = []
      rows.forEach((r) => {
        const srcIdx = weekIndex - r.offsetPeriods
        const srcResult = evaluateDriverAt(source, srcIdx, driversById, depth + 1)
        if (srcResult.value !== undefined) {
          anyDefined = true
          const contribution = srcResult.value * (r.percentage / 100)
          total += contribution
          const label = r.offsetPeriods === 0 ? 'same-week' : `from Week ${srcIdx}`
          parts.push(`${formatMoney(contribution)} ${label}`)
        }
      })
      if (!anyDefined) return { value: undefined, note: 'Source driver has no values for these periods yet' }
      return { value: total, note: `Week ${weekIndex}: ${parts.join(' + ')}` }
    }

    case 'ml_suggested': {
      const key = `P${weekIndex}`
      const v = f.predictedValuesByPeriod?.[key]
      return v === undefined
        ? { value: undefined, note: 'No ML-suggested value for this period' }
        : { value: v, note: 'ML-suggested value (editable override)' }
    }

    case 'calibration_factor': {
      const target = f.appliedTo ? driversById[f.appliedTo] : undefined
      if (!target) return { value: undefined, note: 'No target driver selected' }
      const base = evaluateDriverAt(target, weekIndex, driversById, depth + 1)
      if (base.value === undefined) return { value: undefined, note: 'Target driver has no value for this period yet' }
      return { value: base.value * (f.multiplier ?? 1), note: `${target.name} × ${f.multiplier ?? 1}` }
    }

    case 'ratio': {
      const source = f.sourceRef ? driversById[f.sourceRef] : undefined
      if (!source) return { value: undefined, note: 'Source reference is not a driver — preview unavailable standalone' }
      const base = evaluateDriverAt(source, weekIndex, driversById, depth + 1)
      if (base.value === undefined) return { value: undefined, note: 'Source driver has no value for this period yet' }
      return { value: (base.value * (f.percentage ?? 0)) / 100, note: `${f.percentage ?? 0}% of ${source.name}` }
    }

    default:
      return { value: undefined, note: '—' }
  }
}

export interface DriverPreview {
  weeks: { index: number; label: string; value: number | undefined; note: string }[]
  applicabilityLabel?: string
  emptyMessage?: string
}

function applicabilityLabelFor(driver: Driver): string | undefined {
  const mapped = !!(driver.netsuiteMapping?.account || driver.netsuiteMapping?.subsidiary)
  if (driver.type === 'erp_due_date_direct') {
    return 'All weeks use live NetSuite data (due-date direct — no fallback needed).'
  }
  if (driver.type === 'erp_trailing_stat') {
    const horizon = driver.fields.actualsHorizonWeeks ?? 8
    const fallback = driver.fields.fallbackMethod || 'declared forecast method'
    return `Weeks 1–${horizon} use live NetSuite data. Weeks ${horizon + 1}–${PREVIEW_WEEK_COUNT} use ${fallback}.`
  }
  if (mapped) {
    return 'Weeks with a matching NetSuite transaction use live data; others fall back to the declared forecast method.'
  }
  return undefined
}

export function computeDriverPreview(
  driver: Driver,
  driversById: Record<string, Driver>,
): DriverPreview {
  if (driver.type === 'collection_curve') {
    const source = driver.fields.sourceRef ? driversById[driver.fields.sourceRef] : undefined
    if (!source) {
      return { weeks: [], emptyMessage: 'Select a source reference to preview this curve.' }
    }
    const hasAnySourceValue = Array.from({ length: PREVIEW_WEEK_COUNT }, (_, i) => i + 1).some(
      (wk) => evaluateDriverAt(source, wk, driversById).value !== undefined,
    )
    if (!hasAnySourceValue) {
      return { weeks: [], emptyMessage: 'Source driver has no values for these periods yet.' }
    }
  }

  const weeks = Array.from({ length: PREVIEW_WEEK_COUNT }, (_, i) => {
    const index = i + 1
    const { value, note } = evaluateDriverAt(driver, index, driversById)
    return { index, label: weekIndexLabel(index), value, note }
  })

  return { weeks, applicabilityLabel: applicabilityLabelFor(driver) }
}
