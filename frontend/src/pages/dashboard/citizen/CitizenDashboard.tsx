import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import Navbar from '@/components/layout/Navbar'
import AlertBanner from '@/components/alerts/AlertBanner'
import { Link } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import api from '@/services/api'

const STATUS_CLASS: Record<string, string> = {
  pending: 'badge-pending', verified: 'badge-verified',
  in_progress: 'badge-in-progress', resolved: 'badge-resolved', rejected: 'badge-rejected'
}

export default function CitizenDashboard() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['my-reports'],
    queryFn: async () => { const { data } = await api.get('/reports/mine'); return data }
  })
  const reports = data?.items || []

  return (
    <div className="min-h-screen bg-transparent">
      <AlertBanner />
      <Navbar />
      <div className="page-container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.citizen.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('dashboard.greeting', { name: user?.full_name })}</p>
          </div>
          <Link to="/?report=1" onClick={() => document.getElementById('report-form')?.scrollIntoView()} className="btn-danger">
            <Plus size={16} />{t('dashboard.new_report')}
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: t('dashboard.total_reports'), value: reports.length },
            { label: t('report.status.pending'), value: reports.filter((r: any) => r.status === 'pending').length },
            { label: t('report.status.in_progress'), value: reports.filter((r: any) => r.status === 'in_progress').length },
            { label: t('report.status.resolved'), value: reports.filter((r: any) => r.status === 'resolved').length },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Reports list */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FileText size={18} />{t('dashboard.my_reports')}</h2>
          {isLoading ? <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p> : reports.length === 0 ? (
            <div className="card text-center py-10 text-gray-500">{t('dashboard.no_reports')}</div>
          ) : (
            <div className="space-y-3">
              {reports.map((r: any) => (
                <div key={r.id} className="card-hover flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{r.title}</p>
                    <p className="text-xs text-gray-500">{t(`report.disaster.${r.disaster_type}`)} • {r.province || t('common.unknown_location')}</p>
                  </div>
                  <span className={STATUS_CLASS[r.status] || 'badge'}>{t(`report.status.${r.status}`)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
