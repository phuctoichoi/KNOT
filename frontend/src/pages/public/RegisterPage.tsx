import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'
import api from '@/services/api'

const ROLES = [
  { value: 'citizen', label: 'Công dân' },
  { value: 'volunteer', label: 'Tình nguyện viên' },
  { value: 'organization', label: 'Tổ chức / Cơ quan' },
]

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '', phone: '', role: 'citizen', organization_name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Mật khẩu xác nhận không khớp'); return }
    setLoading(true); setError('')
    try {
      await api.post('/auth/register', form)
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="card text-center max-w-md w-full py-12">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-white mb-2">{t('auth.check_email')}</h2>
          <p className="text-gray-400 text-sm mb-6">
            Chúng tôi đã gửi một liên kết xác thực đến email của bạn.<br/>
            Liên kết này chỉ có hiệu lực trong 3 phút.
          </p>
          {form.role === 'organization' && (
            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-yellow-500 text-sm mb-6">
              {t('auth.org_pending')}
            </div>
          )}
          <Link to="/login" className="btn-primary mt-2">Đăng nhập</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/icons/logov2.png" alt="Logo" className="h-12 w-12 mx-auto mb-2 object-contain" />
          <h1 className="text-2xl font-bold text-white">{t('auth.register_title')}</h1>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">{t('auth.full_name')}</label>
              <input value={form.full_name} onChange={update('full_name')} required className="input" placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="label">{t('auth.email')}</label>
              <input type="email" value={form.email} onChange={update('email')} required className="input" placeholder="email@example.com" />
            </div>
            <div>
              <label className="label">{t('auth.phone')}</label>
              <input type="tel" value={form.phone} onChange={update('phone')} className="input" placeholder="0xxx xxx xxx" />
            </div>
            <div>
              <label className="label">{t('auth.role')}</label>
              <select value={form.role} onChange={update('role')} className="select">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {form.role === 'organization' && (
              <div>
                <label className="label">Tên tổ chức</label>
                <input value={form.organization_name} onChange={update('organization_name')} className="input" placeholder="Tên tổ chức / cơ quan" />
              </div>
            )}
            <div>
              <label className="label">{t('auth.password')}</label>
              <input type="password" value={form.password} onChange={update('password')} required className="input" placeholder="Tối thiểu 8 ký tự, 1 hoa, 1 số, 1 đặc biệt" />
            </div>
            <div>
              <label className="label">Xác nhận mật khẩu</label>
              <input type="password" value={form.confirm} onChange={update('confirm')} required className="input" placeholder="••••••••" />
            </div>

            {error && <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">{error}</div>}

            <button type="submit" disabled={loading} className="btn-danger w-full py-3 mt-2">
              <UserPlus size={18} />
              {loading ? 'Đang đăng ký...' : t('auth.register')}
            </button>
          </form>
        </div>
        <p className="text-center text-gray-400 text-sm mt-4">
          Đã có tài khoản? <Link to="/login" className="text-red-400 hover:text-red-300 font-medium">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  )
}
