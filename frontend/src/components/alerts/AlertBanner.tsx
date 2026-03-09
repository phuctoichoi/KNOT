import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'
import api from '@/services/api'

interface Alert {
  id: string
  title: string
  title_en: string
  body: string
  severity: 'info' | 'warning' | 'danger' | 'critical'
  province?: string
}

export default function AlertBanner() {
  const { t, i18n } = useTranslation()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ['alerts', 'active'],
    queryFn: async () => {
      const { data } = await api.get('/alerts')
      return data
    },
    refetchInterval: 60_000,
  })

  const visible = (alerts || []).filter((a) => !dismissed.has(a.id)).slice(0, 3)
  if (!visible.length) return null

  const severityClass: Record<string, string> = {
    critical: 'alert-critical',
    danger:   'alert-danger',
    warning:  'alert-warning',
    info:     'alert-info',
  }

  return (
    <div className="z-40">
      {visible.map((alert) => (
        <div key={alert.id} className={`${severityClass[alert.severity]} px-4 py-2 flex items-center justify-between gap-3 text-sm`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="font-semibold">{t('alert.banner.title')}</span>
            <span className="truncate">
              {i18n.language === 'en' && alert.title_en ? alert.title_en : alert.title}
            </span>
            {alert.province && (
              <span className="shrink-0 text-xs opacity-75">• {alert.province}</span>
            )}
          </div>
          <button onClick={() => setDismissed((s) => new Set([...s, alert.id]))} className="shrink-0 hover:opacity-70 transition-opacity">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
