import type {
  CashFlowModel,
  Driver,
  Forecast,
  LineItem,
  Period,
  RowDef,
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
    fields: { sourceRef: 'colNA_cpInc', percentage: 1.5 },
    derivationLogic: 'Customer refunds modeled as a fixed percentage of the same-week CP Inc. (NA Collections) line item.',
    lastEditReason: 'Initial creation',
    history: [],
    updatedAt: '2026-05-18T15:10:00Z',
    updatedBy: 'Marco Diaz',
  },
]

// ---------------------------------------------------------------------------
// Line items — mirrors the ChargePoint Cash Flow Forecast workbook (Actuals +
// Forecast sheet) one-to-one: same entity names, same nesting, same order. Only the
// structure is pre-seeded — every leaf below is empty (em-dash) unless a driver has
// actually been wired to it, which is true for a handful of representative rows only.
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

function emptyLeaf(id: string, name: string, category: 'receipts' | 'disbursements'): LineItem {
  return {
    id,
    name,
    category,
    forecastMode: 'direct',
    formula: '',
    actualsMode: 'direct',
    actualsFormula: '',
    actuals: {},
    forecast: {},
    directValues: {},
  }
}

function wireFormula(item: LineItem, formula: string, base: number, amp: number, phase: number): LineItem {
  const { actuals, forecast } = buildActualsForecast(base, amp, phase)
  return { ...item, forecastMode: 'formula', formula, actualsMode: 'formula', actualsFormula: formula, actuals, forecast }
}

// Builds one full copy of the ChargePoint default line-item structure — names, nesting,
// and order exactly per the workbook, every leaf empty. Parameterized by an id prefix so
// every new model (Create Manually or Build with AI both converge on this, per spec
// Section 3) gets its own independent set of row/line-item ids rather than aliasing the
// single seeded ChargePoint model's records.
function buildRawDefaultStructure(): { rowLayout: RowDef[]; lineItems: LineItem[] } {
  const leaves: LineItem[] = [
  // --- RECEIPTS — Collections — North American entities ---
  emptyLeaf('colNA_cpInc', 'CP Inc.', 'receipts'),
  emptyLeaf('colNA_cpCanada', 'CP Canada Inc.', 'receipts'),
  emptyLeaf('colNA_cpMexico', 'CP Mexico S. de R.L. de C.V.', 'receipts'),
  emptyLeaf('colNA_eaton', 'Eaton', 'receipts'),
  // --- RECEIPTS — Collections — European (+India) entities ---
  emptyLeaf('colEU_cpIndia', 'CP Technologies India Pvt. Ltd', 'receipts'),
  emptyLeaf('colEU_cpAustria', 'CP Austria GmbH', 'receipts'),
  emptyLeaf('colEU_cpFranceSAS', 'CP Network (France) SAS', 'receipts'),
  emptyLeaf('colEU_cpGermany', 'CP Germany GmbH', 'receipts'),
  emptyLeaf('colEU_cpUK', 'CP Network (UK) Ltd', 'receipts'),
  emptyLeaf('colEU_cpNetherlands', 'CP Network (Netherlands) B.V.', 'receipts'),
  emptyLeaf('colEU_cpItaly', 'CP Italy S.r.l.', 'receipts'),
  emptyLeaf('colEU_cpSpain', 'CP Spain SL', 'receipts'),
  emptyLeaf('colEU_cpEuropeanHoldings', 'CP European Holdings B.V.', 'receipts'),
  // --- RECEIPTS — top-level detail lines ---
  emptyLeaf('customerRefunds', 'Customer Refunds', 'receipts'),
  emptyLeaf('cashSaleWebstore', 'Cash Sale – Webstore', 'receipts'),
  // --- RECEIPTS — Roaming Partner ---
  emptyLeaf('roam_cpInc', 'ChargePoint Inc.', 'receipts'),
  emptyLeaf('roam_cpCanada', 'ChargePoint Canada Inc.', 'receipts'),
  emptyLeaf('roam_cpNetherlands', 'ChargePoint Network (Netherlands) B.V.', 'receipts'),
  emptyLeaf('roam_cpAustria', 'ChargePoint Austria GmbH', 'receipts'),
  emptyLeaf('roam_roamingVendor', 'Roaming vendor', 'receipts'),
  // --- RECEIPTS — Drivers ---
  emptyLeaf('drv_driverFunds', 'Driver funds', 'receipts'),
  emptyLeaf('drv_flexBilling', 'Flex billing', 'receipts'),
  // --- RECEIPTS — ChargePoint Austria GmbH (standalone group, distinct from the two
  // ChargePoint/CP Austria entities above — see Section 1.5 ambiguity note) ---
  emptyLeaf('austriaGrp_driverFunds', 'Austria Driver funds', 'receipts'),
  emptyLeaf('austriaGrp_communityRefunds', 'Austria community refunds', 'receipts'),
  // --- RECEIPTS — top-level ---
  emptyLeaf('otherReceipts', 'Other', 'receipts'),

  // --- DISBURSEMENTS — Payroll ---
  emptyLeaf('payroll_cpInc', 'CP Inc.', 'disbursements'),
  emptyLeaf('payroll_cpCanada', 'CP Canada Inc.', 'disbursements'),
  emptyLeaf('payroll_cpMexico', 'CP Mexico S. de R.L. de C.V.', 'disbursements'),
  emptyLeaf('payroll_cpIndia', 'CP Technologies India Pvt. Ltd', 'disbursements'),
  emptyLeaf('payroll_cpAustria', 'CP Austria GmbH', 'disbursements'),
  emptyLeaf('payroll_cpFranceSAS', 'CP Network (France) SAS', 'disbursements'),
  emptyLeaf('payroll_cpGermany', 'CP Germany GmbH', 'disbursements'),
  emptyLeaf('payroll_cpUK', 'CP Network (UK) Ltd', 'disbursements'),
  emptyLeaf('payroll_cpNetherlands', 'CP Network (Netherlands) B.V.', 'disbursements'),
  emptyLeaf('payroll_cpItaly', 'CP Italy S.r.l.', 'disbursements'),
  emptyLeaf('payroll_cpSpain', 'CP Spain SL', 'disbursements'),
  emptyLeaf('payroll_severance', 'Severance', 'disbursements'),
  // --- DISBURSEMENTS — Operating, top-level ---
  emptyLeaf('accountsPayable', 'Accounts payable', 'disbursements'),
  emptyLeaf('contractManufacturerPayments', 'Contract manufacturer payments', 'disbursements'),
  emptyLeaf('inventoryPayments', 'Inventory payments', 'disbursements'),
  emptyLeaf('contractManufacturerSettlements', 'Contract Manufacturer settlements', 'disbursements'),
  emptyLeaf('taxPayments', 'Tax payments', 'disbursements'),
  emptyLeaf('otherExpenses', 'Other expenses', 'disbursements'),
  // --- DISBURSEMENTS — Other, top-level ---
  emptyLeaf('interestIncome', 'Interest income', 'disbursements'),
  emptyLeaf('atmSales', 'ATM Sales', 'disbursements'),
  emptyLeaf('ghgCredits', 'Greenhouse gas credits', 'disbursements'),
  emptyLeaf('tariffRefunds', 'Tariff refunds', 'disbursements'),
  emptyLeaf('interestPaymentsDebtFees', 'Interest payments/debt fees, etc', 'disbursements'),
  emptyLeaf('bankFees', 'Bank fees', 'disbursements'),
  emptyLeaf('debtPaydown', 'Debt paydown', 'disbursements'),
  emptyLeaf('debtAdditionsDraws', 'Debt additions/draws', 'disbursements'),
  emptyLeaf('fxEffects', 'FX effects', 'disbursements'),
  ]

  const leavesById = Object.fromEntries(leaves.map((li) => [li.id, li]))

  function leafRow(id: string, category: 'receipts' | 'disbursements', parentId?: string): RowDef {
    return { id, name: leavesById[id].name, kind: 'leaf', category, parentId, lineItemId: id }
  }

  const collectionsNA = ['colNA_cpInc', 'colNA_cpCanada', 'colNA_cpMexico', 'colNA_eaton']
  const collectionsEU = [
    'colEU_cpIndia', 'colEU_cpAustria', 'colEU_cpFranceSAS', 'colEU_cpGermany', 'colEU_cpUK',
    'colEU_cpNetherlands', 'colEU_cpItaly', 'colEU_cpSpain', 'colEU_cpEuropeanHoldings',
  ]
  const roamingPartner = ['roam_cpInc', 'roam_cpCanada', 'roam_cpNetherlands', 'roam_cpAustria', 'roam_roamingVendor']
  const driversGroup = ['drv_driverFunds', 'drv_flexBilling']
  const austriaGroup = ['austriaGrp_driverFunds', 'austriaGrp_communityRefunds']
  const payrollGroup = [
    'payroll_cpInc', 'payroll_cpCanada', 'payroll_cpMexico', 'payroll_cpIndia', 'payroll_cpAustria',
    'payroll_cpFranceSAS', 'payroll_cpGermany', 'payroll_cpUK', 'payroll_cpNetherlands', 'payroll_cpItaly',
    'payroll_cpSpain', 'payroll_severance',
  ]
  const operatingLeaves = [
    'accountsPayable', 'contractManufacturerPayments', 'inventoryPayments',
    'contractManufacturerSettlements', 'taxPayments', 'otherExpenses',
  ]
  const otherLeaves = [
    'interestIncome', 'atmSales', 'ghgCredits', 'tariffRefunds', 'interestPaymentsDebtFees',
    'bankFees', 'debtPaydown', 'debtAdditionsDraws', 'fxEffects',
  ]

  const rowLayout: RowDef[] = [
    // RECEIPTS
    { id: 'grpCollections', name: 'Collections', kind: 'group', category: 'receipts', sumIds: ['subtotalNACollections', 'subtotalEUCollections'] },
    ...collectionsNA.map((id) => leafRow(id, 'receipts', 'grpCollections')),
    { id: 'subtotalNACollections', name: 'Total North American Collections', kind: 'subtotal', category: 'receipts', parentId: 'grpCollections', sumIds: collectionsNA },
    ...collectionsEU.map((id) => leafRow(id, 'receipts', 'grpCollections')),
    { id: 'subtotalEUCollections', name: 'Total European Collections', kind: 'subtotal', category: 'receipts', parentId: 'grpCollections', sumIds: collectionsEU },
    leafRow('customerRefunds', 'receipts'),
    leafRow('cashSaleWebstore', 'receipts'),
    { id: 'grpRoamingPartner', name: 'Roaming Partner', kind: 'group', category: 'receipts', sumIds: roamingPartner },
    ...roamingPartner.map((id) => leafRow(id, 'receipts', 'grpRoamingPartner')),
    { id: 'grpDrivers', name: 'Drivers', kind: 'group', category: 'receipts', sumIds: driversGroup },
    ...driversGroup.map((id) => leafRow(id, 'receipts', 'grpDrivers')),
    { id: 'grpAustriaStandalone', name: 'ChargePoint Austria GmbH', kind: 'group', category: 'receipts', sumIds: austriaGroup },
    ...austriaGroup.map((id) => leafRow(id, 'receipts', 'grpAustriaStandalone')),
    leafRow('otherReceipts', 'receipts'),
    {
      id: 'totalReceipts',
      name: 'Total Receipts',
      kind: 'total',
      category: 'receipts',
      sumIds: ['grpCollections', 'customerRefunds', 'cashSaleWebstore', 'grpRoamingPartner', 'grpDrivers', 'grpAustriaStandalone', 'otherReceipts'],
    },

    // DISBURSEMENTS
    { id: 'grpPayroll', name: 'Payroll', kind: 'group', category: 'disbursements', sumIds: payrollGroup },
    ...payrollGroup.map((id) => leafRow(id, 'disbursements', 'grpPayroll')),
    ...operatingLeaves.map((id) => leafRow(id, 'disbursements')),
    {
      id: 'totalOperatingDisbursements',
      name: 'Total Operating Disbursements',
      kind: 'total',
      category: 'disbursements',
      sumIds: ['grpPayroll', ...operatingLeaves],
    },
    ...otherLeaves.map((id) => leafRow(id, 'disbursements')),
    { id: 'totalOther', name: 'Total Other', kind: 'total', category: 'disbursements', sumIds: otherLeaves },
    {
      id: 'netDisbursements',
      name: 'Net Disbursements',
      kind: 'total',
      category: 'disbursements',
      sumIds: ['totalOperatingDisbursements', 'totalOther'],
    },
  ]

  return { rowLayout, lineItems: leaves }
}

function prefixStructure(prefix: string, structure: { rowLayout: RowDef[]; lineItems: LineItem[] }): {
  rowLayout: RowDef[]
  lineItems: LineItem[]
} {
  if (!prefix) return structure
  const pid = (id: string) => `${prefix}${id}`
  return {
    lineItems: structure.lineItems.map((li) => ({ ...li, id: pid(li.id) })),
    rowLayout: structure.rowLayout.map((r) => ({
      ...r,
      id: pid(r.id),
      parentId: r.parentId ? pid(r.parentId) : undefined,
      sumIds: r.sumIds?.map(pid),
      lineItemId: r.lineItemId ? pid(r.lineItemId) : undefined,
    })),
  }
}

// Builds a fresh, independent copy of the default ChargePoint structure for a new model
// — used by both the Create Manually and Build with AI paths (Section 3: they converge
// on the exact same underlying Model/LineItem objects, just a different authoring UI).
export function buildDefaultStructure(prefix = ''): { rowLayout: RowDef[]; lineItems: LineItem[] } {
  return prefixStructure(prefix, buildRawDefaultStructure())
}

const seedStructure = buildDefaultStructure('')
const leavesById: Record<string, LineItem> = Object.fromEntries(seedStructure.lineItems.map((li) => [li.id, li]))

// Wire a handful of representative leaves to existing Driver Registry drivers, so the
// worksheet/forecast still demonstrate real formula + driver behavior. Every other leaf
// above ships intentionally empty per Section 1.6.
leavesById['colNA_cpInc'] = wireFormula(leavesById['colNA_cpInc'], 'erpTrailingStatNA', 2400000, 260000, 0)
leavesById['customerRefunds'] = wireFormula(leavesById['customerRefunds'], 'customerRefundsRatio', -36000, 4000, 2)
leavesById['payroll_cpInc'] = wireFormula(leavesById['payroll_cpInc'], 'payrollNARecurring', -545000, 5000, 0.3)
leavesById['accountsPayable'] = wireFormula(leavesById['accountsPayable'], '-(vendorTier1History * apTier1Calibration)', -812000, 60000, 0.8)
leavesById['otherReceipts'] = wireFormula(leavesById['otherReceipts'], 'planAllocationQ3', 100000, 8000, 1.2)

export const lineItems: LineItem[] = seedStructure.lineItems.map((li) => leavesById[li.id])
export const lineItemsById = Object.fromEntries(lineItems.map((li) => [li.id, li]))
export const driversById = Object.fromEntries(drivers.map((d) => [d.id, d]))

// Row layout — structure only (names, nesting, order). Values are computed at render
// time from lineItemsById via lib/rowEngine.ts, shared by the Model Worksheet and
// Forecast Detail pages so both surfaces render identically, per spec.
export const rowLayout: RowDef[] = seedStructure.rowLayout

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
    rowLayout,
    history: [
      {
        date: '2026-07-08T10:00:00Z',
        editor: 'Ishaan Jain',
        change: 'reordered',
        lineItemName: 'Full line-item structure',
        oldFormula: 'Placeholder prototype line items',
        newFormula: "ChargePoint Cash Flow Forecast workbook's Actuals + Forecast sheet structure, one-to-one",
      },
      {
        date: '2026-07-02T10:00:00Z',
        editor: 'Ishaan Jain',
        change: 'formula_changed',
        lineItemName: 'Accounts payable',
        oldFormula: 'vendorTier1History * 1.9',
        newFormula: '-(vendorTier1History * apTier1Calibration)',
      },
      {
        date: '2026-06-15T09:30:00Z',
        editor: 'Marco Diaz',
        change: 'line_item_added',
        lineItemName: 'Other',
      },
      {
        date: '2026-05-20T13:10:00Z',
        editor: 'Priya Nair',
        change: 'line_item_added',
        lineItemName: 'Customer Refunds',
      },
    ],
    updatedAt: '2026-07-08T10:00:00Z',
  },
  {
    id: 'emeaCashFlowModel',
    name: 'EMEA Cash Flow Model',
    fiscalYear: 'FY26-27',
    description: 'EMEA-only rolling forecast, mirrors the NA model structure with regional drivers.',
    status: 'Draft',
    rowLayout: [],
    history: [],
    updatedAt: '2026-06-10T09:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// Forecast (Hike Analysis) — row values are computed on demand from the model's
// rowLayout + lineItems via lib/rowEngine.ts; this record just identifies which model
// and entity the forecast overlays.
// ---------------------------------------------------------------------------

export const OPENING_BALANCE_START = 8400000

export const forecast: Forecast = {
  id: 'hikeAnalysis',
  name: 'Hike Analysis forecast',
  entity: 'ChargePoint Inc (Consolidated)',
  modelId: 'chargepointCashFlowModel',
  periods,
}
