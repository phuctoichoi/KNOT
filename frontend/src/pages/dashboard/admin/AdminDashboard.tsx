import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Navbar from '@/components/layout/Navbar'
import AlertBanner from '@/components/alerts/AlertBanner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import {
  Users, FileText, Bell, Shield, ClipboardList,
  CheckCircle, XCircle, RefreshCw, AlertTriangle, Activity, Trash2
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/services/api'

const PIE_COLORS = ['#EF4444', '#3B82F6', '#F97316', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6']

type Tab = 'overview' | 'users' | 'alerts' | 'logs'

// ─── Helpers ────────────────────────────────────────────────────────────────
const statusBadge: Record<string, string> = {
  pending_verification: 'bg-yellow-500/20 text-yellow-300',
  pending_approval: 'bg-orange-500/20 text-orange-300',
  active: 'bg-green-500/20 text-green-300',
  rejected: 'bg-red-500/20 text-red-300',
  suspended: 'bg-gray-500/20 text-gray-300',
}
const roleBadge: Record<string, string> = {
  admin: 'bg-purple-500/20 text-purple-300',
  moderator: 'bg-blue-500/20 text-blue-300',
  organization: 'bg-orange-500/20 text-orange-300',
  volunteer: 'bg-teal-500/20 text-teal-300',
  citizen: 'bg-gray-500/20 text-gray-300',
}

// ─── Overview Tab ───────────────────────────────────────────────────────────
function OverviewTab() {
  const { t } = useTranslation()
  const { data: stats } = useQuery({ queryKey: ['admin', 'stats'], queryFn: async () => { const { data } = await api.get('/admin/system/stats'); return data } })
  const { data: byType = [] } = useQuery({ queryKey: ['analytics', 'by-type'], queryFn: async () => { const { data } = await api.get('/analytics/reports/by-type'); return data } })
  const { data: trend = [] } = useQuery({ queryKey: ['analytics', 'trend'], queryFn: async () => { const { data } = await api.get('/analytics/reports/trend'); return data } })

  const CARDS = [
    { label: t('dashboard.stats.total_reports', 'Tổng báo cáo'), value: stats?.total_reports ?? 0, icon: <FileText size={20} className="text-blue-400" />, color: 'text-blue-400' },
    { label: t('dashboard.stats.pending_reports', 'Chờ xử lý'), value: stats?.pending_reports ?? 0, icon: <RefreshCw size={20} className="text-yellow-400" />, color: 'text-yellow-400' },
    { label: t('dashboard.stats.active_alerts', 'Cảnh báo hoạt động'), value: stats?.active_alerts ?? 0, icon: <Bell size={20} className="text-red-400" />, color: 'text-red-400' },
    { label: t('dashboard.stats.total_users', 'Tổng người dùng'), value: stats?.total_users ?? 0, icon: <Users size={20} className="text-indigo-400" />, color: 'text-indigo-400' },
    { label: t('dashboard.stats.pending_users', 'Chờ duyệt tài khoản'), value: stats?.pending_users ?? 0, icon: <Shield size={20} className="text-orange-400" />, color: 'text-orange-400' },
    { label: t('dashboard.stats.active_offers', 'Điểm hỗ trợ hoạt động'), value: stats?.active_offers ?? 0, icon: <Activity size={20} className="text-green-400" />, color: 'text-green-400' },
  ]

  const emptyPie = [{ name: t('common.no_data', 'Chưa có dữ liệu'), count: 1, type: 'empty' }]
  const totalReportsByType = byType.reduce((acc: number, curr: any) => acc + curr.count, 0)
  const pieData = byType.length > 0 
    ? byType.map((d: any) => ({ ...d, name: t(`report.type.${d.type}`, d.type) })) 
    : emptyPie

  const formatDateStr = (dateStr: string) => {
    if (!dateStr || dateStr === '--') return '--'
    const [month, day] = dateStr.split('-')
    return `${day}/${month}`
  }

  const lineData = trend.length > 0 
    ? trend.map((d: any) => ({ ...d, day: formatDateStr(d.period?.slice(5, 10)) })) 
    : [{ day: '--', count: 0 }]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((s) => (
          <div key={s.label} className="card flex items-center gap-3">
            {s.icon}
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-white mb-6">{t('admin.reports_by_type', 'Báo cáo theo loại thiên tai')}</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie 
                data={pieData} 
                dataKey="count" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                innerRadius={70} 
                outerRadius={100}
                paddingAngle={5} 
                label={byType.length > 0 ? (e: any) => {
                  const percent = ((e.count / totalReportsByType) * 100).toFixed(0)
                  return `${e.name} (${percent}%)`
                } : undefined} 
                stroke="none"
              >
                {pieData.map((d: any, i: number) => (
                  <Cell key={i} fill={d.type !== 'empty' ? PIE_COLORS[i % PIE_COLORS.length] : '#374151'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
          {byType.length === 0 && <p className="text-center text-gray-600 text-sm -mt-8 relative z-10">{t('common.no_data', 'Chưa có dữ liệu')}</p>}
        </div>

        <div className="card">
          <h3 className="font-semibold text-white mb-6">{t('admin.report_trend', 'Xu hướng báo cáo (90 ngày)')}</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="day" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
              <YAxis allowDecimals={false} stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip
                labelFormatter={(label) => `${t('common.date', 'Ngày')}: ${label}`}
                formatter={(value: number) => [value, t('dashboard.stats.report_count', 'Số lượng báo cáo')]}
                contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', borderColor: '#374151', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                itemStyle={{ color: '#EF4444', fontWeight: 'bold' }}
                cursor={{ stroke: '#4B5563', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                name={t('dashboard.stats.report_count', 'Số lượng báo cáo')} 
                stroke="#EF4444" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#111827', strokeWidth: 2, stroke: '#EF4444' }} 
                activeDot={{ r: 6, fill: '#EF4444', strokeWidth: 0 }} 
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
          {trend.length === 0 && <p className="text-center text-gray-600 text-sm -mt-8 relative z-10">{t('common.no_data', 'Chưa có dữ liệu')}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Users Tab ──────────────────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'citizen' })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: async () => {
      const { data } = await api.get('/users', { params: { search, limit: 50 } })
      return data.items ?? data
    }
  })

  const { data: pendingOrgs = [] } = useQuery({
    queryKey: ['admin', 'users', 'pending'],
    queryFn: async () => {
      const { data } = await api.get('/users/pending', { params: { limit: 50 } })
      return data.items ?? data
    }
  })

  const addUserMutation = useMutation({
    mutationFn: async () => {
      // Create user
      const { data: createRes } = await api.post('/auth/register', form)
      // Auto approve immediately
      await api.patch(`/users/${createRes.user_id}`, { status: 'active' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      setIsAdding(false)
      setForm({ full_name: '', email: '', password: '', role: 'citizen' })
    }
  })

  const mutate = useMutation({
    mutationFn: ({ id, status, role }: any) => api.patch(`/users/${id}`, { status, role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] })
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    }
  })

  const handleDelete = (u: any) => {
    if (confirm(`Bạn có chắc muốn xóa người dùng ${u.full_name} (${u.email})?`)) {
      deleteUserMutation.mutate(u.id)
    }
  }

  const roleWeight: Record<string, number> = {
    admin: 100,
    moderator: 80,
    organization: 60,
    volunteer: 40,
    citizen: 20
  }

  const canManage = (targetRole: string, targetId: string) => {
    if (targetId === useAuthStore.getState().user?.id) return false
    const myRole = useAuthStore.getState().user?.role || ''
    if (myRole === 'admin') return true
    return roleWeight[myRole] > roleWeight[targetRole]
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <input
          className="input w-full sm:max-w-sm"
          placeholder="Tìm theo tên hoặc email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button onClick={() => setIsAdding(true)} className="btn-primary shrink-0">
          + Thêm thành viên
        </button>
      </div>

      {isAdding && (
        <div className="card border-blue-500/30 bg-gray-900/90 mb-6 p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Thêm thành viên mới</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input className="input" placeholder="Họ và tên" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            <input className="input" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <input className="input" type="password" placeholder="Mật khẩu" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} title="Vai trò">
              <option value="citizen">Công dân (Citizen)</option>
              <option value="volunteer">Tình nguyện viên</option>
              <option value="organization">Tổ chức</option>
              <option value="moderator">Điều phối viên (Mod)</option>
              <option value="admin">Quản trị viên (Admin)</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setIsAdding(false)} className="btn-ghost">Hủy</button>
            <button onClick={() => addUserMutation.mutate()} disabled={addUserMutation.isPending} className="btn-primary">
              {addUserMutation.isPending ? 'Đang tạo...' : 'Tạo và Phê duyệt'}
            </button>
          </div>
        </div>
      )}

      {pendingOrgs.length > 0 && !isAdding && (
        <div className="card mb-6 border-orange-500/30">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield size={20} className="text-orange-400" /> Tổ chức chờ phê duyệt ({pendingOrgs.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tổ chức</th><th>Email</th><th>Ngày đăng ký</th><th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrgs.map((u: any) => (
                  <tr key={u.id}>
                    <td className="text-white font-medium">
                      {u.organization_name || u.full_name}
                      <span className="block text-xs text-gray-400 mt-0.5">Người đại diện: {u.full_name}</span>
                    </td>
                    <td className="text-gray-400">{u.email}</td>
                    <td className="text-gray-500">{u.created_at?.slice(0, 10)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => mutate.mutate({ id: u.id, status: 'active' })}
                          className="text-xs px-3 py-1.5 rounded bg-green-500/20 text-green-300 hover:bg-green-500/40 transition-colors">
                          Phê duyệt
                        </button>
                        <button onClick={() => mutate.mutate({ id: u.id, status: 'rejected' })}
                          className="text-xs px-3 py-1.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/40 transition-colors">
                          Từ chối
                        </button>
                        <button onClick={() => handleDelete(u)}
                          className="text-xs px-3 py-1.5 rounded bg-red-500/20 text-red-500 hover:bg-red-500/40 transition-colors"
                          title="Xóa vĩnh viễn">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="data-table">
          <thead>
            <tr>
              {['Họ tên', 'Email', 'Vai trò', 'Trạng thái', 'Ngày tạo', 'Hành động'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">Đang tải...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">Không có người dùng nào</td></tr>
            ) : users.map((u: any) => (
              <tr key={u.id}>
                <td className="text-white font-medium">{u.full_name}</td>
                <td className="text-gray-400">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge[u.role] ?? ''}`}>{u.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge[u.status] ?? ''}`}>{u.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {u.status !== 'active' && (
                      <button onClick={() => mutate.mutate({ id: u.id, status: 'active' })}
                        className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300 hover:bg-green-500/40 transition-colors">
                        Duyệt
                      </button>
                    )}
                    {u.status !== 'suspended' && (
                      <button onClick={() => mutate.mutate({ id: u.id, status: 'suspended' })}
                        className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/40 transition-colors">
                        Vô hiệu
                      </button>
                    )}
                    {u.role !== 'moderator' && (
                      <button onClick={() => mutate.mutate({ id: u.id, role: 'moderator' })}
                        className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 transition-colors">
                        → Mod
                      </button>
                    )}
                    {canManage(u.role, u.id) && (
                      <button onClick={() => handleDelete(u)}
                        className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-500 hover:bg-red-500/40 transition-colors"
                        title="Xóa người dùng">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Removed PendingTab content

// ─── Alerts Tab ─────────────────────────────────────────────────────────────
function AlertsTab() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ title: '', body: '', severity: 'warning', province: '' })

  const { data: alerts = [] } = useQuery({
    queryKey: ['admin', 'alerts'],
    queryFn: async () => { const { data } = await api.get('/alerts'); return data }
  })

  const broadcast = useMutation({
    mutationFn: () => api.post('/alerts', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'alerts'] }); setForm({ title: '', body: '', severity: 'warning', province: '' }) }
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => api.patch(`/alerts/${id}`, { is_active: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'alerts'] })
  })

  const SEV_COLORS: Record<string, string> = {
    info: 'text-blue-300 bg-blue-500/20',
    warning: 'text-yellow-300 bg-yellow-500/20',
    danger: 'text-orange-300 bg-orange-500/20',
    critical: 'text-red-300 bg-red-500/20',
  }

  return (
    <div className="space-y-6">
      {/* Broadcast form */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2"><AlertTriangle size={16} className="text-red-400" /> Phát cảnh báo mới</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <input className="input" placeholder="Tiêu đề cảnh báo (TV)" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <select className="input" value={form.severity} title="Mức độ khẩn cấp"
            onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
            <option value="info">ℹ️ Thông tin</option>
            <option value="warning">⚠️ Cảnh báo</option>
            <option value="danger">🔴 Nguy hiểm</option>
            <option value="critical">🚨 Khẩn cấp</option>
          </select>
          <textarea className="input lg:col-span-2 h-20 resize-none" placeholder="Nội dung cảnh báo..."
            value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          <input className="input" placeholder="Tỉnh/thành (để trống = toàn quốc)" value={form.province}
            onChange={e => setForm(f => ({ ...f, province: e.target.value }))} />
          <button onClick={() => broadcast.mutate()} disabled={!form.title || !form.body || broadcast.isPending}
            className="btn-danger flex items-center justify-center gap-2">
            <Bell size={16} /> Phát cảnh báo
          </button>
        </div>
      </div>

      {/* Active alerts list */}
      <div className="space-y-3">
        <h3 className="font-semibold text-white">Cảnh báo đang hoạt động ({alerts.filter((a: any) => a.is_active).length})</h3>
        {alerts.filter((a: any) => a.is_active).length === 0 && (
          <div className="card text-center py-8 text-gray-500">Không có cảnh báo nào đang hoạt động</div>
        )}
        {alerts.filter((a: any) => a.is_active).map((a: any) => (
          <div key={a.id} className="card flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${SEV_COLORS[a.severity] ?? ''}`}>{a.severity.toUpperCase()}</span>
                {a.province && <span className="text-xs text-gray-500">📍 {a.province}</span>}
              </div>
              <p className="text-white font-medium">{a.title}</p>
              <p className="text-gray-400 text-sm mt-1">{a.body}</p>
            </div>
            <button onClick={() => deactivate.mutate(a.id)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">
              Tắt
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Logs Tab ────────────────────────────────────────────────────────────────
function LogsTab() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin', 'logs'],
    queryFn: async () => {
      const { data } = await api.get('/admin/activity-logs', { params: { limit: 50 } })
      return data.items ?? data
    }
  })

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="font-semibold text-white flex items-center gap-2"><ClipboardList size={15} /> Activity Log (50 gần nhất)</h3>
      </div>
      <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
        <table className="data-table">
          <thead>
            <tr>
              {['Thời gian', 'Người dùng', 'Hành động', 'Đối tượng', 'IP'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">Đang tải...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">Chưa có activity log nào</td></tr>
            ) : logs.map((l: any) => (
              <tr key={l.id} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{l.created_at?.slice(0, 19).replace('T', ' ')}</td>
                <td className="px-4 py-2 text-gray-300">{l.user_id?.slice(0, 8) ?? '—'}...</td>
                <td className="px-4 py-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">{l.action_type}</span>
                </td>
                <td className="px-4 py-2 text-gray-400">{l.target_type ?? '—'}</td>
                <td className="px-4 py-2 text-gray-600">{l.ip_address ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('overview')

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Tổng quan', icon: Activity },
    { key: 'users', label: 'Người dùng', icon: Users },
    { key: 'alerts', label: 'Cảnh báo', icon: Bell },
    { key: 'logs', label: 'Activity Log', icon: ClipboardList },
  ]

  return (
    <div className="min-h-screen bg-gray-950">
      <AlertBanner />
      <Navbar />
      <div className="page-container py-8">
        <div className="greeting-header">
          <div>
            <h1>{t('dashboard.greeting', { name: user?.full_name })}</h1>
            <p>{t('dashboard.admin.title')}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-xl w-fit">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? 'bg-red-600 text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && <OverviewTab />}
        {tab === 'users'    && <UsersTab />}
        {tab === 'alerts'   && <AlertsTab />}
        {tab === 'logs'     && <LogsTab />}
      </div>
    </div>
  )
}
