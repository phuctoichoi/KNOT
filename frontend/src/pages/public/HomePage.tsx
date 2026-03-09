import MainLayout from '@/components/layout/MainLayout'
import QuickReportForm from '@/components/reports/QuickReportForm'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Heart, AlertTriangle } from 'lucide-react'

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <MainLayout>
      {/* Hero / Emergency CTA */}

      {/* Hero / Emergency CTA */}
      <section className="page-container pt-16 pb-12 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 text-red-400 text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Hệ thống ứng phó thiên tai trực tuyến
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
            <div className="flex items-center justify-center gap-4 mb-4">
              <img src="/icons/logov2.png" alt="Logo" className="h-16 w-16 md:h-20 md:w-20 object-contain drop-shadow-2xl" />
              <span className="text-gradient">KNOT</span>
            </div>
            Dẫn đầu trong Ứng phó Thiên tai
          </h1>
          <p className="text-gray-400 text-lg mb-10">
            Báo cáo, theo dõi và phối hợp ứng phó thiên tai trên toàn Việt Nam
          </p>

          {/* Primary Emergency Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => document.getElementById('report-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-danger-lg animate-pulse-fast glow-red"
            >
              {t('report.emergency_btn')}
            </button>
            <Link to="/map" className="btn-outline py-4 px-8 text-xl rounded-2xl">
              {t('map.view_full')}
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-16">
            {[
              { label: 'Báo cáo hôm nay', value: '—' },
              { label: 'Đang xử lý', value: '—' },
              { label: 'Điểm hỗ trợ', value: '—' },
            ].map((stat) => (
              <div key={stat.label} className="card text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
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
            Gửi báo cáo sự cố
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
              <p className="font-semibold text-white">Tìm điểm hỗ trợ gần bạn</p>
              <p className="text-gray-400 text-sm">Thực phẩm, nước, y tế và tình nguyện viên</p>
            </div>
          </div>
          <Link to="/support" className="btn-primary">{t('support.title')} →</Link>
        </div>
      </section>
    </MainLayout>
  )
}
