import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Upload, Send, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { saveOfflineReport } from '@/services/storageService'
import api from '@/services/api'

const DISASTER_TYPES = ['flood','landslide','storm','fire','earthquake','infrastructure','other'] as const
const SEVERITY_LEVELS = ['low','medium','high','critical'] as const

interface FormState {
  report_type: 'emergency' | 'damage'
  disaster_type: string
  severity: string
  title: string
  description: string
  lat: number | null
  lng: number | null
  address_text: string
  contact_email: string
  contact_phone: string
}

interface Props {
  onSuccess?: () => void
}

export default function QuickReportForm({ onSuccess }: Props) {
  const { t } = useTranslation()
  const isOnline = useOnlineStatus()
  const [form, setForm] = useState<FormState>({
    report_type: 'emergency',
    disaster_type: 'flood',
    severity: 'medium',
    title: '',
    description: '',
    lat: null, lng: null,
    address_text: '',
    contact_email: '',
    contact_phone: '',
  })
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)

  const getGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ GPS')
      return
    }
    setGpsLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setForm(f => ({ ...f, lat: latitude, lng: longitude }))
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=vi`
          )
          const data = await res.json()
          const addr = data.display_name || `${latitude}, ${longitude}`
          setForm(f => ({ ...f, address_text: addr }))
        } catch {
          // Ignore
        }
        setGpsLoading(false)
      },
      (err) => {
        setError(err.message || 'Không thể lấy vị trí GPS')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const update = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.lat || !form.lng) { setError('Vui lòng chọn vị trí sự cố'); return }
    if (!form.contact_email) { setError('Vui lòng nhập email liên hệ'); return }
    setLoading(true); setError('')

    try {
      if (!isOnline) {
        await saveOfflineReport({ ...form, lat: form.lat!, lng: form.lng! } as any)
        setSuccess(true)
        return
      }

      const { data } = await api.post('/reports', form)
      // Upload images if any
      if (files.length > 0) {
        const fd = new FormData()
        files.forEach((f) => fd.append('files', f))
        await api.post(`/reports/${data.report_id}/images`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      setSuccess(true)
      onSuccess?.()
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('report.submit_error'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="card text-center py-8">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-green-400 font-semibold text-lg">
          {isOnline ? t('report.submitted_success') : t('offline.saved')}
        </p>
        <button onClick={() => { setSuccess(false); setForm({ report_type: 'emergency', disaster_type: 'flood', severity: 'medium', title: '', description: '', lat: null, lng: null, address_text: '', contact_email: '', contact_phone: '' }) }}
          className="btn-outline mt-4">Gửi báo cáo khác</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isOnline && (
        <div className="flex items-start gap-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-sm text-yellow-300">
          <WifiOff size={16} className="shrink-0 mt-0.5" />
          <span>{t('offline.message')}</span>
        </div>
      )}

      {/* Report type toggle */}
      <div className="flex gap-2">
        {(['emergency','damage'] as const).map((rt) => (
          <button key={rt} type="button"
            onClick={() => setForm((f) => ({ ...f, report_type: rt }))}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
              form.report_type === rt
                ? 'bg-red-600 border-red-500 text-white'
                : 'border-gray-700 text-gray-400 hover:border-gray-600'
            }`}>
            {t(`report.type.${rt}`)}
          </button>
        ))}
      </div>

      {/* Disaster type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t('report.disaster_type')}</label>
          <select value={form.disaster_type} onChange={update('disaster_type')} className="select">
            {DISASTER_TYPES.map((dt) => (
              <option key={dt} value={dt}>{t(`report.disaster.${dt}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t('report.severity')}</label>
          <select value={form.severity} onChange={update('severity')} className="select">
            {SEVERITY_LEVELS.map((s) => (
              <option key={s} value={s}>{t(`report.severity.${s}`)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="label">{t('report.title')}</label>
        <input value={form.title} onChange={update('title')} required className="input" placeholder="Vd: Lũ lụt đường QL6 km 35 Hòa Bình" />
      </div>

      {/* Description */}
      <div>
        <label className="label">{t('report.description')}</label>
        <textarea value={form.description} onChange={(e) => setForm(f => ({...f, description: e.target.value}))} required rows={3}
          className="input resize-none" placeholder="Mô tả chi tiết tình trạng..." />
      </div>

      {/* Location */}
      <div>
        <label className="label">{t('report.location')}</label>
        <div className="flex gap-2">
          <input value={form.address_text} onChange={update('address_text')} className="input flex-1" placeholder="Địa chỉ / khu vực" />
          <button type="button" onClick={getGPS} disabled={gpsLoading} className="btn-outline shrink-0 gap-1">
            <MapPin size={14} />
            <span className="hidden sm:inline">
              {gpsLoading ? t('common.loading') : t('report.get_gps')}
            </span>
          </button>
        </div>
        {form.lat && form.lng && (
          <p className="text-xs text-green-400 mt-1">📍 {form.lat.toFixed(5)}, {form.lng.toFixed(5)}</p>
        )}
        {!form.lat && <p className="text-xs text-gray-500 mt-1">{t('report.location_hint')}</p>}
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">{t('report.contact_email')}</label>
          <input type="email" value={form.contact_email} onChange={update('contact_email')} required className="input" placeholder="email@example.com" />
        </div>
        <div>
          <label className="label">{t('report.contact_phone')}</label>
          <input type="tel" value={form.contact_phone} onChange={update('contact_phone')} className="input" placeholder="0xxx xxx xxx" />
        </div>
      </div>

      {/* Image upload */}
      <div>
        <label className="label">{t('report.upload_images')}</label>
        <label className="flex items-center gap-2 border border-dashed border-gray-700 rounded-lg p-3 cursor-pointer hover:border-gray-600 transition-colors text-sm text-gray-400">
          <Upload size={16} />
          <span>{files.length > 0 ? `${files.length} ảnh đã chọn` : 'Chọn ảnh (tối đa 5)'}</span>
          <input type="file" multiple accept="image/*" className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))} />
        </label>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="btn-danger w-full py-3 text-base">
        <Send size={18} />
        {loading ? 'Đang gửi...' : t('report.submit')}
      </button>
    </form>
  )
}
