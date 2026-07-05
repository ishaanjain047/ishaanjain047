import { Field, PlusIcon, Select, TextArea, TextInput } from './ui'
import type { Driver, DriverFields, DriverType, LineItem, PayTermSplit } from '../lib/types'

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
    case 'dso':
    case 'dpo':
    case 'calibration_factor':
    case 'pay_terms_distribution':
      return 'Monthly review'
    case 'ml_suggested':
      return 'Weekly'
    case 'ratio':
      return 'Weekly'
    default:
      return 'Weekly'
  }
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
          <Field label="NetSuite Subsidiary/Entity">
            <TextInput value={fields.subsidiary ?? ''} onChange={(e) => set({ subsidiary: e.target.value })} />
          </Field>
          <Field label="NetSuite Account/Record">
            <TextInput value={fields.account ?? ''} onChange={(e) => set({ account: e.target.value })} />
          </Field>
          <Field label="Query/Extraction method">
            <TextInput
              value={fields.queryMethod ?? ''}
              onChange={(e) => set({ queryMethod: e.target.value })}
              placeholder="e.g. SuiteQL: transactionline WHERE …"
            />
          </Field>
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
          <Field label="NetSuite Subsidiary/Entity">
            <TextInput value={fields.subsidiary ?? ''} onChange={(e) => set({ subsidiary: e.target.value })} />
          </Field>
          <Field label="NetSuite Account/Record">
            <TextInput value={fields.account ?? ''} onChange={(e) => set({ account: e.target.value })} />
          </Field>
          <Field label="Due-date field reference">
            <TextInput
              value={fields.dueDateFieldRef ?? ''}
              onChange={(e) => set({ dueDateFieldRef: e.target.value })}
              placeholder="e.g. duedate on open VendBill records"
            />
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

    case 'pay_terms_distribution': {
      const splits = fields.splits ?? []
      const totalWeight = splits.reduce((s, sp) => s + (sp.weightPct || 0), 0)
      const updateSplit = (i: number, patch: Partial<PayTermSplit>) => {
        const next = splits.map((sp, idx) => (idx === i ? { ...sp, ...patch } : sp))
        set({ splits: next })
      }
      return (
        <Field label="Offset-day weights">
          <div className="space-y-2">
            {splits.map((sp, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-1">
                  <span className="text-sm text-ink-secondary">+</span>
                  <TextInput
                    type="number"
                    value={sp.offsetDays}
                    onChange={(e) => updateSplit(i, { offsetDays: Number(e.target.value) })}
                  />
                  <span className="text-sm text-ink-secondary">days</span>
                </div>
                <div className="flex flex-1 items-center gap-1">
                  <TextInput
                    type="number"
                    value={sp.weightPct}
                    onChange={(e) => updateSplit(i, { weightPct: Number(e.target.value) })}
                  />
                  <span className="text-sm text-ink-secondary">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => set({ splits: splits.filter((_, idx) => idx !== i) })}
                  className="text-ink-muted hover:text-red-text"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set({ splits: [...splits, { offsetDays: 0, weightPct: 0 }] })}
              className="flex items-center gap-1 text-sm font-medium text-ink-primary hover:underline"
            >
              <PlusIcon className="h-3.5 w-3.5" /> Add split
            </button>
            <p className={`text-xs ${totalWeight === 100 ? 'text-green-text' : 'text-red-text'}`}>
              Weights sum to {totalWeight}% {totalWeight === 100 ? '✓' : '— must total 100%'}
            </p>
          </div>
        </Field>
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
