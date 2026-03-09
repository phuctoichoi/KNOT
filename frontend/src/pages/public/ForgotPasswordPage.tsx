import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import api from '@/services/api'
import MainLayout from '@/components/layout/MainLayout'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Thao tác thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout showFooter={false}>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <span className="text-red-500 text-4xl">⬡</span>
            <h1 className="text-2xl font-bold text-white mt-2">{t('auth.forgot_password')}</h1>
          </div>

          <div className="card">
            {success ? (
              <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-white mb-2">{t('auth.reset_success')}</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Vui lòng kiểm tra hộp thư đến (bao gồm cả mục Spam) và làm theo hướng dẫn.
                </p>
                <Link to="/login" className="btn-outline w-full max-w-[200px] inline-flex items-center justify-center gap-2">
                  <ArrowLeft size={16} /> {t('auth.back_to_login')}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-gray-400 text-sm mb-6 text-center">
                  {t('auth.reset_password_desc')}
                </p>
                <div>
                  <label className="label">{t('auth.email')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} className="text-gray-500" />
                    </div>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                      className="input pl-10" 
                      placeholder="email@example.com" 
                      autoComplete="email" 
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm text-center">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-danger w-full py-3 mt-4">
                  {loading ? 'Đang gửi...' : t('auth.send_reset_link')}
                </button>
              </form>
            )}
          </div>

          {!success && (
            <div className="text-center mt-6">
              <Link to="/login" className="text-gray-400 hover:text-white text-sm transition-colors inline-flex items-center gap-2">
                <ArrowLeft size={16} /> {t('auth.back_to_login')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
