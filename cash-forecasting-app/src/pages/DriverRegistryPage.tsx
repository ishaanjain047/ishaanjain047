import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import {
  Card,
  Drawer,
  Field,
  LabelCaps,
  PencilIcon,
  PrimaryButton,
  SecondaryButton,
  Select,
  SegmentedControl,
  TextInput,
} from '../components/ui'
import { DerivationFields, DriverTypeFields, NetSuiteMappingFields, defaultFrequencyForType } from '../components/DriverTypeFields'
import { DriverPreviewChart } from '../components/DriverPreviewChart'
import { Timeline, TimelineEntry } from '../components/Timeline'
import { useStore } from '../lib/store'
import type { Driver, DriverFamily, DriverFields, DriverType, NetsuiteMapping } from '../lib/types'
import { DRIVER_FAMILY, DRIVER_TYPE_LABEL, emptyNetsuiteMapping } from '../lib/types'
import { FAMILY_COLORS, currentValueDisplay, familyOf, netsuiteMappingDisplay } from '../lib/driverDisplay'
import { computeDriverPreview } from '../lib/driverEngine'
import { validateDriverFields } from '../lib/driverValidation'
import { formatDateTime, formatRelativeDate } from '../lib/format'

const FAMILY_FILTERS: { value: DriverFamily | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'manual', label: 'Manual' },
  { value: 'erp', label: 'ERP' },
  { value: 'statistical', label: 'Statistical' },
  { value: 'ml', label: 'ML' },
]

const TYPE_OPTIONS = (Object.keys(DRIVER_TYPE_LABEL) as DriverType[]).map((t) => ({
  value: t,
  label: DRIVER_TYPE_LABEL[t],
}))

function TypeBadge({ type }: { type: DriverType }) {
  const family = DRIVER_FAMILY[type]
  const c = FAMILY_COLORS[family]
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {DRIVER_TYPE_LABEL[type]}
    </span>
  )
}

function NewDriverDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { drivers, lineItems, addDriver } = useStore()
  const [name, setName] = useState('')
  const [type, setType] = useState<DriverType | ''>('')
  const [fields, setFields] = useState<DriverFields>({})
  const [netsuiteMapping, setNetsuiteMapping] = useState<NetsuiteMapping>(emptyNetsuiteMapping())
  const [derivationLogic, setDerivationLogic] = useState('')
  const [reason, setReason] = useState('')

  function reset() {
    setName('')
    setType('')
    setFields({})
    setNetsuiteMapping(emptyNetsuiteMapping())
    setDerivationLogic('')
    setReason('')
  }

  function handleTypeChange(v: string) {
    setType(v as DriverType)
    setFields({})
    if (v === 'collection_curve' && !derivationLogic.trim()) {
      setDerivationLogic(
        'Collection curve applying offset/percentage splits to a rolling window of the selected source reference. Any remainder under 100% is implied bad-debt/write-off.',
      )
    }
  }

  const canSave = !!name.trim() && !!type && validateDriverFields(type as DriverType, fields, netsuiteMapping)

  function handleSave() {
    if (!canSave || !type) return
    addDriver({
      name: name.trim(),
      type,
      frequency: defaultFrequencyForType(type, fields),
      netsuiteMapping,
      fields,
      derivationLogic,
      reason,
    })
    reset()
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="New Driver"
      icon={<PencilIcon className="h-4 w-4" />}
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
        <Field label="Driver name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AP Tier-1 Calibration" />
        </Field>
        <Field label="Type">
          <Select value={type} onChange={handleTypeChange} options={[{ value: '', label: 'Select a type…' }, ...TYPE_OPTIONS]} />
        </Field>
        {type && (
          <div className="space-y-5 border-t border-border pt-5">
            <DriverTypeFields type={type} fields={fields} onChange={setFields} drivers={drivers} lineItems={lineItems} />
          </div>
        )}
        {type && (
          <NetSuiteMappingFields mapping={netsuiteMapping} onChange={(patch) => setNetsuiteMapping((m) => ({ ...m, ...patch }))} />
        )}
        <div className="space-y-5 border-t border-border pt-5">
          <DerivationFields
            derivationLogic={derivationLogic}
            onDerivationChange={setDerivationLogic}
            reason={reason}
            onReasonChange={setReason}
          />
        </div>
      </div>
    </Drawer>
  )
}

function EditDriverDrawer({ driver, onClose }: { driver: Driver | null; onClose: () => void }) {
  const { drivers, lineItems, updateDriver } = useStore()
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState('')
  const [fields, setFields] = useState<DriverFields>({})
  const [netsuiteMapping, setNetsuiteMapping] = useState<NetsuiteMapping>(emptyNetsuiteMapping())
  const [derivationLogic, setDerivationLogic] = useState('')
  const [reason, setReason] = useState('')
  const [historyOpen, setHistoryOpen] = useState(true)
  const [loadedId, setLoadedId] = useState<string | null>(null)

  if (driver && driver.id !== loadedId) {
    setLoadedId(driver.id)
    setName(driver.name)
    setFrequency(driver.frequency)
    setFields(driver.fields)
    setNetsuiteMapping(driver.netsuiteMapping ?? emptyNetsuiteMapping())
    setDerivationLogic(driver.derivationLogic)
    setReason('')
  }

  if (!driver) return null

  const dirty =
    name !== driver.name ||
    frequency !== driver.frequency ||
    derivationLogic !== driver.derivationLogic ||
    JSON.stringify(fields) !== JSON.stringify(driver.fields) ||
    JSON.stringify(netsuiteMapping) !== JSON.stringify(driver.netsuiteMapping ?? emptyNetsuiteMapping())

  function handleSave() {
    if (!driver || !dirty || !reason.trim()) return
    updateDriver(driver.id, { name, frequency, fields, netsuiteMapping, derivationLogic }, reason.trim())
    onClose()
  }

  const driversById = Object.fromEntries(drivers.map((d) => [d.id, d]))
  const previewDriver: Driver = { ...driver, name, type: driver.type, fields, netsuiteMapping }
  driversById[driver.id] = previewDriver
  const preview = computeDriverPreview(previewDriver, driversById)

  return (
    <Drawer
      open={!!driver}
      onClose={onClose}
      title={driver.name}
      icon={<PencilIcon className="h-4 w-4" />}
    >
      <div className="space-y-5">
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <div className="pt-1">
              <TypeBadge type={driver.type} />
            </div>
          </Field>
          <Field label="Frequency">
            <TextInput value={frequency} onChange={(e) => setFrequency(e.target.value)} />
          </Field>
        </div>
        <div className="space-y-5 border-t border-border pt-5">
          <DriverTypeFields
            type={driver.type}
            fields={fields}
            onChange={setFields}
            drivers={drivers}
            lineItems={lineItems}
            excludeDriverId={driver.id}
          />
        </div>
        <NetSuiteMappingFields mapping={netsuiteMapping} onChange={(patch) => setNetsuiteMapping((m) => ({ ...m, ...patch }))} />
        <div className="border-t border-border pt-5">
          <Field label="Derivation logic">
            <textarea
              rows={3}
              value={derivationLogic}
              onChange={(e) => setDerivationLogic(e.target.value)}
              className="w-full rounded-input border border-border-input bg-white px-3 py-2 text-sm focus:border-ink-primary focus:outline-none"
            />
          </Field>
        </div>
        <Field label="Reason for this change" hint={dirty && !reason.trim() ? 'Required before saving' : undefined}>
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this changing?" />
        </Field>
        <PrimaryButton onClick={handleSave} disabled={!dirty || !reason.trim()} className="w-full justify-center">
          Save
        </PrimaryButton>

        <div className="border-t border-border pt-5">
          <DriverPreviewChart preview={preview} />
        </div>

        <div className="border-t border-border pt-5">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="mb-4 flex w-full items-center justify-between text-sm font-medium text-ink-primary"
          >
            <span className="label-caps">Version History</span>
            <span className="text-ink-secondary">{historyOpen ? '−' : '+'}</span>
          </button>
          {historyOpen && (
            <Timeline>
              {driver.history.map((h, i) => (
                <TimelineEntry key={i} date={formatDateTime(h.date)} editor={h.editor}>
                  <div>
                    <span className="font-medium">{h.field}</span>: {h.oldValue} → {h.newValue}
                  </div>
                  <div className="mt-0.5 text-ink-secondary">&ldquo;{h.reason}&rdquo;</div>
                </TimelineEntry>
              ))}
              {driver.history.length === 0 && <p className="text-sm text-ink-muted">No history yet.</p>}
            </Timeline>
          )}
        </div>
      </div>
    </Drawer>
  )
}

export default function DriverRegistryPage() {
  const { drivers } = useStore()
  const [filter, setFilter] = useState<DriverFamily | 'all'>('all')
  const [newOpen, setNewOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const filtered = useMemo(
    () => drivers.filter((d) => filter === 'all' || familyOf(d) === filter),
    [drivers, filter],
  )

  const editingDriver = drivers.find((d) => d.id === editingId) ?? null

  return (
    <div>
      <PageHeader
        title="Driver Registry"
        subtitle="Reusable assumptions and data feeds used across cash flow models"
        actions={<PrimaryButton onClick={() => setNewOpen(true)}>+ New Driver</PrimaryButton>}
      />
      <div className="px-8 py-6">
        <div className="mb-5">
          <SegmentedControl options={FAMILY_FILTERS} value={filter} onChange={setFilter} />
        </div>

        {filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-4 py-16">
            <p className="text-sm text-ink-secondary">No drivers yet — create your first driver</p>
            <PrimaryButton onClick={() => setNewOpen(true)}>+ New Driver</PrimaryButton>
          </Card>
        ) : (
          <Card>
            <div className="grid grid-cols-[1.4fr_1.2fr_1fr_0.9fr_1.1fr_1fr] gap-4 border-b border-border bg-table-header px-6 py-3">
              <LabelCaps>Name</LabelCaps>
              <LabelCaps>Type</LabelCaps>
              <LabelCaps>Frequency</LabelCaps>
              <LabelCaps>Current Value</LabelCaps>
              <LabelCaps>NetSuite Mapping</LabelCaps>
              <LabelCaps>Last Updated</LabelCaps>
            </div>
            {filtered.map((d) => (
              <div
                key={d.id}
                className="group grid grid-cols-[1.4fr_1.2fr_1fr_0.9fr_1.1fr_1fr] items-center gap-4 border-b border-border px-6 py-4 last:border-b-0 hover:bg-page"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
                  {d.name}
                  <button
                    onClick={() => setEditingId(d.id)}
                    className="ml-1 text-ink-muted opacity-0 transition group-hover:opacity-100 hover:text-ink-primary"
                    aria-label={`Edit ${d.name}`}
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div>
                  <TypeBadge type={d.type} />
                </div>
                <div className="text-sm text-ink-secondary">{d.frequency}</div>
                <div className="text-sm tabular-nums text-ink-primary">{currentValueDisplay(d)}</div>
                <div className={`text-sm ${netsuiteMappingDisplay(d) === '— Manual only' ? 'text-ink-muted' : 'text-ink-primary'}`}>
                  {netsuiteMappingDisplay(d)}
                </div>
                <div className="text-sm text-ink-muted">
                  {formatRelativeDate(d.updatedAt)} · {d.updatedBy}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      <NewDriverDrawer open={newOpen} onClose={() => setNewOpen(false)} />
      <EditDriverDrawer driver={editingDriver} onClose={() => setEditingId(null)} />
    </div>
  )
}
