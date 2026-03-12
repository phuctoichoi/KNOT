import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '@/components/layout/Navbar'
import AlertBanner from '@/components/alerts/AlertBanner'
import Footer from '@/components/layout/Footer'
import { ShieldCheck, Search, UserCheck, AlertCircle, Clock, MapPin, MessageSquare } from 'lucide-react'
import api from '@/services/api'

export default function SafeSearchPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<null | { found: boolean; full_name?: string; address_text?: string; note?: string; checked_in_at?: string }>(null)
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setResult(null)
    setError('')
    try {
      const { data } = await api.get('/safety-checkins/search', { params: { q } })
      setResult(data)
    } catch {
      setError(t('safe_search.error'))
    } finally {
      setLoading(false)
    }
  }

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor(diff / 60000)
    if (hours >= 24) return new Date(iso).toLocaleString('vi-VN')
    if (hours > 0) return `${hours} giờ trước`
    if (minutes > 0) return `${minutes} phút trước`
    return 'Vừa xong'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <AlertBanner />
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-100 dark:bg-green-900/30 mb-5 shadow-inner">
            <ShieldCheck size={40} className="text-green-500 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('safe_search.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm leading-relaxed">
            {t('safe_search.subtitle')}
          </p>
        </div>

        {/* Search box */}
        <div className="w-full max-w-md">
          <form onSubmit={handleSearch} className="card shadow-lg border border-gray-200 dark:border-gray-700">
            <label className="label mb-1">{t('safe_search.label')}</label>
            <div className="flex gap-2 mt-1">
              <input
                className="input flex-1"
                placeholder={t('safe_search.placeholder')}
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="btn-primary px-4 py-2 shrink-0 disabled:opacity-50"
              >
                {loading
                  ? <span className="inline-block w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  : <Search size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <ShieldCheck size={11} /> {t('safe_search.privacy_note')}
            </p>
          </form>

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          {/* Result: not found */}
          {result && !result.found && (
            <div className="mt-4 p-5 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-semibold mb-1">
                <AlertCircle size={18} /> {t('safe_search.not_found_title')}
              </div>
              <p className="text-sm text-yellow-600 dark:text-yellow-300">
                {t('safe_search.not_found_desc')}
              </p>
            </div>
          )}

          {/* Result: found */}
          {result && result.found && (
            <div className="mt-4 p-5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 space-y-3">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-bold text-lg">
                <UserCheck size={22} /> {result.full_name}
              </div>
              <p className="text-green-600 dark:text-green-300 font-medium text-sm">
                ✅ {t('safe_search.confirmed_safe')}
              </p>
              {result.address_text && (
                <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-green-500" />
                  <span>{result.address_text}</span>
                </div>
              )}
              {result.note && (
                <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <MessageSquare size={14} className="mt-0.5 shrink-0 text-blue-400" />
                  <span className="italic">"{result.note}"</span>
                </div>
              )}
              {result.checked_in_at && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock size={12} />
                  {timeAgo(result.checked_in_at)} ({new Date(result.checked_in_at).toLocaleString('vi-VN')})
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
