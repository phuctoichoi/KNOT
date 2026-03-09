import { useMapStore } from '@/store/mapStore'
import { useTranslation } from 'react-i18next'
import { Layers, Thermometer, AlertTriangle, MapPin, Shield } from 'lucide-react'

const DISASTER_TYPES = ['flood','landslide','storm','fire','earthquake','infrastructure'] as const

export default function MapControls() {
  const { t } = useTranslation()
  const { layers, filters, setLayer, setFilters } = useMapStore()

  const toggleType = (type: string) => {
    const current = filters.types
    const updated = current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    setFilters({ types: updated })
  }

  return (
    <div className="glass rounded-xl p-3 space-y-3 text-sm shadow-2xl border border-white/10">
      <p className="font-semibold text-white flex items-center gap-2"><Layers size={14} />Lớp bản đồ</p>

      {/* Layer toggles */}
      <div className="space-y-1.5">
        {([
          ['reports',    'map.layer.reports',    <MapPin size={13} />],
          ['support',    'map.layer.support',    <Shield size={13} />],
          ['heatmap',    'map.layer.heatmap',    <Thermometer size={13} />],
          ['zones',      'map.layer.zones',      <AlertTriangle size={13} />],
          ['dangerZones','map.layer.danger',     <AlertTriangle size={13} className="text-red-400" />],
        ] as const).map(([key, label, icon]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
            <input type="checkbox" className="accent-red-500"
              checked={layers[key as keyof typeof layers]}
              onChange={(e) => setLayer(key as any, e.target.checked)} />
            {icon}<span>{t(label)}</span>
          </label>
        ))}
      </div>

      {/* Type filter */}
      <div className="border-t border-white/10 pt-2">
        <p className="text-gray-400 text-xs mb-2">Loại thiên tai</p>
        <div className="flex flex-wrap gap-1">
          {DISASTER_TYPES.map((type) => (
            <button key={type} onClick={() => toggleType(type)}
              className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                filters.types.includes(type)
                  ? 'bg-red-600/80 border-red-500 text-white'
                  : 'border-gray-700 text-gray-500 hover:border-gray-500'
              }`}>
              {t(`report.disaster.${type}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
