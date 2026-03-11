import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Navbar from '@/components/layout/Navbar'
import AlertBanner from '@/components/alerts/AlertBanner'
import { CheckCircle, XCircle, Users, Megaphone, Trash2, Route } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/services/api'

export default function ModeratorDashboard() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  
  const { data: pending } = useQuery({
    queryKey: ['users', 'pending'],
    queryFn: async () => { const { data } = await api.get('/users/pending'); return data }
  })

  const { data: reliefData } = useQuery({
    queryKey: ['relief', 'all'],
    queryFn: async () => { const { data } = await api.get('/support/relief'); return data }
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
      </div>
    </div>
  )
}
