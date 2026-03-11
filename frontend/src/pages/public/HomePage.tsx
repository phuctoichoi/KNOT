import MainLayout from '@/components/layout/MainLayout'
import QuickReportForm from '@/components/reports/QuickReportForm'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Heart, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export default function HomePage() {
  const { t } = useTranslation()

  // Fetch public stats for the homepage
  const { data: summary } = useQuery({ queryKey: ['public', 'summary'], queryFn: async () => { const { data } = await api.get('/analytics/public/reports/summary'); return data } })

  return (
    <MainLayout>
      {/* Hero / Emergency CTA */}

      {/* Hero / Emergency CTA */}
      <section className="page-container pt-16 pb-12 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 text-red-400 text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {t('home.hero_subtitle')}
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
            <div className="flex items-center justify-center gap-4 mb-4">
              <img src="/icons/knot-logo.png" alt="KNOT Logo" className="h-20 md:h-28 lg:h-32 object-contain drop-shadow-md dark:invert" />
            </div>
            {t('home.hero_title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-10">
            {t('home.hero_desc')}
          </p>

          {/* Primary Emergency Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => document.getElementById('report-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-danger-lg animate-pulse-fast glow-red"
            >
              {t('report.emergency_btn')}
            </button>
          </div>

          {/* Stats row */}
          <div className="flex justify-center gap-6 mb-8">
            {[
              { label: t('home.stats_today'), value: summary?.today_count ?? 0 },
              { label: t('home.stats_in_progress'), value: summary?.in_progress ?? 0 },
            ].map((stat) => (
              <div key={stat.label} className="card text-center min-w-[150px] shadow-lg border border-gray-200 dark:border-gray-800">
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Quick Report Form */}
      <section id="report-form" className="page-container pb-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="section-title flex items-center gap-2">
            <AlertTriangle className="text-red-400" size={24} />
            {t('home.quick_report_title')}
          </h2>
          <div className="card">
            <QuickReportForm />
          </div>
        </div>
      </section>

      {/* Support Locations CTA */}
      <section className="page-container pb-20">
        <div className="card flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Heart className="text-green-400" size={28} />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{t('home.support_title')}</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{t('home.support_desc')}</p>
            </div>
          </div>
          <Link to="/support" className="btn-primary">{t('support.title')} →</Link>
        </div>
      </section>
    </MainLayout >
  )
}
