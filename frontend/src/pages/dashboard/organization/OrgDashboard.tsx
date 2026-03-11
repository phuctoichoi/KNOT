import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Navbar from '@/components/layout/Navbar'
import AlertBanner from '@/components/alerts/AlertBanner'
import { Megaphone, Trash2, Route, Phone, Mail, Loader2, CheckCircle, MapPin, FileText } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/services/api'
import { getDistance, formatDistance } from '@/utils/distance'
import ReportDetailModal from '@/components/reports/ReportDetailModal'

type Tab = 'relief' | 'reports'

export default function OrgDashboard() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('relief')
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedProvince, setSelectedProvince] = useState<string>('all')
  const [form, setForm] = useState({
    title: '', content: '', route: '', province: '',
    district: '', contact_phone: '', contact_email: '',
    starts_at: '', expires_at: '',
  })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Query remaining relief posts
  const { data: reliefData, isLoading: reliefLoading } = useQuery({
    queryKey: ['relief', 'mine'],
    queryFn: async () => {
      const { data } = await api.get('/support/relief')
      return data
    },
  })
  const reliefPosts: any[] = reliefData?.items ?? []
  const myPosts = reliefPosts.filter((p: any) => p.org_id === user?.id)

  // Query pending reports 
  const { data: reportsData } = useQuery({
    queryKey: ['reports', 'pending'],
    queryFn: async () => { const { data } = await api.get('/reports?status=pending,verified,in_progress&limit=20'); return data }
  })
  const reports = reportsData?.items || []

  // Helper to extract province/city from address_text if province field is missing or generic
  const extractProvince = (r: any) => {
    if (r.province) return r.province
    if (!r.address_text) return null

    const parts = r.address_text.split(',').map((p: string) => p.trim())
    const cityOrProvince = parts.find((p: string) =>
      p.toLowerCase().startsWith('thành phố') ||
      p.toLowerCase().startsWith('tỉnh') ||
      p.toLowerCase() === 'hà nội' || p.toLowerCase() === 'đà nẵng' ||
      p.toLowerCase() === 'cần thơ' || p.toLowerCase() === 'hải phòng' ||
      p.toLowerCase() === 'hồ chí minh'
    )
    if (cityOrProvince) return cityOrProvince
    if (parts.length >= 2) {
      const candidate = parts[parts.length - 2]
      if (!candidate.match(/\d+/) && candidate.toLowerCase() !== 'việt nam') return candidate
    }
    return null
  }

  const availableProvinces = Array.from(
    new Set(reports.map(extractProvince).filter(Boolean))
  ) as string[]

  const filteredReports = reports.filter((r: any) =>
    selectedProvince === 'all' || extractProvince(r) === selectedProvince
  )

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/support/relief', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['relief'] })
      setShowForm(false)
      setFormSuccess('Đã đăng bài thông báo cứu trợ thành công!')
      setForm({ title: '', content: '', route: '', province: '', district: '', contact_phone: '', contact_email: '', starts_at: '', expires_at: '' })
      setTimeout(() => setFormSuccess(''), 4000)
    },
    onError: (e: any) => setFormError(e?.response?.data?.detail || 'Đăng bài thất bại'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/support/relief/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['relief'] }),
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      api.patch(`/reports/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', 'pending'] })
  })

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.title.trim() || !form.content.trim()) {
      setFormError('Tiêu đề và nội dung không được để trống')
      return
    }
    const body: any = {
      title: form.title, content: form.content,
      route: form.route || undefined,
      province: form.province || undefined,
      district: form.district || undefined,
      contact_phone: form.contact_phone || undefined,
      contact_email: form.contact_email || undefined,
      starts_at: form.starts_at || undefined,
      expires_at: form.expires_at || undefined,
    }
    createMutation.mutate(body)
  }

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const TABS: { key: Tab; label: string }[] = [
    { key: 'relief', label: t('dashboard.relief_posts') },
    { key: 'reports', label: t('dashboard.reports_pending') },
  ]

  return (
    <div className="min-h-screen bg-gray-950">
      <AlertBanner />
      <Navbar />
      <div className="page-container py-8">
        {/* Greeting */}
        <div className="flex items-center justify-between mb-8">
          <div className="greeting-header">
            <div>
              <h1>{t('dashboard.greeting', { name: user?.full_name })}</h1>
              <p>{user?.organization_name}</p>
            </div>
          </div>
          {tab === 'relief' && (
            <button className="btn-danger" onClick={() => { setShowForm(v => !v); setFormError(''); setFormSuccess('') }}>
              <Megaphone size={16} /> {showForm ? 'Đóng' : 'Đăng thông báo'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-800">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === key ? 'border-red-500 text-red-400' : 'border-transparent text-gray-400 hover:text-white'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Relief Tab ── */}
        {tab === 'relief' && (
          <div className="space-y-6">
            {formSuccess && (
              <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 text-green-300 text-sm">{formSuccess}</div>
            )}

            {/* Create form */}
            {showForm && (
              <div className="card border border-red-900/40">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Megaphone size={16} className="text-red-400" />Đăng bài thông báo cứu trợ</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="label">Tiêu đề *</label>
                    <input className="input" value={form.title} onChange={update('title')} placeholder="VD: Đoàn xe cứu trợ qua Quận 9 chiều nay" required />
                  </div>
                  <div>
                    <label className="label">Nội dung *</label>
                    <textarea className="input min-h-[100px] resize-y" value={form.content} onChange={update('content')} placeholder="Mô tả chi tiết hoạt động cứu trợ của tổ chức bạn..." required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="label">Lộ trình / Tuyến đường</label>
                      <input className="input" value={form.route} onChange={update('route')} placeholder="VD: Nguyễn Văn Cừ → Võ Văn Kiệt" />
                    </div>
                    <div>
                      <label className="label">Tỉnh / Thành phố</label>
                      <input className="input" value={form.province} onChange={update('province')} placeholder="VD: TP. Hồ Chí Minh" />
                    </div>
                    <div>
                      <label className="label">Quận / Huyện</label>
                      <input className="input" value={form.district} onChange={update('district')} placeholder="VD: Quận 9" />
                    </div>
                    <div>
                      <label className="label">Số điện thoại liên hệ</label>
                      <input className="input" value={form.contact_phone} onChange={update('contact_phone')} placeholder="0xxx xxx xxx" type="tel" />
                    </div>
                    <div>
                      <label className="label">Email liên hệ</label>
                      <input className="input" value={form.contact_email} onChange={update('contact_email')} placeholder="contact@org.com" type="email" />
                    </div>
                    <div>
                      <label className="label">Thời gian bắt đầu</label>
                      <input title="Thời gian bắt đầu" className="input" value={form.starts_at} onChange={update('starts_at')} type="datetime-local" />
                    </div>
                    <div>
                      <label className="label">Hết hạn vào lúc</label>
                      <input title="Hết hạn vào lúc" className="input" value={form.expires_at} onChange={update('expires_at')} type="datetime-local" />
                    </div>
                  </div>
                  {formError && <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">{formError}</div>}
                  <button type="submit" disabled={createMutation.isPending} className="btn-danger w-full py-3">
                    {createMutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Đang đăng...</> : <><Megaphone size={16} /> Đăng bài</>}
                  </button>
                </form>
              </div>
            )}

            {/* My posts list */}
            <div>
              <h3 className="text-white font-semibold mb-3">Bài đăng của bạn ({myPosts.length})</h3>
              {reliefLoading ? (
                <p className="text-gray-400 text-sm">Đang tải...</p>
              ) : myPosts.length === 0 ? (
                <div className="card text-center py-8 text-gray-500">Bạn chưa có bài đăng nào</div>
              ) : (
                <div className="space-y-3">
                  {myPosts.map((p: any) => (
                    <div key={p.id} className="card flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm">{p.title}</p>
                        {p.route && (
                          <p className="text-xs text-yellow-400 flex items-center gap-1 mt-0.5">
                            <Route size={11} /> {p.route}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.content}</p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          {p.contact_phone && <span className="flex items-center gap-1"><Phone size={10} />{p.contact_phone}</span>}
                          {p.contact_email && <span className="flex items-center gap-1"><Mail size={10} />{p.contact_email}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => { if (confirm('Xóa bài đăng này?')) deleteMutation.mutate(p.id) }}
                        className="text-red-400 hover:text-red-300 p-1 shrink-0"
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Pending Reports Tab ── */}
        {tab === 'reports' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText size={18} />{t('dashboard.reports_pending')}
              </h2>
              {availableProvinces.length > 0 && (
                <select
                  title={t('common.filter_by_province', 'Lọc theo tỉnh/thành')}
                  value={selectedProvince}
                  onChange={e => setSelectedProvince(e.target.value)}
                  className="select w-full sm:w-auto text-sm py-1.5"
                >
                  <option value="all">Tất cả khu vực</option>
                  {availableProvinces.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              )}
            </div>

            {reports.length === 0 ? (
              <div className="card text-center py-10 text-gray-500">{t('notif.no_notifs')}</div>
            ) : filteredReports.length === 0 ? (
              <div className="card text-center py-10 text-gray-500">Không có báo cáo ở khu vực này</div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((r: any) => (
                  <div key={r.id} className="card cursor-pointer hover:bg-gray-800/80 transition-colors" onClick={() => setExpanded(e => e === r.id ? null : r.id)}>
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

