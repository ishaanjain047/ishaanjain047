import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Card, Field, Modal, PrimaryButton, Select, TextArea, TextInput } from '../components/ui'
import { useStore } from '../lib/store'
import { formatRelativeDate } from '../lib/format'

export default function ModelsListPage() {
  const { models, addModel } = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [fiscalYear, setFiscalYear] = useState('FY26-27')
  const [description, setDescription] = useState('')

  function handleCreate() {
    if (!name.trim()) return
    const model = addModel({ name: name.trim(), fiscalYear, description })
    setOpen(false)
    setName('')
    setDescription('')
    navigate(`/models/${model.id}`)
  }

  return (
    <div>
      <PageHeader
        title="Cash Flow Models"
        subtitle="Rolling operating cash flow models by entity"
        actions={<PrimaryButton onClick={() => setOpen(true)}>+ New Model</PrimaryButton>}
      />
      <div className="grid grid-cols-1 gap-5 px-8 py-6 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((m) => (
          <Card key={m.id} className="flex flex-col justify-between p-6">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-serif text-lg text-ink-primary">{m.name}</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    m.status === 'Published' ? 'bg-green-bg text-green-text' : 'bg-chip-neutral-bg text-chip-neutral'
                  }`}
                >
                  {m.status}
                </span>
              </div>
              <p className="text-sm text-ink-secondary">{m.description}</p>
              <p className="mt-3 text-xs text-ink-muted">{m.fiscalYear} · Updated {formatRelativeDate(m.updatedAt)}</p>
            </div>
            <button
              onClick={() => navigate(`/models/${m.id}`)}
              className="mt-5 self-start rounded-lg border border-btn-secondary-border bg-white px-4 py-2 text-sm font-medium text-ink-primary hover:bg-page"
            >
              View
            </button>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Model">
        <div className="space-y-4">
          <Field label="Model Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. APAC Cash Flow Model" />
          </Field>
          <Field label="Fiscal Year">
            <Select
              value={fiscalYear}
              onChange={setFiscalYear}
              options={[
                { value: 'FY25-26', label: 'FY25-26' },
                { value: 'FY26-27', label: 'FY26-27' },
                { value: 'FY27-28', label: 'FY27-28' },
              ]}
            />
          </Field>
          <Field label="Description">
            <TextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this model cover?" />
          </Field>
          <PrimaryButton onClick={handleCreate} className="w-full justify-center" disabled={!name.trim()}>
            Create
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  )
}
