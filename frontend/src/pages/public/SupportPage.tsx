import MainLayout from '@/components/layout/MainLayout'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Heart, Megaphone, Phone, Mail, MapPin, Route, Clock
} from 'lucide-react'
import api from '@/services/api'

export default function SupportPage() {
  const { t } = useTranslation()

  const { data: reliefData, isLoading: reliefLoading } = useQuery({
    queryKey: ['support', 'relief'],
    queryFn: async () => { const { data } = await api.get('/support/relief'); return data },
  })
  const reliefPosts: any[] = reliefData?.items ?? []

  return (
    <MainLayout>
      <div className="page-container py-10">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="text-red-400" size={28} />
          <h1 className="section-title mb-0">Hỗ trợ & Cứu trợ</h1>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Megaphone size={18} className="text-red-400" /> Thông báo Cứu trợ
          </h2>
        </div>

        {reliefLoading ? (
          <p className="text-gray-400">{t('common.loading')}</p>
        ) : reliefPosts.length === 0 ? (
          <div className="card text-center py-16 text-gray-500">
            <Megaphone size={40} className="mx-auto mb-3 text-gray-700" />
            <p>Chưa có thông báo cứu trợ nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reliefPosts.map((p: any) => (
              <div key={p.id} className="card-hover border border-red-900/30 bg-red-950/10">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-red-900/40 flex items-center justify-center shrink-0">
                    <Megaphone size={18} className="text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm leading-snug">{p.title}</h3>
                    {p.org_name && (
                      <p className="text-xs text-red-400 mt-0.5">🏢 {p.org_name}</p>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-300 mb-3 line-clamp-3">{p.content}</p>

                <div className="space-y-1.5 text-xs text-gray-400">
                  {p.route && (
                    <div className="flex items-center gap-1.5">
                      <Route size={12} className="text-yellow-400 shrink-0" />
                      <span className="text-yellow-200">{p.route}</span>
                    </div>
                  )}
                  {(p.province || p.district) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="shrink-0" />
                      <span>{[p.district, p.province].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {p.starts_at && (
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="shrink-0" />
                      <span>Bắt đầu: {new Date(p.starts_at).toLocaleString('vi-VN')}</span>
                    </div>
                  )}
                </div>

                {(p.contact_phone || p.contact_email) && (
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {p.contact_phone && (
                      <a
                        href={`tel:${p.contact_phone}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-700/40 text-green-300 text-xs hover:bg-green-900/50 transition-colors"
                      >
                        <Phone size={12} /> {p.contact_phone}
                      </a>
                    )}
                    {p.contact_email && (
                      <a
                        href={`mailto:${p.contact_email}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900/30 border border-blue-700/40 text-blue-300 text-xs hover:bg-blue-900/50 transition-colors"
                      >
                        <Mail size={12} /> {p.contact_email}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
