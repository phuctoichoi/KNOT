import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogIn } from 'lucide-react'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data: tokenData } = await api.post('/auth/login', { email, password })
      const { data: me } = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      })
      setAuth(me, tokenData.access_token)
      navigate('/dashboard')
    } catch (err: any) {
      if (err?.response?.status === 403) {
        // specific auth flow blockers
        setError(err.response.data.detail)
      } else {
        setError(err?.response?.data?.detail || 'Đăng nhập thất bại')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/icons/logov2.png" alt="Logo" className="h-12 w-12 mx-auto mb-2 object-contain" />
          <h1 className="text-2xl font-bold text-white">{t('auth.login_title')}</h1>
          <p className="text-gray-400 mt-1 text-sm">KNOT – Kết Nối Ứng Phó Thiên Tai</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required className="input" placeholder="email@example.com" autoComplete="email" />
            </div>
            <div>
              <label className="label">{t('auth.password')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required className="input" placeholder="••••••••" autoComplete="current-password" />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                {t('auth.forgot_password')}
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-danger w-full py-3">
              <LogIn size={18} />
              {loading ? 'Đang đăng nhập...' : t('auth.login')}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-gray-400 text-sm">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-red-400 hover:text-red-300 font-medium">{t('auth.register')}</Link>
          </p>
          <Link to="/" className="text-gray-600 hover:text-gray-400 text-xs block">← Về trang chủ</Link>
        </div>
      </div>
    </div>
  )
}
