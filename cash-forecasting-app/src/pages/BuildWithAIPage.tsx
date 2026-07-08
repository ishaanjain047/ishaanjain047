import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineItemDrawer } from '../components/LineItemDrawer'
import { RowLine, RowTableBody, RowTableHeader, SectionBanner } from '../components/RowTable'
import { Card, Field, LabelCaps, PrimaryButton, SecondaryButton, Select, SegmentedControl, TextArea, TextInput } from '../components/ui'
import { periods as allPeriods, OPENING_BALANCE_START } from '../data/seed'
import { formatMoney } from '../lib/format'
import { inferCategory, parsePercentOfPrompt } from '../lib/nlpDriverProposal'
import { buildColumns, type ViewMode } from '../lib/periodAggregate'
import { aggregateForColumn, aggregateSnapshotForColumn, computeBalanceChain, computeRowValues, type CellValue } from '../lib/rowEngine'
import { useStore } from '../lib/store'
import type { LineItemCategory, LineItemKind, RowDef } from '../lib/types'

type Phase = 'prompt' | 'setup' | 'canvas'
type ProposalStep = 'definition' | 'values' | 'formula'

interface ProposalState {
  step: ProposalStep
  lineItemName: string
  category: LineItemCategory
  baseDriverName: string
  curveDriverName: string
  percentageLow: number
  percentageHigh: number
  baseValues: Record<string, number>
}

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  text: string
}

const PERIOD_KEYS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']

function uid() {
  return Math.random().toString(36).slice(2)
}

function Cell({ value, column }: { value: CellValue; column: ReturnType<typeof buildColumns>[number] }) {
  const shown = column.isClosed ? value.actual : value.forecast
  return (
    <div className="px-4 py-3 text-right text-sm tabular-nums text-ink-primary">
      {shown === undefined ? <span className="text-ink-muted">—</span> : formatMoney(shown)}
    </div>
  )
}

function ProposalCard({
  proposal,
  onChange,
  onConfirmDefinition,
  onConfirmValues,
  onConfirmFormula,
  onCancel,
}: {
  proposal: ProposalState
  onChange: (patch: Partial<ProposalState>) => void
  onConfirmDefinition: () => void
  onConfirmValues: () => void
  onConfirmFormula: () => void
  onCancel: () => void
}) {
  const steps: ProposalStep[] = ['definition', 'values', 'formula']
  return (
    <Card className="mb-4 border-2 border-ink-primary/10 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                  steps.indexOf(proposal.step) >= i ? 'bg-btn-primary-bg text-white' : 'bg-chip-neutral-bg text-chip-neutral'
                }`}
              >
                {i + 1}
              </span>
              <span className="text-xs text-ink-secondary">
                {s === 'definition' ? 'Driver definition' : s === 'values' ? 'Driver values' : 'Line-item formula'}
              </span>
              {i < steps.length - 1 && <span className="mx-1 text-ink-muted">→</span>}
            </div>
          ))}
        </div>
        <button onClick={onCancel} className="text-xs text-ink-muted hover:text-ink-primary">
          Cancel
        </button>
      </div>

      {proposal.step === 'definition' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            This looks like a percentage-of-another-value pattern, so I'm proposing two drivers rather than one: a base series and a
            Collection Curve on top of it.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-input border border-border-input bg-page/50 p-3">
              <LabelCaps className="mb-2">Driver 1 — Base value</LabelCaps>
              <Field label="Name">
                <TextInput value={proposal.baseDriverName} onChange={(e) => onChange({ baseDriverName: e.target.value })} />
              </Field>
              <p className="mt-2 text-xs text-ink-secondary">Type: Manual Series · Frequency: Weekly</p>
            </div>
            <div className="rounded-input border border-border-input bg-page/50 p-3">
              <LabelCaps className="mb-2">Driver 2 — Collection Curve</LabelCaps>
              <Field label="Name">
                <TextInput value={proposal.curveDriverName} onChange={(e) => onChange({ curveDriverName: e.target.value })} />
              </Field>
              <p className="mt-2 text-xs text-ink-secondary">Source reference: {proposal.baseDriverName || 'Base value'}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-ink-secondary">
                <span>Same-week percentage:</span>
                <input
                  type="number"
                  step="any"
                  value={(proposal.percentageLow + proposal.percentageHigh) / 2}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    onChange({ percentageLow: v, percentageHigh: v })
                  }}
                  className="w-16 rounded-input border border-border-input bg-white px-2 py-1 text-center tabular-nums"
                />
                <span>%</span>
              </div>
              {proposal.percentageLow !== proposal.percentageHigh && (
                <p className="mt-1 text-xs text-ink-muted">Stated range: {proposal.percentageLow}–{proposal.percentageHigh}%</p>
              )}
            </div>
          </div>
          <Field label="Line item name">
            <TextInput value={proposal.lineItemName} onChange={(e) => onChange({ lineItemName: e.target.value })} />
          </Field>
          <PrimaryButton onClick={onConfirmDefinition} className="w-full justify-center">
            Confirm driver definitions
          </PrimaryButton>
        </div>
      )}

      {proposal.step === 'values' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            Now the actual weekly values for <span className="font-medium text-ink-primary">{proposal.baseDriverName}</span> — enter
            them directly, or these default to zero until you do.
          </p>
          <div className="grid grid-cols-6 gap-2">
            {PERIOD_KEYS.map((key, i) => (
              <div key={key}>
                <div className="mb-1 text-center text-[10px] text-ink-muted">W{i + 1}</div>
                <input
                  type="number"
                  value={proposal.baseValues[key] ?? ''}
                  onChange={(e) => onChange({ baseValues: { ...proposal.baseValues, [key]: Number(e.target.value) } })}
                  className="w-full rounded-input border border-border-input bg-white px-2 py-1.5 text-center text-xs tabular-nums focus:border-ink-primary focus:outline-none"
                />
              </div>
            ))}
          </div>
          <PrimaryButton onClick={onConfirmValues} className="w-full justify-center">
            Confirm values
          </PrimaryButton>
        </div>
      )}

      {proposal.step === 'formula' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            Last step — the line item's formula. Per the "formulas are pure math over driver IDs" principle, this is a single chip
            reference to the curve driver; none of the percentage math appears here.
          </p>
          <div className="rounded-input border border-border-input bg-page/50 p-3">
            <LabelCaps className="mb-1">{proposal.lineItemName}</LabelCaps>
            <p className="font-mono text-sm text-ink-primary">{proposal.curveDriverName.replace(/\s+/g, '')}</p>
          </div>
          <PrimaryButton onClick={onConfirmFormula} className="w-full justify-center">
            Confirm &amp; add to model
          </PrimaryButton>
        </div>
      )}
    </Card>
  )
}

export default function BuildWithAIPage() {
  const navigate = useNavigate()
  const { addModel, addDriver, addLineItem, updateLineItem, getModel, drivers, lineItems } = useStore()

  const [phase, setPhase] = useState<Phase>('prompt')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: 'agent',
      text: 'Tell me what you\'d like to build — for example: "Build a Cash Forecasting Model."',
    },
  ])
  const [input, setInput] = useState('')
  const [modelId, setModelId] = useState<string | null>(null)
  const [proposal, setProposal] = useState<ProposalState | null>(null)
  const [view, setView] = useState<ViewMode>('week')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Setup card fields
  const [setupName, setSetupName] = useState('')
  const [setupDescription, setSetupDescription] = useState('')
  const [setupFiscalYear, setSetupFiscalYear] = useState('FY26-27')
  const [setupStartMonth, setSetupStartMonth] = useState('May')
  const [fileName, setFileName] = useState<string | null>(null)

  function pushMessage(role: 'user' | 'agent', text: string) {
    setMessages((prev) => [...prev, { id: uid(), role, text }])
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }))
  }

  function handleSend() {
    const text = input.trim()
    if (!text) return
    pushMessage('user', text)
    setInput('')

    if (phase === 'prompt') {
      setPhase('setup')
      pushMessage('agent', "Sure — let's set up the model. A few details first, in the card below.")
      return
    }

    if (phase === 'canvas') {
      if (proposal) {
        pushMessage('agent', 'One proposal is already in progress below — confirm or cancel it first.')
        return
      }
      const parsed = parsePercentOfPrompt(text)
      if (parsed) {
        pushMessage(
          'agent',
          `That's a percentage of another value applied over time, so I'm defaulting to a Collection Curve rather than asking you to pick a driver type. Review the proposal in the canvas.`,
        )
        setProposal({
          step: 'definition',
          lineItemName: parsed.lineItemName,
          category: inferCategory(text),
          baseDriverName: parsed.baseDriverName,
          curveDriverName: `${parsed.lineItemName} Collection Curve`,
          percentageLow: parsed.percentageLow,
          percentageHigh: parsed.percentageHigh,
          baseValues: {},
        })
      } else {
        pushMessage(
          'agent',
          'I can add a line item or driver from a description like "collections will be 3–5% of billings each week." Try phrasing it that way, or edit any row directly in the canvas.',
        )
      }
    }
  }

  function handleSetupSubmit() {
    if (!setupName.trim()) return
    const model = addModel({ name: setupName.trim(), fiscalYear: setupFiscalYear, description: setupDescription })
    setModelId(model.id)
    setPhase('canvas')
    pushMessage(
      'agent',
      `Your model canvas is ready — every line item from the ChargePoint structure is there, showing em-dash until a driver is wired. Click any row's pencil to edit it directly, or describe a new one here.`,
    )
  }

  function handleConfirmDefinition() {
    if (!proposal) return
    setProposal({ ...proposal, step: 'values' })
  }

  function handleConfirmValues() {
    if (!proposal) return
    setProposal({ ...proposal, step: 'formula' })
  }

  function handleConfirmFormula() {
    if (!proposal || !modelId) return
    const base = addDriver({
      name: proposal.baseDriverName,
      type: 'manual_series',
      frequency: 'Weekly',
      netsuiteMapping: null,
      fields: { valuesByPeriod: proposal.baseValues },
      derivationLogic: `Base value entered directly while building "${proposal.lineItemName}" via Build with AI.`,
      reason: 'Created via Build with AI from natural-language prompt',
    })
    const curve = addDriver({
      name: proposal.curveDriverName,
      type: 'collection_curve',
      frequency: 'Weekly',
      netsuiteMapping: null,
      fields: {
        sourceRef: base.id,
        applicabilityWindow: 'forecasted_only',
        curveRows: [{ offsetPeriods: 0, percentage: (proposal.percentageLow + proposal.percentageHigh) / 2 }],
        calibrationSource: 'manual',
      },
      derivationLogic: `Proposed from the prompt's stated ${proposal.percentageLow}–${proposal.percentageHigh}% range, applied to ${proposal.baseDriverName}.`,
      reason: 'Created via Build with AI from natural-language prompt',
    })
    addLineItem(modelId, proposal.category, {
      name: proposal.lineItemName,
      forecastMode: 'formula',
      formula: curve.id,
      actualsMode: 'direct',
      actualsFormula: '',
      actuals: {},
      forecast: {},
      directValues: {},
    })
    pushMessage(
      'agent',
      `Added "${proposal.lineItemName}" to the canvas, referencing ${proposal.curveDriverName} — you can inspect it, or any other line item, any time.`,
    )
    setProposal(null)
  }

  const model = modelId ? getModel(modelId) : undefined
  const lineItemsById = Object.fromEntries(lineItems.map((li) => [li.id, li]))
  const rowLayoutAll = model?.rowLayout ?? []
  const columns = buildColumns(allPeriods, view)
  const rowValues = computeRowValues(rowLayoutAll, lineItemsById, allPeriods)
  const balanceChain = computeBalanceChain(rowValues, 'totalReceipts', 'netDisbursements', allPeriods, OPENING_BALANCE_START)

  function splitCategory(category: LineItemCategory) {
    const rows = rowLayoutAll.filter((r) => r.category === category)
    const splitAt = rows.findIndex((r) => r.kind === 'total')
    return splitAt === -1 ? { before: rows, totals: [] } : { before: rows.slice(0, splitAt), totals: rows.slice(splitAt) }
  }
  const receipts = splitCategory('receipts')
  const disbursements = splitCategory('disbursements')

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderCell(row: RowDef, column: ReturnType<typeof buildColumns>[number]) {
    return <Cell value={aggregateForColumn(rowValues[row.id] ?? {}, column)} column={column} />
  }

  const editingLineItem = editingId ? lineItems.find((li) => li.id === editingId) ?? null : null

  function handleSaveLineItem(patch: {
    name: string
    category: LineItemCategory
    forecastMode: LineItemKind
    formula: string
    directValues: Record<string, number>
    actualsMode: LineItemKind
    actualsFormula: string
    actuals: Record<string, number>
  }) {
    if (modelId && editingId) updateLineItem(modelId, editingId, patch)
    setEditingId(null)
  }

  return (
    <div className="flex h-full">
      <div className="flex w-[420px] flex-shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <SecondaryButton onClick={() => navigate('/models')}>← Back</SecondaryButton>
          <h1 className="font-serif text-base text-ink-primary">Build with AI</h1>
        </div>
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-card px-3.5 py-2.5 text-sm ${
                  m.role === 'user' ? 'bg-btn-primary-bg text-white' : 'bg-page text-ink-primary'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {phase === 'setup' && (
            <Card className="space-y-3 p-4">
              <Field label="Supporting file (optional)">
                <label className="flex cursor-pointer items-center justify-center rounded-input border border-dashed border-border-input bg-page/50 px-3 py-3 text-xs text-ink-secondary hover:bg-page">
                  {fileName ?? 'Upload Excel/CSV…'}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                  />
                </label>
              </Field>
              <Field label="Model Name">
                <TextInput value={setupName} onChange={(e) => setSetupName(e.target.value)} placeholder="e.g. APAC Cash Flow Model" />
              </Field>
              <Field label="Description">
                <TextArea rows={2} value={setupDescription} onChange={(e) => setSetupDescription(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fiscal Year">
                  <Select
                    value={setupFiscalYear}
                    onChange={setSetupFiscalYear}
                    options={[
                      { value: 'FY25-26', label: 'FY25-26' },
                      { value: 'FY26-27', label: 'FY26-27' },
                      { value: 'FY27-28', label: 'FY27-28' },
                    ]}
                  />
                </Field>
                <Field label="Start Month">
                  <Select
                    value={setupStartMonth}
                    onChange={setSetupStartMonth}
                    options={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => ({
                      value: m,
                      label: m,
                    }))}
                  />
                </Field>
              </div>
              <PrimaryButton onClick={handleSetupSubmit} disabled={!setupName.trim()} className="w-full justify-center">
                Create model
              </PrimaryButton>
            </Card>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-border p-3">
          <TextInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={phase === 'prompt' ? 'Build a Cash Forecasting Model.' : 'Describe a line item or driver…'}
          />
          <PrimaryButton onClick={handleSend}>Send</PrimaryButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {phase !== 'canvas' || !model ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-muted">
            The canvas opens here once the model is set up.
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between border-b border-border bg-page px-6 py-4">
              <div>
                <h2 className="font-serif text-lg text-ink-primary">{model.name}</h2>
                <p className="text-xs text-ink-muted">{model.fiscalYear}</p>
              </div>
              <SegmentedControl
                options={[
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                ]}
                value={view}
                onChange={setView}
              />
            </div>

            <div className="px-6 pt-4">{proposal && (
              <ProposalCard
                proposal={proposal}
                onChange={(patch) => setProposal((p) => (p ? { ...p, ...patch } : p))}
                onConfirmDefinition={handleConfirmDefinition}
                onConfirmValues={handleConfirmValues}
                onConfirmFormula={handleConfirmFormula}
                onCancel={() => setProposal(null)}
              />
            )}</div>

            <div className="overflow-x-auto">
              <div className="min-w-max">
                <RowTableHeader columns={columns} />
                <RowLine
                  label="Beginning cash balance"
                  columns={columns}
                  bold
                  tint
                  renderCell={(c) => <Cell value={aggregateSnapshotForColumn(balanceChain.beginning, c, 'first')} column={c} />}
                />
                <SectionBanner label="RECEIPTS" bg="#F0F6F2" text="#376A42" columns={columns} />
                <RowTableBody
                  rowLayout={receipts.before}
                  columns={columns}
                  collapsedGroupIds={collapsed}
                  onToggleGroup={toggle}
                  renderCell={renderCell}
                  onEditLeaf={(row) => setEditingId(row.id)}
                />
                <RowTableBody
                  rowLayout={receipts.totals}
                  columns={columns}
                  collapsedGroupIds={collapsed}
                  onToggleGroup={toggle}
                  renderCell={renderCell}
                />
                <SectionBanner label="Disbursements" bg="#FBF1EF" text="#B14434" columns={columns} />
                <RowTableBody
                  rowLayout={disbursements.before}
                  columns={columns}
                  collapsedGroupIds={collapsed}
                  onToggleGroup={toggle}
                  renderCell={renderCell}
                  onEditLeaf={(row) => setEditingId(row.id)}
                />
                <RowTableBody
                  rowLayout={disbursements.totals}
                  columns={columns}
                  collapsedGroupIds={collapsed}
                  onToggleGroup={toggle}
                  renderCell={renderCell}
                />
                <RowLine
                  label="Ending unrestricted cash"
                  columns={columns}
                  bold
                  tint
                  renderCell={(c) => <Cell value={aggregateSnapshotForColumn(balanceChain.ending, c, 'last')} column={c} />}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <LineItemDrawer
        open={!!editingId}
        onClose={() => setEditingId(null)}
        lineItem={editingLineItem}
        defaultCategory="receipts"
        periods={allPeriods}
        drivers={drivers}
        otherLineItems={lineItems}
        onSave={handleSaveLineItem}
      />
    </div>
  )
}
