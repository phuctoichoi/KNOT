import MainLayout from '@/components/layout/MainLayout'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import api from '@/services/api'

const SEVERITY_CLASSES: Record<string, string> = {
  critical: 'bg-red-100 border-red-200 text-red-900 dark:bg-red-900/40 dark:border-red-700/60 dark:text-red-200',
  danger:   'bg-orange-100 border-orange-200 text-orange-900 dark:bg-orange-900/40 dark:border-orange-700/60 dark:text-orange-200',
  warning:  'bg-yellow-100 border-yellow-200 text-yellow-900 dark:bg-yellow-900/40 dark:border-yellow-700/60 dark:text-yellow-200',
  info:     'bg-blue-100 border-blue-200 text-blue-900 dark:bg-blue-900/40 dark:border-blue-700/60 dark:text-blue-200',
}

export default function AlertsPage() {
  const { t, i18n } = useTranslation()
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => { const { data } = await api.get('/alerts'); return data },
  })

  return (
    <MainLayout>
      <div className="page-container py-10">
        <h1 className="section-title flex items-center gap-3 text-gray-900 dark:text-white">
          <AlertTriangle className="text-yellow-400" size={28} />
          {t('nav.alerts')}
        </h1>
        {isLoading ? (
          <p className="text-gray-400">{t('common.loading')}</p>
        ) : alerts.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">{t('admin.no_active_alerts')}</div>
        ) : (
          <div className="space-y-4">
            {alerts.map((a: any) => (
              <div key={a.id} className={`border rounded-xl p-5 ${SEVERITY_CLASSES[a.severity] || SEVERITY_CLASSES.info}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge badge-${a.severity}`}>{t(`alert.severity.${a.severity}`)}</span>
                      {a.province && <span className="text-xs opacity-70">📍 {a.province}</span>}
                    </div>
                    <h3 className="font-bold text-lg">{i18n.language === 'en' && a.title_en ? a.title_en : a.title}</h3>
                    <p className="mt-2 text-sm opacity-90">
                      {i18n.language === 'en' && a.body_en ? a.body_en : a.body}
                    </p>
                  </div>
                </div>
                <p className="text-xs opacity-50 mt-3">{new Date(a.created_at).toLocaleString('vi-VN')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
