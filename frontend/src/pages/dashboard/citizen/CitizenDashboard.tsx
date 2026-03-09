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
    <div className="min-h-screen bg-gray-950">
      <AlertBanner />
      <Navbar />
      <div className="page-container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('dashboard.citizen.title')}</h1>
            <p className="text-gray-400">Xin chào, <span className="text-white">{user?.full_name}</span></p>
          </div>
          <Link to="/?report=1" onClick={() => document.getElementById('report-form')?.scrollIntoView()} className="btn-danger">
            <Plus size={16} />{t('dashboard.new_report')}
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Tổng báo cáo', value: reports.length },
            { label: 'Chờ xử lý', value: reports.filter((r: any) => r.status === 'pending').length },
            { label: 'Đang xử lý', value: reports.filter((r: any) => r.status === 'in_progress').length },
            { label: 'Đã giải quyết', value: reports.filter((r: any) => r.status === 'resolved').length },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Reports list */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><FileText size={18} />{t('dashboard.my_reports')}</h2>
          {isLoading ? <p className="text-gray-400">{t('common.loading')}</p> : reports.length === 0 ? (
            <div className="card text-center py-10 text-gray-500">Bạn chưa có báo cáo nào</div>
          ) : (
            <div className="space-y-3">
              {reports.map((r: any) => (
                <div key={r.id} className="card-hover flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white text-sm">{r.title}</p>
                    <p className="text-xs text-gray-500">{t(`report.disaster.${r.disaster_type}`)} • {r.province || 'Chưa rõ địa điểm'}</p>
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
