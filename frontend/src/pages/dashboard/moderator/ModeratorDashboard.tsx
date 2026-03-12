import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Navbar from '@/components/layout/Navbar'
import AlertBanner from '@/components/alerts/AlertBanner'
import { CheckCircle, XCircle, Users, User, Megaphone, Trash2, Route, AlertTriangle, Bell } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/services/api'
import { useState } from 'react'

export default function ModeratorDashboard() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [alertForm, setAlertForm] = useState({ title: '', body: '', severity: 'warning', province: '' })
  
  const { data: pending } = useQuery({
    queryKey: ['users', 'pending'],
    queryFn: async () => { const { data } = await api.get('/users/pending'); return data }
  })

  const { data: reliefData } = useQuery({
    queryKey: ['relief', 'all'],
    queryFn: async () => { const { data } = await api.get('/support/relief'); return data }
  })

  const { data: alerts = [] } = useQuery({
    queryKey: ['admin', 'alerts'],
    queryFn: async () => { const { data } = await api.get('/alerts'); return data }
  })

  const broadcastAlert = useMutation({
    mutationFn: () => api.post('/alerts', alertForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'alerts'] }); setAlertForm({ title: '', body: '', severity: 'warning', province: '' }) }
  })

  const deactivateAlert = useMutation({
    mutationFn: (id: string) => api.patch(`/alerts/${id}`, { is_active: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'alerts'] })
  })

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) =>
      api.patch(`/users/${userId}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', 'pending'] })
  })

  const deleteRelief = useMutation({
    mutationFn: (id: string) => api.delete(`/support/relief/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['relief'] }),
  })

  const pendingUsers = pending?.items || []
  const reliefPosts: any[] = reliefData?.items ?? []

  const SEV_COLORS: Record<string, string> = {
    info: 'text-blue-300 bg-blue-500/20',
    warning: 'text-yellow-300 bg-yellow-500/20',
    danger: 'text-orange-300 bg-orange-500/20',
    critical: 'text-red-300 bg-red-500/20',
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AlertBanner />
      <Navbar />
      <div className="page-container py-8 space-y-10">
        <div className="greeting-header">
          <div>
            <h1>{t('dashboard.greeting', { name: user?.full_name })}</h1>
            <p>{t('dashboard.moderator.title')}</p>
          </div>
        </div>

        {/* Pending approvals */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users size={18} className="text-yellow-400" />
            {t('dashboard.pending_approvals')}
            {pendingUsers.length > 0 && <span className="badge badge-pending">{pendingUsers.length}</span>}
          </h2>
          {pendingUsers.length === 0 ? (
            <div className="card text-center py-10 text-gray-500">{t('dashboard.no_pending_accounts')}</div>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((u: any) => (
                <div key={u.id} className="card flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{u.full_name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t(`role.${u.role}`)} {u.organization_name ? `• ${u.organization_name}` : ''} {u.province ? `• ${u.province}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{t('common.registered_at')} {new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus.mutate({ userId: u.id, status: 'approved' })}
                      className="btn-primary text-sm py-1.5 px-3">
                      <CheckCircle size={14} />{t('common.approve')}
                    </button>
                    <button onClick={() => updateStatus.mutate({ userId: u.id, status: 'rejected' })}
                      className="btn-outline text-sm py-1.5 px-3 text-red-400 border-red-800 hover:border-red-600">
                      <XCircle size={14} />{t('common.reject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Relief posts management */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Megaphone size={18} className="text-red-400" />
            {t('dashboard.relief_posts')}
            <span className="badge bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{reliefPosts.length}</span>
          </h2>
          {reliefPosts.length === 0 ? (
            <div className="card text-center py-8 text-gray-500">{t('notif.no_notifs')}</div>
          ) : (
            <div className="space-y-3">
              {reliefPosts.map((p: any) => (
                <div key={p.id} className="card flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{p.title}</p>
                    {p.org_name && <p className="text-xs text-red-400">🏢 {p.org_name}</p>}
                    {p.route && (
                      <p className="text-xs text-yellow-400 flex items-center gap-1 mt-0.5">
                        <Route size={11} /> {p.route}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.content}</p>
                    <p className="text-xs text-gray-600 mt-1">{new Date(p.created_at).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => { if (confirm(t('common.confirm_delete_post'))) deleteRelief.mutate(p.id) }}
                    className="text-red-400 hover:text-red-300 p-1 shrink-0"
                    title={t('common.delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Alerts management */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" />
            {t('nav.alerts')} {/* Reuse nav.alerts or similar key if prefer, but let's just stick to the section */}
          </h2>

          <div className="card space-y-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><AlertTriangle size={16} className="text-red-400" /> {t('admin.new_alert_title')}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <input className="input" placeholder={t('admin.broadcast_placeholder')} value={alertForm.title}
                onChange={e => setAlertForm(f => ({ ...f, title: e.target.value }))} />
              <select className="input" value={alertForm.severity} title={t('report.severity')}
                onChange={e => setAlertForm(f => ({ ...f, severity: e.target.value }))}>
                <option value="info">ℹ️ {t('alert.severity.info')}</option>
                <option value="warning">⚠️ {t('alert.severity.warning')}</option>
                <option value="danger">🔴 {t('alert.severity.danger')}</option>
                <option value="critical">🚨 {t('alert.severity.critical')}</option>
              </select>
              <textarea className="input lg:col-span-2 h-20 resize-none" placeholder={t('admin.body_placeholder')}
                value={alertForm.body} onChange={e => setAlertForm(f => ({ ...f, body: e.target.value }))} />
              <input className="input" placeholder={`${t('profile.province')} (${t('common.all')})`} value={alertForm.province}
                onChange={e => setAlertForm(f => ({ ...f, province: e.target.value }))} />
              <button onClick={() => broadcastAlert.mutate()} disabled={!alertForm.title || !alertForm.body || broadcastAlert.isPending}
                className="btn-danger flex items-center justify-center gap-2">
                <Bell size={16} /> {t('admin.broadcast_btn')}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('admin.active_alerts_count', { count: alerts.filter((a: any) => a.is_active).length })}</h3>
            {alerts.filter((a: any) => a.is_active).length === 0 && (
              <div className="card text-center py-8 text-gray-500">{t('admin.no_active_alerts')}</div>
            )}
            {alerts.filter((a: any) => a.is_active).map((a: any) => (
              <div key={a.id} className="card flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${SEV_COLORS[a.severity] ?? ''}`}>{t(`alert.severity.${a.severity}`).toUpperCase()}</span>
                    {a.province && <span className="text-xs text-gray-500">📍 {a.province}</span>}
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">{a.title}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{a.body}</p>
                  {a.author_name && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-blue-500 dark:text-blue-400">
                      <User size={12} /> {a.author_name} ({t(`role.${a.author_role}`, a.author_role)})
                    </div>
                  )}
                </div>
                <button onClick={() => deactivateAlert.mutate(a.id)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">
                  {t('common.deactivate')}
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
