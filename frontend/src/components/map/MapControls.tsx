import { useMapStore } from '@/store/mapStore'
import { useTranslation } from 'react-i18next'
import { Filter } from 'lucide-react'

const DISASTER_TYPES = ['flood', 'landslide', 'storm', 'fire', 'earthquake', 'infrastructure', 'other'] as const

export default function MapControls() {
  const { t } = useTranslation()
  const { filters, setFilters } = useMapStore()

  const toggleType = (type: string) => {
    const current = filters.types
    const updated = current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    setFilters({ types: updated })
  }

  return (
    <div className="glass rounded-xl p-3 space-y-3 text-sm shadow-2xl border border-gray-200/50 dark:border-white/10">
      <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Filter size={14} />Bộ lọc hiển thị</p>

      {/* Type filter */}
      <div className="pt-1">
        <p className="text-gray-600 dark:text-gray-400 text-xs mb-2">Loại thiên tai</p>
        <div className="flex flex-wrap gap-1.5">
          {DISASTER_TYPES.map((type) => (
            <button key={type} onClick={() => toggleType(type)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filters.types.includes(type)
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200'
                }`}>
              {t(`report.disaster.${type}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
