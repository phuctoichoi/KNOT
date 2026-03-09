import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import api from '@/services/api'
import MainLayout from '@/components/layout/MainLayout'

export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'org_pending' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleVerify = async () => {
    if (!token) {
      setStatus('error')
      setErrorMessage(t('auth.verify_expired'))
      return
    }

    setStatus('loading')
    try {
      const { data } = await api.post(`/auth/verify-email?token=${token}`)
      if (data.status === 'pending_approval') {
        setStatus('org_pending')
      } else {
        setStatus('success')
      }
    } catch (err: any) {
      setStatus('error')
      setErrorMessage(err?.response?.data?.detail || t('auth.verify_expired'))
    }
  }

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage(t('auth.verify_expired'))
    }
  }, [token, t])

  return (
    <MainLayout showFooter={false}>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
        <div className="w-full max-w-md card text-center py-12">
          {status === 'idle' && (
            <div className="flex flex-col items-center">
              <div className="bg-red-500/10 p-4 rounded-full mb-6">
                <CheckCircle2 size={48} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Xác nhận tài khoản</h2>
              <p className="text-gray-400 mb-8 max-w-[300px] mx-auto">
                Nhấn vào nút bên dưới để hoàn tất quá trình kích hoạt tài khoản của bạn.
              </p>
              <button 
                onClick={handleVerify}
                className="btn-danger w-full py-4 relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative font-bold">KÍCH HOẠT NGAY</span>
              </button>
            </div>
          )}

          {status === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 size={48} className="text-red-500 animate-spin mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Đang xác thực...</h2>
              <p className="text-gray-400">Vui lòng đợi trong giây lát</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <CheckCircle2 size={64} className="text-green-500 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">{t('auth.verify_success')}</h2>
              <p className="text-gray-400 mb-8">Tài khoản của bạn đã được xác thực và sẵn sàng sử dụng.</p>
              <Link to="/login" className="btn-primary w-full max-w-[200px]">{t('auth.login')}</Link>
            </div>
          )}

          {status === 'org_pending' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <CheckCircle2 size={64} className="text-yellow-500 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">{t('auth.verify_success')}</h2>
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 mb-8 text-yellow-200/80 text-sm leading-relaxed text-left">
                {t('auth.org_pending')}
              </div>
              <Link to="/login" className="btn-outline w-full max-w-[200px]">{t('auth.login')}</Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <XCircle size={64} className="text-red-500 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Xác thực thất bại</h2>
              <p className="text-red-300/80 mb-8">{errorMessage}</p>
              <Link to="/login" className="btn-outline w-full max-w-[200px]">{t('auth.back_to_login')}</Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
