import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MapLayers {
  reports: boolean
  support: boolean
  heatmap: boolean
  zones: boolean
  dangerZones: boolean
}

interface MapFilters {
  types: string[]
  statuses: string[]
  province?: string
}

interface MapStore {
  layers: MapLayers
  filters: MapFilters
  setLayer: (key: keyof MapLayers, val: boolean) => void
  setFilters: (f: Partial<MapFilters>) => void
  resetFilters: () => void
}

const DEFAULT_FILTERS: MapFilters = {
  types: ['flood', 'landslide', 'storm', 'fire', 'earthquake', 'infrastructure'],
  statuses: ['pending', 'verified', 'in_progress'],
}

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      layers: { reports: true, support: true, heatmap: false, zones: true, dangerZones: true },
      filters: DEFAULT_FILTERS,
      setLayer: (key, val) => set((s) => ({ layers: { ...s.layers, [key]: val } })),
      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),
    }),
    { name: 'knot-map-prefs' }
  )
)
