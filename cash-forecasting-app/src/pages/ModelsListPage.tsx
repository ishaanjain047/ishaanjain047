import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Card, Field, Modal, PrimaryButton, Select, TextArea, TextInput } from '../components/ui'
import { useStore } from '../lib/store'
import { formatRelativeDate } from '../lib/format'

type EntryStep = 'choose' | 'manual'

export default function ModelsListPage() {
  const { models, addModel } = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<EntryStep>('choose')
  const [name, setName] = useState('')
  const [fiscalYear, setFiscalYear] = useState('FY26-27')
  const [description, setDescription] = useState('')

  function closeModal() {
    setOpen(false)
    setStep('choose')
    setName('')
    setDescription('')
  }

  function handleCreate() {
    if (!name.trim()) return
    const model = addModel({ name: name.trim(), fiscalYear, description })
    closeModal()
    navigate(`/models/${model.id}`)
  }

  function handleBuildWithAI() {
    setOpen(false)
    setStep('choose')
    navigate('/models/build-with-ai')
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

      <Modal open={open} onClose={closeModal} title="New Model" widthClassName={step === 'choose' ? 'w-[560px]' : 'w-[440px]'}>
        {step === 'choose' ? (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setStep('manual')}
              className="flex flex-col items-start gap-2 rounded-card border border-border-input bg-white p-5 text-left transition hover:border-ink-primary hover:bg-page"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-ink-primary">
                <rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M3 8.5h14M7.5 8.5V16" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              <div className="font-serif text-base text-ink-primary">Create Manually</div>
              <p className="text-xs text-ink-secondary">
                Set up the model yourself and wire drivers directly in the worksheet.
              </p>
            </button>
            <button
              onClick={handleBuildWithAI}
              className="flex flex-col items-start gap-2 rounded-card border border-border-input bg-white p-5 text-left transition hover:border-ink-primary hover:bg-page"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-ink-primary">
                <path
                  d="M10 2.5l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4L10 2.5z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path d="M15.5 12l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
              </svg>
              <div className="font-serif text-base text-ink-primary">Build with AI</div>
              <p className="text-xs text-ink-secondary">
                Describe the model in chat — the agent sets up the structure and proposes drivers with you.
              </p>
            </button>
          </div>
        ) : (
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
        )}
      </Modal>
    </div>
  )
}
