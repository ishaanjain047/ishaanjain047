import type {
  CashFlowModel,
  Driver,
  Forecast,
  ForecastRow,
  LineItem,
  Period,
} from '../lib/types'

export const CURRENT_USER = 'Ishaan Jain'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function fmtWeekLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

const WEEK_COUNT = 12
const START_DATE = '2026-05-04'
const CLOSED_COUNT = 6
const PIVOT_INDEX = 6

export const periods: Period[] = Array.from({ length: WEEK_COUNT }, (_, i) => {
  const key = addDays(START_DATE, i * 7)
  const d = new Date(key + 'T00:00:00Z')
  return {
    key,
    label: fmtWeekLabel(key),
    monthLabel: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
    isClosed: i < CLOSED_COUNT,
    isPivot: i === PIVOT_INDEX,
  }
})

function wave(base: number, amplitude: number, i: number, phase = 0): number {
  return Math.round((base + amplitude * Math.sin(i * 0.7 + phase)) / 1000) * 1000
}

// ---------------------------------------------------------------------------
// Drivers — one instance per type (plus one extra manual_series feed driver)
// ---------------------------------------------------------------------------

export const drivers: Driver[] = [
  {
    id: 'vendorTier1History',
    name: 'Vendor Tier-1 History',
    type: 'manual_series',
    frequency: 'Weekly',
    netsuiteMapping: null,
    fields: {
      valuesByPeriod: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`P${i + 1}`, wave(360000, 40000, i, 1)])),
    },
    derivationLogic: 'Raw weekly Tier-1 vendor invoice total, entered manually from AP aging export until ERP feed is certified.',
    lastEditReason: 'Initial load from May AP aging export',
    history: [
      {
        date: '2026-05-06T09:12:00Z',
        editor: 'Priya Nair',
        field: 'valuesByPeriod',
        oldValue: '—',
        newValue: 'Series seeded',
        reason: 'Initial load from May AP aging export',
      },
    ],
    updatedAt: '2026-05-06T09:12:00Z',
    updatedBy: 'Priya Nair',
  },
  {
    id: 'billingsGrowthRate',
    name: 'Billings Growth Rate',
    type: 'manual_assumption',
    frequency: 'Monthly review',
    netsuiteMapping: null,
    fields: { value: 0.06, isPercent: true, frequencySelect: 'Monthly review' },
    derivationLogic: 'Blended MoM billings growth assumption used to scale the scenario overlay for Hike Analysis.',
    lastEditReason: 'Raised to match Q2 pricing hike guidance from Finance',
    history: [
      {
        date: '2026-06-01T14:02:00Z',
        editor: 'Ishaan Jain',
        field: 'value',
        oldValue: '0.04',
        newValue: '0.06',
        reason: 'Raised to match Q2 pricing hike guidance from Finance',
      },
    ],
    updatedAt: '2026-06-01T14:02:00Z',
    updatedBy: 'Ishaan Jain',
  },
  {
    id: 'marketingSpendPlan',
    name: 'Marketing Spend Plan',
    type: 'manual_series',
    frequency: 'Monthly review',
    netsuiteMapping: null,
    fields: {
      valuesByPeriod: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`P${i + 1}`, 90000 + i * 5000])),
    },
    derivationLogic: 'Direct entry of approved marketing spend by week, sourced from the marketing team plan.',
    lastEditReason: 'Initial creation',
    history: [],
    updatedAt: '2026-05-01T10:00:00Z',
    updatedBy: 'Marco Diaz',
  },
  {
    id: 'planAllocationQ3',
    name: 'Q3 Plan of Record Allocation',
    type: 'plan_allocation',
    frequency: 'Quarterly, spread ÷ 12',
    netsuiteMapping: null,
    fields: { rawTotalAmount: 1200000, spreadAcross: 12, sourceNote: 'Plan of Record — Eve Werner' },
    derivationLogic: 'Annual plan-of-record inflow allocation spread evenly across the 12-week rolling window.',
    lastEditReason: 'Initial creation',
    history: [],
    updatedAt: '2026-04-28T08:30:00Z',
    updatedBy: 'Eve Werner',
  },
  {
    id: 'erpTrailingStatNA',
    name: 'NA Collections — Trailing Stat',
    type: 'erp_trailing_stat',
    frequency: 'Weekly',
    netsuiteMapping: {
      subsidiary: 'ChargePoint Inc (US)',
      account: '1200 · Accounts Receivable',
      queryDescription: 'SuiteQL: transactionline WHERE accountingbook = 1 AND subsidiary = 1',
    },
    fields: {
      actualsHorizonWeeks: 8,
      fallbackMethod: 'Trailing 12-week average',
    },
    derivationLogic: 'Pulls actual NA collections from NetSuite for the actuals horizon, then falls back to a trailing average beyond it.',
    lastEditReason: 'Initial creation',
    history: [],
    updatedAt: '2026-05-15T16:45:00Z',
    updatedBy: 'Ishaan Jain',
  },
  {
    id: 'apOpenBillsDueDate',
    name: 'AP Open Bills — Due Date Direct',
    type: 'erp_due_date_direct',
    frequency: 'Weekly',
    netsuiteMapping: {
      subsidiary: 'ChargePoint Inc (US)',
      account: '2000 · Accounts Payable',
      queryDescription: 'Open vendor bills, due-date filter',
    },
    fields: {
      dueDateFieldRef: 'duedate on open VendBill records',
    },
    derivationLogic: 'Uses the due date on open vendor bills directly — no fallback needed since due dates are always known.',
    lastEditReason: 'Initial creation',
    history: [],
    updatedAt: '2026-05-12T11:20:00Z',
    updatedBy: 'Priya Nair',
  },
  {
    id: 'payrollNARecurring',
    name: 'Payroll — NA Recurring Schedule',
    type: 'recurring',
    frequency: 'Weekly ×2 (biweekly)',
    netsuiteMapping: null,
    fields: {
      payBasis: 'Weekly',
      startPeriod: '2026-05-08',
      recurringFrequency: 2,
      indefiniteOccurrences: true,
      numberOfOccurrences: undefined,
      amount: -545000,
    },
    derivationLogic:
      'Structured replacement for the hardcoded biweekly payroll pattern found in the legacy workbook (0, -3,675,722.93, 0, -3,675,722.93…) — Drivers Module spec Phase 2.',
    lastEditReason: 'Formalized from hardcoded biweekly schedule in legacy workbook',
    history: [
      {
        date: '2026-06-25T10:00:00Z',
        editor: 'Ishaan Jain',
        field: 'created',
        oldValue: '—',
        newValue: 'Driver created',
        reason: 'Formalized from hardcoded biweekly schedule in legacy workbook',
      },
    ],
    updatedAt: '2026-06-25T10:00:00Z',
    updatedBy: 'Ishaan Jain',
  },
  {
    id: 'naDSO',
    name: 'NA DSO',
    type: 'dso',
    frequency: 'Monthly review',
    netsuiteMapping: null,
    fields: { avgDaysOutstanding: 42, balanceSource: 'NA AR Aging (NetSuite saved search)' },
    derivationLogic: 'Average days sales outstanding used to project AR collection timing for NA.',
    lastEditReason: 'Initial creation',
    history: [],
    updatedAt: '2026-06-02T09:00:00Z',
    updatedBy: 'Priya Nair',
  },
  {
    id: 'naDPO',
    name: 'NA DPO',
    type: 'dpo',
    frequency: 'Monthly review',
    netsuiteMapping: null,
    fields: { avgDaysOutstanding: 55, balanceSource: 'NA AP Aging (NetSuite saved search)' },
    derivationLogic: 'Average days payable outstanding used to project AP disbursement timing for NA.',
    lastEditReason: 'Initial creation',
    history: [],
    updatedAt: '2026-06-02T09:05:00Z',
    updatedBy: 'Priya Nair',
  },
  {
    id: 'vendorPayTermsCurve',
    name: 'Vendor Pay-Terms Curve',
    type: 'collection_curve',
    frequency: 'Weekly, calibration reviewed quarterly',
    netsuiteMapping: null,
    fields: {
      sourceRef: 'vendorTier1History',
      applicabilityWindow: 'forecasted_only',
      curveRows: [
        { offsetPeriods: 0, percentage: 20 },
        { offsetPeriods: 4, percentage: 50 },
        { offsetPeriods: 8, percentage: 30 },
      ],
      calibrationSource: 'manual',
    },
    derivationLogic:
      'Contractual vendor payment terms modeled as a fixed, non-empirical curve over Vendor Tier-1 History: 20% due same week, 50% at +4 weeks, 30% at +8 weeks.',
    lastEditReason: 'Migrated from standalone Pay-Terms Distribution type into Collection Curve, per Drivers Module spec Section 4',
    history: [
      {
        date: '2026-04-20T13:00:00Z',
        editor: 'Marco Diaz',
        field: 'created',
        oldValue: '—',
        newValue: 'Driver created',
        reason: 'Distribution of vendor payment terms used to phase AP disbursement timing',
      },
      {
        date: '2026-07-04T09:00:00Z',
        editor: 'Ishaan Jain',
        field: 'type',
        oldValue: 'Pay-Terms Distribution',
        newValue: 'Collection Curve',
        reason: 'Migrated from standalone Pay-Terms Distribution type into Collection Curve, per Drivers Module spec Section 4',
      },
    ],
    updatedAt: '2026-07-04T09:00:00Z',
    updatedBy: 'Ishaan Jain',
  },
  {
    id: 'naCollectionsCurve',
    name: 'NA Collections Curve',
    type: 'collection_curve',
    frequency: 'Weekly, calibration refreshed monthly',
    netsuiteMapping: null,
    fields: {
      sourceRef: 'erpTrailingStatNA',
      applicabilityWindow: 'forecasted_only',
      curveRows: [
        { offsetPeriods: 0, percentage: 4 },
        { offsetPeriods: 1, percentage: 35 },
        { offsetPeriods: 2, percentage: 38 },
        { offsetPeriods: 3, percentage: 18 },
      ],
      calibrationSource: 'derived_from_history',
      refreshCadence: 'Monthly',
    },
    derivationLogic:
      'Bill-date-to-payment-date collection lag curve, derived from trailing NetSuite invoice/payment history joined via SuiteQL. The 5% remainder under 100% is implied bad-debt/write-off, not an error.',
    lastEditReason: 'Recalibrated from history against Q2 NetSuite invoice/payment data, replacing Aaron\'s initial 3–5% manual guess',
    history: [
      {
        date: '2026-05-01T10:00:00Z',
        editor: 'Aaron',
        field: 'calibrationSource',
        oldValue: 'manual (3–5% same-period guess)',
        newValue: 'manual (3–5% same-period guess)',
        reason: 'Initial rough estimate pending real collection-lag analysis',
      },
      {
        date: '2026-06-28T11:30:00Z',
        editor: 'Ishaan Jain',
        field: 'calibrationSource',
        oldValue: 'manual',
        newValue: 'derived_from_history',
        reason: "Recalibrated from history against Q2 NetSuite invoice/payment data, replacing Aaron's initial 3–5% manual guess",
      },
    ],
    updatedAt: '2026-06-28T11:30:00Z',
    updatedBy: 'Ishaan Jain',
  },
  {
    id: 'roamingRevenueML',
    name: 'Roaming Revenue ML Forecast',
    type: 'ml_suggested',
    frequency: 'Weekly',
    netsuiteMapping: null,
    fields: {
      modelSourceNote: 'ML model, trained on 12mo Roaming actuals',
      predictedValuesByPeriod: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`P${i + 1}`, wave(210000, 18000, i, 2)])),
    },
    derivationLogic: 'ML-suggested weekly Roaming revenue, overridable per period once reviewed by FP&A.',
    lastEditReason: 'Initial creation',
    history: [],
    updatedAt: '2026-06-20T07:00:00Z',
    updatedBy: 'ML Pipeline',
  },
  {
    id: 'apTier1Calibration',
    name: 'AP Tier-1 Calibration',
    type: 'calibration_factor',
    frequency: 'Monthly review',
    netsuiteMapping: null,
    fields: { multiplier: 2.2, appliedTo: 'vendorTier1History' },
    derivationLogic: 'Known May AP outflow / raw May projection',
    lastEditReason: 'May outflow came in higher than raw projection',
    history: [
      {
        date: '2026-06-03T11:40:00Z',
        editor: 'Ishaan Jain',
        field: 'multiplier',
        oldValue: '1.9',
        newValue: '2.2',
        reason: 'May outflow came in higher than raw projection',
      },
    ],
    updatedAt: '2026-06-03T11:40:00Z',
    updatedBy: 'Ishaan Jain',
  },
  {
    id: 'customerRefundsRatio',
    name: 'Customer Refunds % of Collections',
    type: 'ratio',
    frequency: 'Weekly',
    netsuiteMapping: null,
    fields: { sourceRef: 'totalCollectionsNA', percentage: 1.5 },
    derivationLogic: 'Customer refunds modeled as a fixed percentage of the same-week NA collections line item.',
    lastEditReason: 'Initial creation',
    history: [],
    updatedAt: '2026-05-18T15:10:00Z',
    updatedBy: 'Marco Diaz',
  },
]

// ---------------------------------------------------------------------------
// Line items
// ---------------------------------------------------------------------------

function buildActualsForecast(base: number, amp: number, phase: number) {
  const actuals: Record<string, number> = {}
  const forecast: Record<string, number> = {}
  periods.forEach((p, i) => {
    if (p.isClosed) {
      actuals[p.key] = wave(base, amp, i, phase)
      // the forecast that had originally been made for this now-closed week
      forecast[p.key] = wave(base, amp * 0.6, i, phase + 0.4)
    } else {
      forecast[p.key] = wave(base, amp, i, phase)
    }
  })
  return { actuals, forecast }
}

export const lineItems: LineItem[] = [
  (() => {
    const { actuals, forecast } = buildActualsForecast(2400000, 260000, 0)
    return {
      id: 'totalCollectionsNA',
      name: 'Total Collections — NA',
      category: 'receipts',
      forecastMode: 'formula',
      formula: 'erpTrailingStatNA',
      actualsMode: 'formula',
      actualsFormula: 'erpTrailingStatNA',
      actuals,
      forecast,
      directValues: {},
    } satisfies LineItem
  })(),
  (() => {
    const { actuals, forecast } = buildActualsForecast(100000, 8000, 1.2)
    return {
      id: 'planAllocationInflow',
      name: 'Plan of Record Inflow',
      category: 'receipts',
      forecastMode: 'formula',
      formula: 'planAllocationQ3',
      actualsMode: 'formula',
      actualsFormula: 'planAllocationQ3',
      actuals,
      forecast,
      directValues: {},
    } satisfies LineItem
  })(),
  (() => {
    const { actuals, forecast } = buildActualsForecast(-36000, 4000, 2)
    return {
      id: 'customerRefunds',
      name: 'Customer Refunds',
      category: 'disbursements',
      forecastMode: 'formula',
      formula: 'totalCollectionsNA * customerRefundsRatio',
      actualsMode: 'formula',
      actualsFormula: 'totalCollectionsNA * customerRefundsRatio',
      actuals,
      forecast,
      directValues: {},
    } satisfies LineItem
  })(),
  (() => {
    const { actuals, forecast } = buildActualsForecast(-812000, 60000, 0.8)
    return {
      id: 'apTier1Outflow',
      name: 'AP Outflow — Tier-1 Vendors',
      category: 'disbursements',
      forecastMode: 'formula',
      formula: '-(vendorTier1History * apTier1Calibration)',
      actualsMode: 'formula',
      actualsFormula: '-(vendorTier1History * apTier1Calibration)',
      actuals,
      forecast,
      directValues: {},
    } satisfies LineItem
  })(),
  {
    id: 'payrollNA',
    name: 'Payroll — NA',
    category: 'disbursements',
    forecastMode: 'formula',
    formula: 'payrollNARecurring',
    actualsMode: 'direct',
    actualsFormula: '',
    actuals: Object.fromEntries(periods.filter((p) => p.isClosed).map((p, i) => [p.key, i % 2 === 0 ? -540000 : -60000])),
    forecast: Object.fromEntries(periods.filter((p) => !p.isClosed).map((p, i) => [p.key, i % 2 === 0 ? -545000 : -62000])),
    directValues: {},
  },
]

export const lineItemsById = Object.fromEntries(lineItems.map((li) => [li.id, li]))
export const driversById = Object.fromEntries(drivers.map((d) => [d.id, d]))

// ---------------------------------------------------------------------------
// Cash Flow Models
// ---------------------------------------------------------------------------

export const models: CashFlowModel[] = [
  {
    id: 'chargepointCashFlowModel',
    name: 'ChargePoint Cash Flow Model',
    fiscalYear: 'FY26-27',
    description: 'Primary rolling 12-week operating cash flow model for the ChargePoint NA/EMEA consolidated entity.',
    status: 'Published',
    lineItemIds: lineItems.map((li) => li.id),
    history: [
      {
        date: '2026-07-02T10:00:00Z',
        editor: 'Ishaan Jain',
        change: 'formula_changed',
        lineItemName: 'AP Outflow — Tier-1 Vendors',
        oldFormula: 'vendorTier1History * 1.9',
        newFormula: '-(vendorTier1History * apTier1Calibration)',
      },
      {
        date: '2026-06-15T09:30:00Z',
        editor: 'Marco Diaz',
        change: 'line_item_added',
        lineItemName: 'Plan of Record Inflow',
      },
      {
        date: '2026-05-20T13:10:00Z',
        editor: 'Priya Nair',
        change: 'line_item_added',
        lineItemName: 'Customer Refunds',
      },
    ],
    updatedAt: '2026-07-02T10:00:00Z',
  },
  {
    id: 'emeaCashFlowModel',
    name: 'EMEA Cash Flow Model',
    fiscalYear: 'FY26-27',
    description: 'EMEA-only rolling forecast, mirrors the NA model structure with regional drivers.',
    status: 'Draft',
    lineItemIds: [],
    history: [],
    updatedAt: '2026-06-10T09:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// Forecast (Hike Analysis)
// ---------------------------------------------------------------------------

const OPENING_BALANCE_START = 8400000

function scenarioMultiplier(scenario: 'base' | 'bull' | 'bear', category: 'receipts' | 'disbursements') {
  if (scenario === 'base') return 1
  if (category === 'receipts') return scenario === 'bull' ? 1.06 : 0.94
  return scenario === 'bull' ? 0.97 : 1.03
}

function buildForecastRows(): ForecastRow[] {
  const inflowItems = lineItems.filter((li) => li.category === 'receipts')
  const outflowItems = lineItems.filter((li) => li.category === 'disbursements')

  const valueFor = (li: LineItem, p: Period) => {
    if (p.isClosed) return { actual: li.actuals[p.key], forecast: li.forecast[p.key] }
    const base = li.forecastMode === 'direct' ? li.directValues[p.key] : li.forecast[p.key]
    const scenario: Record<string, number> = {}
    ;(['base', 'bull', 'bear'] as const).forEach((s) => {
      scenario[s] = Math.round(base * scenarioMultiplier(s, li.category))
    })
    return { forecast: base, scenario }
  }

  const childRow = (li: LineItem): ForecastRow => ({
    id: li.id,
    label: li.name,
    kind: 'child',
    category: li.category,
    values: Object.fromEntries(periods.map((p) => [p.key, valueFor(li, p)])),
  })

  const sumRow = (id: string, label: string, items: LineItem[], category?: LineItemCategoryLocal): ForecastRow => ({
    id,
    label,
    kind: 'total',
    category,
    values: Object.fromEntries(
      periods.map((p) => {
        let actual: number | undefined = p.isClosed ? 0 : undefined
        let forecast = 0
        const scenario: Record<string, number> = { base: 0, bull: 0, bear: 0 }
        items.forEach((li) => {
          const v = valueFor(li, p)
          if (p.isClosed) {
            actual = (actual ?? 0) + (v.actual ?? 0)
            forecast += v.forecast ?? 0
          } else {
            forecast += v.forecast ?? 0
            ;(['base', 'bull', 'bear'] as const).forEach((s) => {
              scenario[s] += v.scenario?.[s] ?? 0
            })
          }
        })
        return [p.key, p.isClosed ? { actual, forecast } : { forecast, scenario }]
      }),
    ),
  })

  type LineItemCategoryLocal = 'receipts' | 'disbursements'

  const inflowsGroup: ForecastRow = { id: 'inflowsGroup', label: 'Cash Inflows', kind: 'group', category: 'receipts', values: {} }
  const inflowsTotal = sumRow('inflowsTotal', 'Total Cash Inflows', inflowItems, 'receipts')
  const outflowsGroup: ForecastRow = { id: 'outflowsGroup', label: 'Cash Outflows', kind: 'group', category: 'disbursements', values: {} }
  const outflowsTotal = sumRow('outflowsTotal', 'Total Cash Outflows', outflowItems, 'disbursements')

  const netMovement: ForecastRow = {
    id: 'netMovement',
    label: 'Net Movement',
    kind: 'total',
    values: Object.fromEntries(
      periods.map((p) => {
        const inf = inflowsTotal.values[p.key]
        const out = outflowsTotal.values[p.key]
        if (p.isClosed) {
          return [p.key, { actual: (inf.actual ?? 0) + (out.actual ?? 0), forecast: (inf.forecast ?? 0) + (out.forecast ?? 0) }]
        }
        const scenario: Record<string, number> = {}
        ;(['base', 'bull', 'bear'] as const).forEach((s) => {
          scenario[s] = (inf.scenario?.[s] ?? 0) + (out.scenario?.[s] ?? 0)
        })
        return [p.key, { forecast: (inf.forecast ?? 0) + (out.forecast ?? 0), scenario }]
      }),
    ),
  }

  const openingBalance: ForecastRow = { id: 'openingBalance', label: 'Opening Balance', kind: 'balance', values: {} }
  const endingBalance: ForecastRow = { id: 'endingBalance', label: 'Ending Balance', kind: 'balance', values: {} }

  let runningActual = OPENING_BALANCE_START
  let runningForecast = OPENING_BALANCE_START
  const runningScenario: Record<string, number> = { base: OPENING_BALANCE_START, bull: OPENING_BALANCE_START, bear: OPENING_BALANCE_START }

  periods.forEach((p) => {
    if (p.isClosed) {
      openingBalance.values[p.key] = { actual: runningActual, forecast: runningForecast }
      const net = netMovement.values[p.key]
      runningActual += net.actual ?? 0
      runningForecast += net.forecast ?? 0
      endingBalance.values[p.key] = { actual: runningActual, forecast: runningForecast }
      runningScenario.base = runningActual
      runningScenario.bull = runningActual
      runningScenario.bear = runningActual
    } else {
      openingBalance.values[p.key] = { forecast: runningScenario.base, scenario: { ...runningScenario } }
      const net = netMovement.values[p.key]
      ;(['base', 'bull', 'bear'] as const).forEach((s) => {
        runningScenario[s] += net.scenario?.[s] ?? 0
      })
      runningForecast += net.forecast ?? 0
      endingBalance.values[p.key] = { forecast: runningForecast, scenario: { ...runningScenario } }
    }
  })

  return [
    openingBalance,
    inflowsGroup,
    ...inflowItems.map(childRow),
    inflowsTotal,
    outflowsGroup,
    ...outflowItems.map(childRow),
    outflowsTotal,
    netMovement,
    endingBalance,
  ]
}

export const forecast: Forecast = {
  id: 'hikeAnalysis',
  name: 'Hike Analysis forecast',
  entity: 'ChargePoint Inc (Consolidated)',
  modelId: 'chargepointCashFlowModel',
  periods,
  rows: buildForecastRows(),
}
