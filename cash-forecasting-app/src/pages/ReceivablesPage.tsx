import { PageHeader } from '../components/PageHeader'
import { Card, LabelCaps } from '../components/ui'
import { formatMoney } from '../lib/format'

const invoices = [
  { customer: 'Volta Charging Co.', amount: 184000, dueIn: '12 days' },
  { customer: 'EVgo Fleet Services', amount: 92500, dueIn: '4 days' },
  { customer: 'Blink Mobility', amount: 61200, dueIn: '28 days' },
]

export default function ReceivablesPage() {
  return (
    <div>
      <PageHeader title="Account Receivables" subtitle="Open customer invoices by due date" />
      <div className="px-8 py-6">
        <Card>
          <div className="grid grid-cols-3 gap-4 border-b border-border bg-table-header px-6 py-3">
            <LabelCaps>Customer</LabelCaps>
            <LabelCaps>Amount</LabelCaps>
            <LabelCaps>Due</LabelCaps>
          </div>
          {invoices.map((inv) => (
            <div key={inv.customer} className="grid grid-cols-3 gap-4 border-b border-border px-6 py-4 last:border-b-0">
              <div className="text-sm font-medium text-ink-primary">{inv.customer}</div>
              <div className="text-sm tabular-nums text-ink-primary">{formatMoney(inv.amount)}</div>
              <div className="text-sm text-ink-secondary">{inv.dueIn}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
