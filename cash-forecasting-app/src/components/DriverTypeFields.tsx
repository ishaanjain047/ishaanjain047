import { Field, LabelCaps, PlusIcon, Select, TextArea, TextInput } from './ui'
import type { CurveRow, Driver, DriverFields, DriverType, LineItem, NetsuiteMapping } from '../lib/types'

const PERIOD_KEYS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']

function PeriodGrid({
  values,
  onChange,
  amberDot,
}: {
  values: Record<string, number>
  onChange: (v: Record<string, number>) => void
  amberDot?: boolean
}) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {PERIOD_KEYS.map((key, i) => (
        <div key={key} className="relative">
          {amberDot && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-text" />}
          <input
            type="number"
            value={values[key] ?? ''}
            onChange={(e) => onChange({ ...values, [key]: Number(e.target.value) })}
            placeholder={`W${i + 1}`}
            className="w-full rounded-input border border-border-input bg-white px-2 py-1.5 text-center text-xs tabular-nums focus:border-ink-primary focus:outline-none"
          />
        </div>
      ))}
    </div>
  )
}

export function defaultFrequencyForType(type: DriverType, fields: DriverFields): string {
  switch (type) {
    case 'manual_assumption':
      return fields.frequencySelect ?? 'Weekly'
    case 'manual_series':
      return 'Weekly'
    case 'plan_allocation':
      return `Quarterly, spread ÷ ${fields.spreadAcross ?? 12}`
    case 'erp_trailing_stat':
    case 'erp_due_date_direct':
      return 'Weekly'
    case 'recurring': {
      const basis = fields.payBasis ?? 'Weekly'
      const freq = fields.recurringFrequency && fields.recurringFrequency > 1 ? ` ×${fields.recurringFrequency}` : ''
      return `${basis}${freq}`
    }
    case 'dso':
    case 'dpo':
    case 'calibration_factor':
      return 'Monthly review'
    case 'collection_curve':
      return fields.calibrationSource === 'derived_from_history'
        ? `Weekly, calibration refreshed ${fields.refreshCadence ?? 'Monthly'}`
        : 'Weekly'
    case 'ml_suggested':
      return 'Weekly'
    case 'ratio':
      return 'Weekly'
    default:
      return 'Weekly'
  }
}

export function NetSuiteMappingFields({
  mapping,
  onChange,
}: {
  mapping: NetsuiteMapping
  onChange: (patch: Partial<NetsuiteMapping>) => void
}) {
  return (
    <div className="space-y-3 rounded-input border border-dashed border-border-input bg-page/50 p-4">
      <div className="flex items-baseline justify-between">
        <LabelCaps>NetSuite Mapping</LabelCaps>
        <span className="text-xs text-ink-muted">Optional, any driver type</span>
      </div>
      <p className="text-xs text-ink-secondary">
        If set, a real NetSuite transaction for this driver in a given period takes hard precedence over its
        declared forecast method for that period — never a blend.
      </p>
      <Field label="Subsidiary/Entity">
        <TextInput
          value={mapping.subsidiary ?? ''}
          onChange={(e) => onChange({ subsidiary: e.target.value || null })}
          placeholder="e.g. ChargePoint Inc (US)"
        />
      </Field>
      <Field label="Account/Record">
        <TextInput
          value={mapping.account ?? ''}
          onChange={(e) => onChange({ account: e.target.value || null })}
          placeholder="e.g. 1200 · Accounts Receivable"
        />
      </Field>
      <Field label="Query description">
        <TextInput
          value={mapping.queryDescription ?? ''}
          onChange={(e) => onChange({ queryDescription: e.target.value || null })}
          placeholder="e.g. SuiteQL: transactionline WHERE …"
        />
      </Field>
    </div>
  )
}

export function DriverTypeFields({
  type,
  fields,
  onChange,
  drivers,
  lineItems,
  excludeDriverId,
}: {
  type: DriverType
  fields: DriverFields
  onChange: (patch: DriverFields) => void
  drivers: Driver[]
  lineItems: LineItem[]
  excludeDriverId?: string
}) {
  const set = (patch: DriverFields) => onChange({ ...fields, ...patch })

  switch (type) {
    case 'manual_assumption':
      return (
        <>
          <Field
            label="Value"
            hint={
              fields.value !== undefined && Math.abs(fields.value) < 1
                ? 'Detected as a percentage (abs value < 1)'
                : undefined
            }
          >
            <TextInput
              type="number"
              step="any"
              value={fields.value ?? ''}
              onChange={(e) => set({ value: Number(e.target.value), isPercent: Math.abs(Number(e.target.value)) < 1 })}
              placeholder="e.g. 0.06 or 250000"
            />
          </Field>
          <Field label="Frequency">
            <Select
              value={fields.frequencySelect ?? 'Weekly'}
              onChange={(v) => set({ frequencySelect: v as DriverFields['frequencySelect'] })}
              options={[
                { value: 'Weekly', label: 'Weekly' },
                { value: 'Monthly review', label: 'Monthly review' },
                { value: 'Quarterly', label: 'Quarterly' },
                { value: 'One-time', label: 'One-time' },
              ]}
            />
          </Field>
        </>
      )

    case 'manual_series':
      return (
        <Field label="Values by period" hint="One value per visible period">
          <PeriodGrid values={fields.valuesByPeriod ?? {}} onChange={(v) => set({ valuesByPeriod: v })} />
        </Field>
      )

    case 'plan_allocation': {
      const raw = fields.rawTotalAmount ?? 0
      const spread = fields.spreadAcross ?? 1
      return (
        <>
          <Field label="Raw total amount">
            <TextInput
              type="number"
              value={fields.rawTotalAmount ?? ''}
              onChange={(e) => set({ rawTotalAmount: Number(e.target.value) })}
            />
          </Field>
          <Field
            label="Spread across"
            hint={`= ${(raw / (spread || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })} per period`}
          >
            <TextInput
              type="number"
              value={fields.spreadAcross ?? ''}
              onChange={(e) => set({ spreadAcross: Number(e.target.value) })}
              placeholder="periods"
            />
          </Field>
          <Field label="Source note">
            <TextInput
              value={fields.sourceNote ?? ''}
              onChange={(e) => set({ sourceNote: e.target.value })}
              placeholder="e.g. Plan of Record — Eve Werner"
            />
          </Field>
        </>
      )
    }

    case 'erp_trailing_stat':
      return (
        <>
          <p className="text-xs text-ink-secondary">
            NetSuite Subsidiary/Account are set in the NetSuite Mapping section below — required for this type.
          </p>
          <Field label="Actuals horizon (weeks)">
            <TextInput
              type="number"
              value={fields.actualsHorizonWeeks ?? ''}
              onChange={(e) => set({ actualsHorizonWeeks: Number(e.target.value) })}
            />
          </Field>
          <Field label="Fallback method beyond horizon">
            <TextInput
              value={fields.fallbackMethod ?? ''}
              onChange={(e) => set({ fallbackMethod: e.target.value })}
              placeholder="e.g. Trailing 12-week average"
            />
          </Field>
        </>
      )

    case 'erp_due_date_direct':
      return (
        <>
          <p className="text-xs text-ink-secondary">
            NetSuite Subsidiary/Account are set in the NetSuite Mapping section below — required for this type.
          </p>
          <Field label="Due-date field reference">
            <TextInput
              value={fields.dueDateFieldRef ?? ''}
              onChange={(e) => set({ dueDateFieldRef: e.target.value })}
              placeholder="e.g. duedate on open VendBill records"
            />
          </Field>
        </>
      )

    case 'recurring':
      return (
        <>
          <Field label="Pay Basis">
            <Select
              value={fields.payBasis ?? 'Monthly'}
              onChange={(v) => set({ payBasis: v as DriverFields['payBasis'] })}
              options={[
                { value: 'Monthly', label: 'Monthly' },
                { value: 'Weekly', label: 'Weekly' },
                { value: 'Quarterly', label: 'Quarterly' },
                { value: 'Annual', label: 'Annual' },
              ]}
            />
          </Field>
          <Field label="Start Period">
            <TextInput type="date" value={fields.startPeriod ?? ''} onChange={(e) => set({ startPeriod: e.target.value })} />
          </Field>
          <Field label="Recurring Frequency" hint="Interval count — 1 = every occurrence, 2 = every other">
            <TextInput
              type="number"
              min={1}
              value={fields.recurringFrequency ?? 1}
              onChange={(e) => set({ recurringFrequency: Number(e.target.value) })}
            />
          </Field>
          <Field label="Number of Occurrences">
            <div className="flex items-center gap-3">
              <TextInput
                type="number"
                disabled={fields.indefiniteOccurrences}
                value={fields.indefiniteOccurrences ? '' : fields.numberOfOccurrences ?? ''}
                onChange={(e) => set({ numberOfOccurrences: Number(e.target.value) })}
                className="disabled:bg-page disabled:text-ink-muted"
              />
              <label className="flex items-center gap-1.5 whitespace-nowrap text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  checked={!!fields.indefiniteOccurrences}
                  onChange={(e) => set({ indefiniteOccurrences: e.target.checked })}
                />
                Indefinite / until model end
              </label>
            </div>
          </Field>
          <Field label="Amount" hint="Fixed amount per occurrence">
            <TextInput type="number" value={fields.amount ?? ''} onChange={(e) => set({ amount: Number(e.target.value) })} />
          </Field>
        </>
      )

    case 'dso':
      return (
        <>
          <Field label="Average days outstanding">
            <TextInput
              type="number"
              value={fields.avgDaysOutstanding ?? ''}
              onChange={(e) => set({ avgDaysOutstanding: Number(e.target.value) })}
            />
          </Field>
          <Field label="Outstanding AR balance source">
            <TextInput value={fields.balanceSource ?? ''} onChange={(e) => set({ balanceSource: e.target.value })} />
          </Field>
        </>
      )

    case 'dpo':
      return (
        <>
          <Field label="Average days outstanding">
            <TextInput
              type="number"
              value={fields.avgDaysOutstanding ?? ''}
              onChange={(e) => set({ avgDaysOutstanding: Number(e.target.value) })}
            />
          </Field>
          <Field label="Outstanding AP balance source">
            <TextInput value={fields.balanceSource ?? ''} onChange={(e) => set({ balanceSource: e.target.value })} />
          </Field>
        </>
      )

    case 'collection_curve': {
      const rows = fields.curveRows ?? []
      const totalPct = rows.reduce((s, r) => s + (r.percentage || 0), 0)
      const updateRow = (i: number, patch: Partial<CurveRow>) => {
        const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
        set({ curveRows: next })
      }
      const referenceOptions = [
        { value: '', label: 'Select a driver or line item…' },
        ...drivers.filter((d) => d.id !== excludeDriverId).map((d) => ({ value: d.id, label: `Driver · ${d.name}` })),
        ...lineItems.map((li) => ({ value: li.id, label: `Line item · ${li.name}` })),
      ]
      return (
        <>
          <Field label="Source reference" hint="Typically a Billings driver — the series this curve reads from">
            <Select value={fields.sourceRef ?? ''} onChange={(v) => set({ sourceRef: v })} options={referenceOptions} />
          </Field>
          <Field label="Applicability window">
            <Select
              value={fields.applicabilityWindow ?? 'forecasted_only'}
              onChange={(v) => set({ applicabilityWindow: v as DriverFields['applicabilityWindow'] })}
              options={[
                { value: 'forecasted_only', label: 'Forecasted periods only (default)' },
                { value: 'all_periods', label: 'All periods' },
              ]}
            />
          </Field>
          <Field label="Curve">
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-1">
                    <span className="text-sm text-ink-secondary">Offset</span>
                    <TextInput
                      type="number"
                      value={r.offsetPeriods}
                      onChange={(e) => updateRow(i, { offsetPeriods: Number(e.target.value) })}
                    />
                    <span className="text-sm text-ink-secondary">periods</span>
                  </div>
                  <div className="flex flex-1 items-center gap-1">
                    <TextInput
                      type="number"
                      value={r.percentage}
                      onChange={(e) => updateRow(i, { percentage: Number(e.target.value) })}
                    />
                    <span className="text-sm text-ink-secondary">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => set({ curveRows: rows.filter((_, idx) => idx !== i) })}
                    className="text-ink-muted hover:text-red-text"
                    aria-label="Remove curve row"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set({ curveRows: [...rows, { offsetPeriods: rows.length, percentage: 0 }] })}
                className="flex items-center gap-1 text-sm font-medium text-ink-primary hover:underline"
              >
                <PlusIcon className="h-3.5 w-3.5" /> Add split
              </button>
              <p className={`text-xs ${totalPct > 100 ? 'text-red-text' : 'text-ink-secondary'}`}>
                Running sum: {totalPct}%
                {totalPct > 100 && ' — exceeds 100%'}
                {totalPct > 0 && totalPct < 100 && ` — remaining ${(100 - totalPct).toFixed(1)}% is implied bad-debt/write-off`}
              </p>
            </div>
          </Field>
          <Field label="Calibration source">
            <Select
              value={fields.calibrationSource ?? 'manual'}
              onChange={(v) => set({ calibrationSource: v as DriverFields['calibrationSource'] })}
              options={[
                { value: 'manual', label: 'Manual entry' },
                { value: 'derived_from_history', label: 'Derived from history' },
              ]}
            />
          </Field>
          {fields.calibrationSource === 'derived_from_history' && (
            <Field label="Refresh cadence">
              <Select
                value={fields.refreshCadence ?? 'Monthly'}
                onChange={(v) => set({ refreshCadence: v as DriverFields['refreshCadence'] })}
                options={[
                  { value: 'Monthly', label: 'Monthly' },
                  { value: 'Quarterly', label: 'Quarterly' },
                  { value: 'Manual trigger', label: 'Manual trigger' },
                ]}
              />
            </Field>
          )}
        </>
      )
    }

    case 'ml_suggested':
      return (
        <>
          <Field label="Model/source note">
            <TextInput
              value={fields.modelSourceNote ?? ''}
              onChange={(e) => set({ modelSourceNote: e.target.value })}
              placeholder="e.g. ML model, trained on 12mo Roaming actuals"
            />
          </Field>
          <Field label="Predicted values by period" hint="Amber dot marks ML suggestions — still editable">
            <PeriodGrid values={fields.predictedValuesByPeriod ?? {}} onChange={(v) => set({ predictedValuesByPeriod: v })} amberDot />
          </Field>
        </>
      )

    case 'calibration_factor':
      return (
        <>
          <Field label="Multiplier">
            <TextInput
              type="number"
              step="any"
              value={fields.multiplier ?? ''}
              onChange={(e) => set({ multiplier: Number(e.target.value) })}
            />
          </Field>
          <Field label="Applied to (target driver)">
            <Select
              value={fields.appliedTo ?? ''}
              onChange={(v) => set({ appliedTo: v })}
              options={[
                { value: '', label: 'Select a driver…' },
                ...drivers.filter((d) => d.id !== excludeDriverId).map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
          </Field>
        </>
      )

    case 'ratio':
      return (
        <>
          <Field label="Source reference">
            <Select
              value={fields.sourceRef ?? ''}
              onChange={(v) => set({ sourceRef: v })}
              options={[
                { value: '', label: 'Select a driver or line item…' },
                ...drivers.filter((d) => d.id !== excludeDriverId).map((d) => ({ value: d.id, label: `Driver · ${d.name}` })),
                ...lineItems.map((li) => ({ value: li.id, label: `Line item · ${li.name}` })),
              ]}
            />
          </Field>
          <Field label="Percentage">
            <TextInput type="number" step="any" value={fields.percentage ?? ''} onChange={(e) => set({ percentage: Number(e.target.value) })} />
          </Field>
        </>
      )

    default:
      return null
  }
}

export function DerivationFields({
  derivationLogic,
  onDerivationChange,
  reason,
  onReasonChange,
  reasonLabel = 'Reason for creating this driver',
}: {
  derivationLogic: string
  onDerivationChange: (v: string) => void
  reason: string
  onReasonChange: (v: string) => void
  reasonLabel?: string
}) {
  return (
    <>
      <Field label="Derivation logic">
        <TextArea rows={3} value={derivationLogic} onChange={(e) => onDerivationChange(e.target.value)} placeholder="Plain-language description of how this is derived" />
      </Field>
      <Field label={reasonLabel}>
        <TextInput value={reason} onChange={(e) => onReasonChange(e.target.value)} />
      </Field>
    </>
  )
}
