import { useRef, useState } from 'react'
import { Drawer, Field, PrimaryButton, SecondaryButton, Select, TextInput } from './ui'
import type { Driver, LineItem, LineItemCategory, LineItemKind, Period } from '../lib/types'
import { checkFormula, substituteNames } from '../lib/formula'

type Tab = 'forecast' | 'actuals'

function ModeToggle({ mode, onChange }: { mode: LineItemKind; onChange: (m: LineItemKind) => void }) {
  return (
    <div className="inline-flex rounded-full border border-border-subtle bg-border-subtle/60 p-0.5">
      {(['formula', 'direct'] as LineItemKind[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            mode === m ? 'bg-btn-primary-bg text-white' : 'text-ink-primary hover:bg-white/60'
          }`}
        >
          {m === 'formula' ? 'Formula' : 'Direct entry'}
        </button>
      ))}
    </div>
  )
}

function FormulaEditor({
  formula,
  onChange,
  chips,
  knownIds,
  idToName,
}: {
  formula: string
  onChange: (v: string) => void
  chips: { id: string; label: string }[]
  knownIds: Set<string>
  idToName: Record<string, string>
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const cursorRef = useRef(formula.length)

  function insertChip(id: string) {
    const pos = cursorRef.current ?? formula.length
    const next = formula.slice(0, pos) + id + formula.slice(pos)
    onChange(next)
    requestAnimationFrame(() => {
      ref.current?.focus()
      const newPos = pos + id.length
      ref.current?.setSelectionRange(newPos, newPos)
      cursorRef.current = newPos
    })
  }

  const result = checkFormula(formula, knownIds)

  return (
    <div className="space-y-2">
      <textarea
        ref={ref}
        rows={3}
        value={formula}
        onChange={(e) => onChange(e.target.value)}
        onSelect={(e) => {
          cursorRef.current = e.currentTarget.selectionStart
        }}
        className="w-full rounded-input border border-border-input bg-white px-3 py-2 font-mono text-sm focus:border-ink-primary focus:outline-none"
        placeholder="e.g. -(vendorTier1History * apTier1Calibration)"
      />
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => insertChip(c.id)}
            className="rounded-full bg-chip-neutral-bg px-2.5 py-1 text-xs font-medium text-chip-neutral hover:bg-chip-neutral-bg2"
          >
            {c.label}
          </button>
        ))}
      </div>
      {formula.trim() && (
        <p className="rounded-input bg-page px-3 py-2 font-mono text-xs text-ink-secondary">
          {substituteNames(formula, idToName)}
        </p>
      )}
      {formula.trim() && !result.valid && <p className="text-xs text-red-text">{result.error}</p>}
    </div>
  )
}

function PeriodDirectGrid({
  periods,
  values,
  onChange,
}: {
  periods: Period[]
  values: Record<string, number>
  onChange: (v: Record<string, number>) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {periods.map((p) => (
        <div key={p.key}>
          <div className="mb-1 text-center text-[10px] text-ink-muted">{p.label}</div>
          <input
            type="number"
            value={values[p.key] ?? ''}
            onChange={(e) => onChange({ ...values, [p.key]: Number(e.target.value) })}
            className="w-full rounded-input border border-border-input bg-white px-2 py-1.5 text-center text-xs tabular-nums focus:border-ink-primary focus:outline-none"
          />
        </div>
      ))}
    </div>
  )
}

export function LineItemDrawer({
  open,
  onClose,
  lineItem,
  defaultCategory,
  periods,
  drivers,
  otherLineItems,
  onSave,
}: {
  open: boolean
  onClose: () => void
  lineItem: LineItem | null
  defaultCategory: LineItemCategory
  periods: Period[]
  drivers: Driver[]
  otherLineItems: LineItem[]
  onSave: (patch: {
    name: string
    category: LineItemCategory
    forecastMode: LineItemKind
    formula: string
    directValues: Record<string, number>
    actualsMode: LineItemKind
    actualsFormula: string
    actuals: Record<string, number>
  }) => void
}) {
  const [name, setName] = useState(lineItem?.name ?? '')
  const [category, setCategory] = useState<LineItemCategory>(lineItem?.category ?? defaultCategory)
  const [tab, setTab] = useState<Tab>('forecast')
  const [forecastMode, setForecastMode] = useState<LineItemKind>(lineItem?.forecastMode ?? 'formula')
  const [formula, setFormula] = useState(lineItem?.formula ?? '')
  const [directValues, setDirectValues] = useState<Record<string, number>>(lineItem?.directValues ?? {})
  const [actualsMode, setActualsMode] = useState<LineItemKind>(lineItem?.actualsMode ?? 'formula')
  const [actualsFormula, setActualsFormula] = useState(lineItem?.actualsFormula ?? '')
  const [actualsValues, setActualsValues] = useState<Record<string, number>>(lineItem?.actuals ?? {})
  const [loadedId, setLoadedId] = useState<string | null>(lineItem?.id ?? 'new')

  const currentId = lineItem?.id ?? 'new'
  if (open && currentId !== loadedId) {
    setLoadedId(currentId)
    setName(lineItem?.name ?? '')
    setCategory(lineItem?.category ?? defaultCategory)
    setTab('forecast')
    setForecastMode(lineItem?.forecastMode ?? 'formula')
    setFormula(lineItem?.formula ?? '')
    setDirectValues(lineItem?.directValues ?? {})
    setActualsMode(lineItem?.actualsMode ?? 'formula')
    setActualsFormula(lineItem?.actualsFormula ?? '')
    setActualsValues(lineItem?.actuals ?? {})
  }

  const chips = [
    ...drivers.map((d) => ({ id: d.id, label: d.name })),
    ...otherLineItems.filter((li) => li.id !== lineItem?.id).map((li) => ({ id: li.id, label: li.name })),
  ]
  const knownIds = new Set(chips.map((c) => c.id))
  const idToName = Object.fromEntries(chips.map((c) => [c.id, c.label]))

  const openPeriods = periods.filter((p) => !p.isClosed)
  const closedPeriods = periods.filter((p) => p.isClosed)

  const forecastValid = forecastMode === 'direct' || checkFormula(formula, knownIds).valid
  const canSave = !!name.trim() && forecastValid

  function handleSave() {
    if (!canSave) return
    onSave({
      name: name.trim(),
      category,
      forecastMode,
      formula: forecastMode === 'formula' ? formula : '',
      directValues,
      actualsMode,
      actualsFormula: actualsMode === 'formula' ? actualsFormula : '',
      actuals: actualsValues,
    })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={lineItem ? `Edit ${lineItem.name}` : 'New line item'}
      widthClassName="w-[560px]"
      footer={
        <div className="flex justify-end gap-3">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSave} disabled={!canSave}>
            Save
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Line item name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AP Outflow — Tier-1 Vendors" />
        </Field>
        <Field label="Category">
          <Select
            value={category}
            onChange={(v) => setCategory(v as LineItemCategory)}
            options={[
              { value: 'receipts', label: 'Receipts' },
              { value: 'disbursements', label: 'Disbursements' },
            ]}
          />
        </Field>

        <div className="border-t border-border pt-4">
          <div className="mb-4 inline-flex rounded-full border border-border-subtle bg-border-subtle/60 p-0.5">
            {(['forecast', 'actuals'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
                  tab === t ? 'bg-btn-primary-bg text-white' : 'text-ink-primary hover:bg-white/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'forecast' ? (
            <div className="space-y-3">
              <ModeToggle mode={forecastMode} onChange={setForecastMode} />
              {forecastMode === 'formula' ? (
                <FormulaEditor formula={formula} onChange={setFormula} chips={chips} knownIds={knownIds} idToName={idToName} />
              ) : (
                <PeriodDirectGrid periods={openPeriods} values={directValues} onChange={setDirectValues} />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <ModeToggle mode={actualsMode} onChange={setActualsMode} />
              {actualsMode === 'formula' ? (
                <FormulaEditor
                  formula={actualsFormula}
                  onChange={setActualsFormula}
                  chips={chips}
                  knownIds={knownIds}
                  idToName={idToName}
                />
              ) : (
                <PeriodDirectGrid periods={closedPeriods} values={actualsValues} onChange={setActualsValues} />
              )}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  )
}
