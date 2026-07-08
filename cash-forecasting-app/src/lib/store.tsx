import React, { createContext, useContext, useMemo, useState } from 'react'
import {
  CURRENT_USER,
  buildDefaultStructure,
  drivers as seedDrivers,
  lineItems as seedLineItems,
  models as seedModels,
  forecast as seedForecast,
} from '../data/seed'
import type {
  CashFlowModel,
  Driver,
  DriverFields,
  DriverType,
  Forecast,
  HistoryEntry,
  LineItem,
  LineItemCategory,
  ModelHistoryEntry,
  NetsuiteMapping,
  RowDef,
} from './types'

function nowIso() {
  return new Date().toISOString()
}

function fieldDisplay(v: unknown): string {
  if (v === undefined || v === null || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

interface Store {
  drivers: Driver[]
  models: CashFlowModel[]
  lineItems: LineItem[]
  forecast: Forecast
  getDriver: (id: string) => Driver | undefined
  getLineItem: (id: string) => LineItem | undefined
  getModel: (id: string) => CashFlowModel | undefined
  addDriver: (input: {
    name: string
    type: DriverType
    frequency: string
    netsuiteMapping: NetsuiteMapping | null
    fields: DriverFields
    derivationLogic: string
    reason: string
  }) => Driver
  updateDriver: (
    id: string,
    patch: {
      name?: string
      frequency?: string
      netsuiteMapping?: NetsuiteMapping | null
      fields?: DriverFields
      derivationLogic?: string
    },
    reason: string,
  ) => void
  addModel: (input: { name: string; fiscalYear: string; description: string }) => CashFlowModel
  addLineItem: (modelId: string, category: LineItemCategory, item: Omit<LineItem, 'id' | 'category'>) => LineItem
  updateLineItem: (modelId: string, id: string, patch: Partial<LineItem>) => void
  removeLineItem: (modelId: string, id: string) => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [drivers, setDrivers] = useState<Driver[]>(seedDrivers)
  const [models, setModels] = useState<CashFlowModel[]>(seedModels)
  const [lineItems, setLineItems] = useState<LineItem[]>(seedLineItems)
  const [forecast] = useState<Forecast>(seedForecast)

  const value = useMemo<Store>(() => {
    function getDriver(id: string) {
      return drivers.find((d) => d.id === id)
    }
    function getLineItem(id: string) {
      return lineItems.find((li) => li.id === id)
    }
    function getModel(id: string) {
      return models.find((m) => m.id === id)
    }

    function addDriver(input: {
      name: string
      type: DriverType
      frequency: string
      netsuiteMapping: NetsuiteMapping | null
      fields: DriverFields
      derivationLogic: string
      reason: string
    }) {
      const id = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '') || `driver${drivers.length + 1}`
      const reason = input.reason || 'Initial creation'
      const entry: HistoryEntry = {
        date: nowIso(),
        editor: CURRENT_USER,
        field: 'created',
        oldValue: '—',
        newValue: 'Driver created',
        reason,
      }
      const driver: Driver = {
        id,
        name: input.name,
        type: input.type,
        frequency: input.frequency,
        netsuiteMapping: input.netsuiteMapping,
        fields: input.fields,
        derivationLogic: input.derivationLogic,
        lastEditReason: reason,
        history: [entry],
        updatedAt: entry.date,
        updatedBy: CURRENT_USER,
      }
      setDrivers((prev) => [driver, ...prev])
      return driver
    }

    function updateDriver(
      id: string,
      patch: {
        name?: string
        frequency?: string
        netsuiteMapping?: NetsuiteMapping | null
        fields?: DriverFields
        derivationLogic?: string
      },
      reason: string,
    ) {
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d
          const newEntries: HistoryEntry[] = []
          const date = nowIso()
          if (patch.name !== undefined && patch.name !== d.name) {
            newEntries.push({ date, editor: CURRENT_USER, field: 'name', oldValue: d.name, newValue: patch.name, reason })
          }
          if (patch.frequency !== undefined && patch.frequency !== d.frequency) {
            newEntries.push({ date, editor: CURRENT_USER, field: 'frequency', oldValue: d.frequency, newValue: patch.frequency, reason })
          }
          if (patch.derivationLogic !== undefined && patch.derivationLogic !== d.derivationLogic) {
            newEntries.push({
              date,
              editor: CURRENT_USER,
              field: 'derivationLogic',
              oldValue: d.derivationLogic,
              newValue: patch.derivationLogic,
              reason,
            })
          }
          if (patch.fields) {
            Object.entries(patch.fields).forEach(([key, val]) => {
              const oldVal = (d.fields as Record<string, unknown>)[key]
              if (fieldDisplay(oldVal) !== fieldDisplay(val)) {
                newEntries.push({
                  date,
                  editor: CURRENT_USER,
                  field: key,
                  oldValue: fieldDisplay(oldVal),
                  newValue: fieldDisplay(val),
                  reason,
                })
              }
            })
          }
          if (patch.netsuiteMapping !== undefined) {
            const oldMapping = d.netsuiteMapping
            ;(['subsidiary', 'account', 'queryDescription'] as const).forEach((key) => {
              const oldVal = oldMapping?.[key]
              const newVal = patch.netsuiteMapping?.[key]
              if (fieldDisplay(oldVal) !== fieldDisplay(newVal)) {
                newEntries.push({
                  date,
                  editor: CURRENT_USER,
                  field: `netsuiteMapping.${key}`,
                  oldValue: fieldDisplay(oldVal),
                  newValue: fieldDisplay(newVal),
                  reason,
                })
              }
            })
          }
          if (newEntries.length === 0) return d
          return {
            ...d,
            name: patch.name ?? d.name,
            frequency: patch.frequency ?? d.frequency,
            derivationLogic: patch.derivationLogic ?? d.derivationLogic,
            netsuiteMapping: patch.netsuiteMapping !== undefined ? patch.netsuiteMapping : d.netsuiteMapping,
            fields: patch.fields ? { ...d.fields, ...patch.fields } : d.fields,
            lastEditReason: reason,
            history: [...newEntries, ...d.history],
            updatedAt: date,
            updatedBy: CURRENT_USER,
          }
        }),
      )
    }

    function addModel(input: { name: string; fiscalYear: string; description: string }) {
      const id = `model_${Date.now()}`
      // Create Manually and Build with AI both converge on the same default structure
      // (Section 3) — every new model gets the full ChargePoint line-item layout,
      // entirely empty (em-dash) until drivers are wired, per Section 1.6.
      const { rowLayout: newRowLayout, lineItems: newLineItems } = buildDefaultStructure(`${id}_`)
      setLineItems((prev) => [...prev, ...newLineItems])
      const model: CashFlowModel = {
        id,
        name: input.name,
        fiscalYear: input.fiscalYear,
        description: input.description,
        status: 'Draft',
        rowLayout: newRowLayout,
        history: [],
        updatedAt: nowIso(),
      }
      setModels((prev) => [model, ...prev])
      return model
    }

    // Terminal section total that a freshly-added, ungrouped leaf rolls up into.
    const CATEGORY_TOTAL_ID: Record<LineItemCategory, string> = {
      receipts: 'totalReceipts',
      disbursements: 'totalOperatingDisbursements',
    }

    function addLineItem(modelId: string, category: LineItemCategory, item: Omit<LineItem, 'id' | 'category'>) {
      const id = `li_${Date.now()}`
      const lineItem: LineItem = { ...item, id, category }
      setLineItems((prev) => [...prev, lineItem])
      setModels((prev) =>
        prev.map((m) => {
          if (m.id !== modelId) return m
          const histEntry: ModelHistoryEntry = {
            date: nowIso(),
            editor: CURRENT_USER,
            change: 'line_item_added',
            lineItemName: item.name,
          }
          const newRow: RowDef = { id, name: item.name, kind: 'leaf', category, lineItemId: id }
          const totalId = CATEGORY_TOTAL_ID[category]
          const insertAt = m.rowLayout.findIndex((r) => r.id === totalId)
          const nextLayout =
            insertAt === -1
              ? [...m.rowLayout, newRow]
              : [...m.rowLayout.slice(0, insertAt), newRow, ...m.rowLayout.slice(insertAt)]
          const layoutWithTotalUpdated = nextLayout.map((r) =>
            r.id === totalId ? { ...r, sumIds: [...(r.sumIds ?? []), id] } : r,
          )
          return { ...m, rowLayout: layoutWithTotalUpdated, history: [histEntry, ...m.history], updatedAt: histEntry.date }
        }),
      )
      return lineItem
    }

    function updateLineItem(modelId: string, id: string, patch: Partial<LineItem>) {
      const existing = lineItems.find((li) => li.id === id)
      setLineItems((prev) => prev.map((li) => (li.id === id ? { ...li, ...patch } : li)))
      if (existing && patch.formula !== undefined && patch.formula !== existing.formula) {
        setModels((prev) =>
          prev.map((m) => {
            if (m.id !== modelId) return m
            const histEntry: ModelHistoryEntry = {
              date: nowIso(),
              editor: CURRENT_USER,
              change: 'formula_changed',
              lineItemName: patch.name ?? existing.name,
              oldFormula: existing.formula || '(direct entry)',
              newFormula: patch.formula || '(direct entry)',
            }
            return { ...m, history: [histEntry, ...m.history], updatedAt: histEntry.date }
          }),
        )
      }
    }

    function removeLineItem(modelId: string, id: string) {
      const existing = lineItems.find((li) => li.id === id)
      setLineItems((prev) => prev.filter((li) => li.id !== id))
      setModels((prev) =>
        prev.map((m) => {
          if (m.id !== modelId) return m
          const histEntry: ModelHistoryEntry = {
            date: nowIso(),
            editor: CURRENT_USER,
            change: 'line_item_removed',
            lineItemName: existing?.name ?? id,
          }
          const nextLayout = m.rowLayout
            .filter((r) => r.id !== id)
            .map((r) => (r.sumIds ? { ...r, sumIds: r.sumIds.filter((sid) => sid !== id) } : r))
          return {
            ...m,
            rowLayout: nextLayout,
            history: [histEntry, ...m.history],
            updatedAt: histEntry.date,
          }
        }),
      )
    }

    return {
      drivers,
      models,
      lineItems,
      forecast,
      getDriver,
      getLineItem,
      getModel,
      addDriver,
      updateDriver,
      addModel,
      addLineItem,
      updateLineItem,
      removeLineItem,
    }
  }, [drivers, models, lineItems, forecast])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
