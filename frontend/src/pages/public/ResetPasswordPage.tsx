import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react'
import api from '@/services/api'
import MainLayout from '@/components/layout/MainLayout'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!token) {
    return (
      <MainLayout showFooter={false}>
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
          <div className="card text-center max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('common.error')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error || t('common.error_occurred')}</p>
            <Link to="/forgot-password" className="btn-outline w-full">{t('auth.forgot_password')}</Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('auth.password_mismatch'))
      return
    }
    
    setLoading(true); setError('')
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('auth.reset_failed'))
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
            <h1 className="text-2xl font-bold text-white mt-2">{t('auth.reset_password')}</h1>
          </div>

          <div className="card">
            {success ? (
              <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('common.success')}</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{t('auth.reset_success_msg')}</p>
                <Link to="/login" className="btn-primary w-full max-w-[200px] inline-flex items-center justify-center gap-2">
                  {t('auth.login_now')}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">{t('auth.new_password')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={16} className="text-gray-500" />
                    </div>
                    <input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                      className="input pl-10" 
                      placeholder={t('auth.password_req')}
                      minLength={8}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{t('auth.confirm_password')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={16} className="text-gray-500" />
                    </div>
                    <input 
                      type="password" 
                      value={confirm} 
                      onChange={(e) => setConfirm(e.target.value)}
                      required 
                      className="input pl-10" 
                      placeholder={t('auth.retype_new_password')}
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm text-center">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-danger w-full py-3 mt-4">
                  {loading ? t('common.processing') : t('auth.confirm_reset')}
                </button>
              </form>
            )}
          </div>

          {!success && (
            <div className="text-center mt-6">
              <Link to="/login" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors inline-flex items-center gap-2">
                <ArrowLeft size={16} /> {t('auth.back_to_login')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
