import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import Navbar from '@/components/layout/Navbar'
import AlertBanner from '@/components/alerts/AlertBanner'
import { Link } from 'react-router-dom'
import {
  FileText, Plus, ChevronDown, ChevronUp, Clock, Send,
  ShieldCheck, MapPin, MessageSquare, ImagePlus, X, CheckCircle2,
  BookOpen, HelpCircle
} from 'lucide-react'
import api from '@/services/api'

const STATUS_CLASS: Record<string, string> = {
  pending: 'badge-pending', verified: 'badge-verified',
  in_progress: 'badge-in-progress', resolved: 'badge-resolved', rejected: 'badge-rejected'
}

// ── Report Timeline + Update Card ──────────────────────────────────────────
function ReportCard({ r }: { r: any }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const { data: updates = [], isFetching } = useQuery({
    queryKey: ['report-updates', r.id],
    queryFn: async () => {
      const { data } = await api.get(`/reports/${r.id}/updates`)
      return data
    },
    enabled: open,
  })

  const addUpdate = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.append('content', text)
      if (file) fd.append('image', file)
      await api.post(`/reports/${r.id}/updates`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      setText('')
      setFile(null)
      setPreview(null)
      qc.invalidateQueries({ queryKey: ['report-updates', r.id] })
    },
  })

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setPreview(URL.createObjectURL(f)) }
  }

  return (
    <div className="card border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">{r.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {t(`report.disaster.${r.disaster_type}`)} • {r.province || t('common.unknown_location')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={STATUS_CLASS[r.status] || 'badge'}>{t(`report.status.${r.status}`)}</span>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Timeline + Update Form */}
      {open && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
          {/* Timeline */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
              <Clock size={12} /> {t('citizen.timeline')}
            </p>
            {isFetching ? (
              <p className="text-xs text-gray-400">{t('common.loading')}</p>
            ) : updates.length === 0 ? (
              <div className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{t('citizen.report_submitted')}</p>
                  <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString('vi-VN')}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* First event = submission */}
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{t('citizen.report_submitted')}</p>
                    <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
                {updates.map((u: any) => (
                  <div key={u.id} className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {u.author.full_name}
                        <span className="ml-1 font-normal text-gray-400">({t(`role.${u.author.role}`)})</span>
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{u.content}</p>
                      {u.image_url && (
                        <img src={u.image_url} alt="update" className="mt-2 rounded-lg max-h-40 object-cover" />
                      )}
                      <p className="text-xs text-gray-400 mt-1">{new Date(u.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Update Form */}
          {r.status !== 'resolved' && r.status !== 'rejected' && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                <MessageSquare size={12} /> {t('citizen.add_update')}
              </p>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={2}
                className="input text-sm resize-none"
                placeholder={t('citizen.update_placeholder')}
              />
              {preview && (
                <div className="relative mt-2 inline-block">
                  <img src={preview} alt="preview" className="max-h-24 rounded-lg object-cover" />
                  <button onClick={() => { setFile(null); setPreview(null) }}
                    aria-label="Remove image"
                    className="absolute -top-1 -right-1 bg-gray-800 rounded-full p-0.5 text-white">
                    <X size={12} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <label className="btn-ghost cursor-pointer text-xs gap-1">
                  <ImagePlus size={14} /> {t('citizen.attach_photo')}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </label>
                <button
                  onClick={() => addUpdate.mutate()}
                  disabled={!text.trim() || addUpdate.isPending}
                  className="btn-primary text-xs ml-auto gap-1"
                >
                  <Send size={12} />
                  {addUpdate.isPending ? t('common.saving') : t('citizen.send_update')}
                </button>
              </div>
              {addUpdate.isError && (
                <p className="text-xs text-red-500 mt-1">{t('common.error_occurred')}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Safe Check-in Panel ────────────────────────────────────────────────────
function SafeCheckinPanel() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [success, setSuccess] = useState(false)

  const { data: checkins = [] } = useQuery({
    queryKey: ['my-checkins'],
    queryFn: async () => { const { data } = await api.get('/me/safety-checkins'); return data }
  })

  const checkin = useMutation({
    mutationFn: async () => {
      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej))
      
      let address_text = undefined;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=vi`);
        if (res.ok) {
          const data = await res.json();
          address_text = data.display_name;
        }
      } catch (err) {
        console.error('Geocoding failed:', err);
      }

      await api.post('/me/safety-checkin', {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        address_text,
        note: note.trim() || undefined
      })
    },
    onSuccess: () => {
      setNote('')
      setSuccess(true)
      qc.invalidateQueries({ queryKey: ['my-checkins'] })
      setTimeout(() => setSuccess(false), 3000)
    },
  })

  return (
    <div className="card border-green-700/40 bg-green-50/30 dark:bg-green-900/10">
      <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
        <ShieldCheck size={18} className="text-green-500" /> {t('citizen.im_safe')}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('citizen.im_safe_desc')}</p>
      <input
        value={note}
        onChange={e => setNote(e.target.value)}
        className="input text-sm mb-2"
        placeholder={t('citizen.safe_note_placeholder')}
      />
      <button
        onClick={() => checkin.mutate()}
        disabled={checkin.isPending}
        className="btn bg-green-600 hover:bg-green-500 text-white px-4 py-2 text-sm w-full gap-2"
      >
        <MapPin size={14} />
        {checkin.isPending ? t('citizen.getting_location') : t('citizen.confirm_safe')}
      </button>
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
          <CheckCircle2 size={14} /> {t('citizen.safe_confirmed')}
        </p>
      )}
      {checkin.isError && (
        <p className="text-sm text-red-500 mt-2">{t('citizen.location_denied')}</p>
      )}
      {checkins.length > 0 && (
        <div className="mt-3 border-t border-green-700/20 pt-3">
          <p className="text-xs text-gray-500 mb-1">{t('citizen.last_checkin')}</p>
          <p className="text-xs text-gray-700 dark:text-gray-300">
            📍 {checkins[0].address_text || `${checkins[0].lat.toFixed(4)}, ${checkins[0].lng.toFixed(4)}`}
            <span className="ml-2 text-gray-400">
              · {new Date(checkins[0].created_at).toLocaleString('vi-VN')}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}


// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function CitizenDashboard() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['my-reports'],
    queryFn: async () => { const { data } = await api.get('/reports/mine'); return data }
  })
  const reports = data?.items || []

  return (
    <div className="min-h-screen bg-transparent">
      <AlertBanner />
      <Navbar />
      <div className="page-container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.citizen.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('dashboard.greeting', { name: user?.full_name })}</p>
          </div>
          <Link to="/?report=1" onClick={() => document.getElementById('report-form')?.scrollIntoView()} className="btn-danger flex items-center gap-2">
            <Plus size={16} />{t('dashboard.new_report')}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Reports */}
          <div className="lg:col-span-2 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t('dashboard.total_reports'), value: reports.length },
                { label: t('report.status.pending'), value: reports.filter((r: any) => r.status === 'pending').length },
                { label: t('report.status.in_progress'), value: reports.filter((r: any) => r.status === 'in_progress').length },
                { label: t('report.status.resolved'), value: reports.filter((r: any) => r.status === 'resolved').length },
              ].map((stat) => (
                <div key={stat.label} className="card text-center py-3">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Reports list with timeline */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FileText size={18} />{t('dashboard.my_reports')}
              </h2>
              {isLoading ? (
                <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
              ) : reports.length === 0 ? (
                <div className="card text-center py-10 text-gray-500">{t('dashboard.no_reports')}</div>
              ) : (
                <div className="space-y-3">
                  {reports.map((r: any) => <ReportCard key={r.id} r={r} />)}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Sidebar items */}
          <div className="space-y-4">
            <SafeCheckinPanel />

            {/* Handbook */}
            <div className="card relative overflow-hidden group">
              <div className="absolute top-3 right-3 bg-yellow-100 text-yellow-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full dark:bg-yellow-900/40 dark:text-yellow-400">
                {t('citizen.coming_soon')}
              </div>
              <div className="flex items-start gap-3 opacity-60">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t('citizen.handbook_title')}</h3>
                  <p className="text-xs text-gray-500 mt-1">{t('citizen.handbook_desc')}</p>
                </div>
              </div>
            </div>

            {/* Quiz */}
            <div className="card relative overflow-hidden group">
              <div className="absolute top-3 right-3 bg-yellow-100 text-yellow-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full dark:bg-yellow-900/40 dark:text-yellow-400">
                {t('citizen.coming_soon')}
              </div>
              <div className="flex items-start gap-3 opacity-60">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-xl">
                  <HelpCircle size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t('citizen.quiz_title')}</h3>
                  <p className="text-xs text-gray-500 mt-1">{t('citizen.quiz_desc')}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
