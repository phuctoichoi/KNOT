import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Navbar from '@/components/layout/Navbar'
import AlertBanner from '@/components/alerts/AlertBanner'
import { CheckCircle, MapPin } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/services/api'
import { getDistance, formatDistance } from '@/utils/distance'
import ReportDetailModal from '@/components/reports/ReportDetailModal'

export default function VolunteerDashboard() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedProvince, setSelectedProvince] = useState<string>('all')

  const { data } = useQuery({
    queryKey: ['reports', 'pending'],
    queryFn: async () => { const { data } = await api.get('/reports?status=pending,verified,in_progress&limit=20'); return data }
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      api.patch(`/reports/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', 'pending'] })
  })

  const reports = data?.items || []

  // Helper to extract province/city from address_text if province field is missing or generic
  const extractProvince = (r: any) => {
    if (r.province) return r.province
    if (!r.address_text) return null

    // Attempt to extract from address string (e.g. "..., Thành phố Cần Thơ, ...")
    // Usually the province/city is near the end before the country or zip code
    const parts = r.address_text.split(',').map((p: string) => p.trim())

    // Look for keywords
    const cityOrProvince = parts.find((p: string) =>
      p.toLowerCase().startsWith('thành phố') ||
      p.toLowerCase().startsWith('tỉnh') ||
      p.toLowerCase() === 'hà nội' || p.toLowerCase() === 'đà nẵng' ||
      p.toLowerCase() === 'cần thơ' || p.toLowerCase() === 'hải phòng' ||
      p.toLowerCase() === 'hồ chí minh'
    )

    if (cityOrProvince) return cityOrProvince

    // Fallback: just return the 2nd to last part if it exists and isn't a country
    if (parts.length >= 2) {
      const candidate = parts[parts.length - 2]
      if (!candidate.match(/\d+/) && candidate.toLowerCase() !== 'việt nam') {
        return candidate
      }
    }

    return null
  }

  const availableProvinces = Array.from(
    new Set(reports.map(extractProvince).filter(Boolean))
  ) as string[]

  const filteredReports = reports.filter((r: any) =>
    selectedProvince === 'all' || extractProvince(r) === selectedProvince
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      <AlertBanner />
      <Navbar />
      <div className="page-container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.volunteer.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('dashboard.greeting', { name: user?.full_name })}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('dashboard.reports_pending')}</h2>
          {availableProvinces.length > 0 && (
            <select
              title={t('common.filter_by_province')}
              value={selectedProvince}
              onChange={e => setSelectedProvince(e.target.value)}
              className="select w-full sm:w-auto text-sm py-1.5"
            >
              <option value="all">{t('common.all_regions')}</option>
              {availableProvinces.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </div>

        {reports.length === 0 ? (
          <div className="card text-center py-10 text-gray-500">{t('dashboard.no_reports')}</div>
        ) : filteredReports.length === 0 ? (
          <div className="card text-center py-10 text-gray-500">{t('dashboard.no_reports_in_region')}</div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((r: any) => (
              <div key={r.id} className="card cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors" onClick={() => setExpanded(e => e === r.id ? null : r.id)}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge badge-${r.severity === 'critical' ? 'critical' : r.severity === 'high' ? 'danger' : 'warning'}`}>
                        {t(`report.severity.${r.severity}`)}
                      </span>
                      <span className={`badge badge-${r.status}`}>{t(`report.status.${r.status}`)}</span>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">{r.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                      <MapPin size={11} />{r.address_text || r.province || t('common.unknown')}
                      {user?.lat && user?.lng && r.lat && r.lng && (
                        <span className="ml-2 text-red-400 font-medium whitespace-nowrap">
                          ({formatDistance(getDistance(user.lat, user.lng, r.lat, r.lng))})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal View for Expanded Report */}
        {expanded && reports.find((r: any) => r.id === expanded) && (
          <ReportDetailModal
            report={reports.find((r: any) => r.id === expanded)}
            userLat={user?.lat}
            userLng={user?.lng}
            onClose={() => setExpanded(null)}
            actions={{
              verify: (id: string) => updateStatus.mutate({ id, status: 'verified' }),
              process: (id: string) => updateStatus.mutate({ id, status: 'in_progress' }),
              resolve: (id: string) => updateStatus.mutate({ id, status: 'resolved' }),
            }}
          />
        )}
      </div>
    </div>
  )
}
