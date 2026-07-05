import { PageHeader } from '../components/PageHeader'
import { Card, LabelCaps, Pill } from '../components/ui'
import { formatMoney } from '../lib/format'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Healthy: { bg: '#E2F9E8', text: '#34744B' },
  Good: { bg: '#D6E8FD', text: '#356FE7' },
  Stable: { bg: '#FCF1CC', text: '#CE6F2A' },
  'At risk': { bg: '#FBF3F2', text: '#972A23' },
}

const accounts = [
  { name: 'JPMorgan Operating — USD', balance: 5_240_000, status: 'Healthy' },
  { name: 'Silicon Valley Bank — USD', balance: 2_140_000, status: 'Good' },
  { name: 'Deutsche Bank — EUR', balance: 980_000, status: 'Stable' },
]

export default function TreasuryPage() {
  const total = accounts.reduce((s, a) => s + a.balance, 0)
  return (
    <div>
      <PageHeader title="Treasury" subtitle="Consolidated account balances across entities" />
      <div className="px-8 py-6">
        <Card className="mb-6 p-7">
          <LabelCaps>Total Cash</LabelCaps>
          <div className="mt-1 font-serif text-3xl text-ink-primary tabular-nums">{formatMoney(total)}</div>
        </Card>
        <Card>
          <div className="grid grid-cols-3 gap-4 border-b border-border bg-table-header px-6 py-3">
            <LabelCaps>Account</LabelCaps>
            <LabelCaps>Balance</LabelCaps>
            <LabelCaps>Status</LabelCaps>
          </div>
          {accounts.map((a) => (
            <div key={a.name} className="grid grid-cols-3 gap-4 border-b border-border px-6 py-4 last:border-b-0">
              <div className="text-sm font-medium text-ink-primary">{a.name}</div>
              <div className="text-sm tabular-nums text-ink-primary">{formatMoney(a.balance)}</div>
              <div>
                <Pill bg={STATUS_COLORS[a.status].bg} text={STATUS_COLORS[a.status].text}>
                  {a.status}
                </Pill>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
