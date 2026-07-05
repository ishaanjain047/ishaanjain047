import { Navigate, Route, Routes } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { StoreProvider } from './lib/store'
import DriverRegistryPage from './pages/DriverRegistryPage'
import ModelsListPage from './pages/ModelsListPage'
import ModelWorksheetPage from './pages/ModelWorksheetPage'
import ForecastsListPage from './pages/ForecastsListPage'
import ForecastDetailPage from './pages/ForecastDetailPage'
import TreasuryPage from './pages/TreasuryPage'
import ReceivablesPage from './pages/ReceivablesPage'

export default function App() {
  return (
    <StoreProvider>
      <div className="flex h-screen bg-page">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/models" replace />} />
            <Route path="/treasury" element={<TreasuryPage />} />
            <Route path="/models" element={<ModelsListPage />} />
            <Route path="/models/:modelId" element={<ModelWorksheetPage />} />
            <Route path="/forecasts" element={<ForecastsListPage />} />
            <Route path="/forecasts/:forecastId" element={<ForecastDetailPage />} />
            <Route path="/receivables" element={<ReceivablesPage />} />
            <Route path="/drivers" element={<DriverRegistryPage />} />
          </Routes>
        </main>
      </div>
    </StoreProvider>
  )
}
