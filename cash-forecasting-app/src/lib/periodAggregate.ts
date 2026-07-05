import type { Period } from './types'

export type ViewMode = 'week' | 'month'

export interface DisplayColumn {
  key: string
  label: string
  periodKeys: string[]
  isClosed: boolean
  isPivot: boolean
}

export function buildColumns(periods: Period[], mode: ViewMode): DisplayColumn[] {
  if (mode === 'week') {
    return periods.map((p) => ({ key: p.key, label: p.label, periodKeys: [p.key], isClosed: p.isClosed, isPivot: p.isPivot }))
  }
  const order: string[] = []
  const byMonth = new Map<string, Period[]>()
  periods.forEach((p) => {
    if (!byMonth.has(p.monthLabel)) {
      byMonth.set(p.monthLabel, [])
      order.push(p.monthLabel)
    }
    byMonth.get(p.monthLabel)!.push(p)
  })
  return order.map((label) => {
    const group = byMonth.get(label)!
    return {
      key: label,
      label,
      periodKeys: group.map((p) => p.key),
      isClosed: group.every((p) => p.isClosed),
      isPivot: group.some((p) => p.isPivot),
    }
  })
}

export function sumByColumn(values: Record<string, number | undefined>, column: DisplayColumn): number | undefined {
  const nums = column.periodKeys.map((k) => values[k]).filter((v): v is number => v !== undefined)
  if (nums.length === 0) return undefined
  return nums.reduce((a, b) => a + b, 0)
}
