import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Navbar from '@/components/layout/Navbar'
import AlertBanner from '@/components/alerts/AlertBanner'
import { CheckCircle, MapPin } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/services/api'

export default function VolunteerDashboard() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['reports', 'pending'],
    queryFn: async () => { const { data } = await api.get('/reports?status=pending,verified&limit=20'); return data }
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      api.patch(`/reports/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', 'pending'] })
  })

  const reports = data?.items || []

  return (
    <div className="min-h-screen bg-gray-950">
      <AlertBanner />
      <Navbar />
      <div className="page-container py-8">
        <div className="greeting-header">
          <div>
            <h1>{t('dashboard.greeting', { name: user?.full_name })}</h1>
            <p>{t('dashboard.volunteer.title')}</p>
          </div>
        </div>
        <h2 className="text-lg font-semibold text-white mb-4">{t('dashboard.reports_pending')}</h2>
        {reports.length === 0 ? (
          <div className="card text-center py-10 text-gray-500">{t('notif.no_notifs')}</div>
        ) : (
          <div className="space-y-3">
            {reports.map((r: any) => (
              <div key={r.id} className="card">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge badge-${r.severity === 'critical' ? 'critical' : r.severity === 'high' ? 'danger' : 'warning'}`}>
                        {t(`report.severity.${r.severity}`)}
                      </span>
                      <span className={`badge badge-${r.status}`}>{t(`report.status.${r.status}`)}</span>
                    </div>
                    <p className="font-semibold text-white">{r.title}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <MapPin size={11} />{r.address_text || r.province || 'Chưa rõ'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {r.status === 'pending' && (
                      <button onClick={() => updateStatus.mutate({ id: r.id, status: 'verified' })} className="btn-primary text-sm py-1.5 px-3">
                        <CheckCircle size={14} />Xác minh
                      </button>
                    )}
                    {r.status === 'verified' && (
                      <button onClick={() => updateStatus.mutate({ id: r.id, status: 'in_progress' })} className="btn-primary text-sm py-1.5 px-3">
                        Xử lý
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
