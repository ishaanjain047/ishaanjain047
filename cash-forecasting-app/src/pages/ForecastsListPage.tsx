import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Card, LabelCaps } from '../components/ui'
import { useStore } from '../lib/store'

export default function ForecastsListPage() {
  const { forecast, getModel } = useStore()
  const navigate = useNavigate()
  const model = getModel(forecast.modelId)

  return (
    <div>
      <PageHeader title="Cash Forecasting" subtitle="Scenario forecasts across entities" />
      <div className="px-8 py-6">
        <Card>
          <div className="grid grid-cols-3 gap-4 border-b border-border bg-table-header px-6 py-3">
            <LabelCaps>Forecast</LabelCaps>
            <LabelCaps>Entity</LabelCaps>
            <LabelCaps>Model</LabelCaps>
          </div>
          <button
            onClick={() => navigate(`/forecasts/${forecast.id}`)}
            className="grid w-full grid-cols-3 gap-4 border-b border-border px-6 py-4 text-left last:border-b-0 hover:bg-page"
          >
            <div className="text-sm font-medium text-ink-primary">{forecast.name}</div>
            <div className="text-sm text-ink-secondary">{forecast.entity}</div>
            <div className="text-sm text-ink-secondary">{model?.name ?? forecast.modelId}</div>
          </button>
        </Card>
      </div>
    </div>
  )
}
