import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import Navbar from '@/components/layout/Navbar'
import AlertBanner from '@/components/alerts/AlertBanner'
import { MapPin, Loader2, Save, User, Lock, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, setAuth, accessToken } = useAuthStore()

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    organization_name: user?.organization_name || '',
    province: user?.province || '',
    district: user?.district || '',
  })

  // Password Change Form State
  const [pwdForm, setPwdForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')

  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(
    user?.lat && user?.lng ? { lat: user.lat, lng: user.lng } : null
  )
  const [address, setAddress] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [saved, setSaved] = useState(false)

  const isOrg = user?.role === 'organization'

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: updated } = await api.patch('/users/me', data)
      return updated
    },
    onSuccess: (updated) => {
      if (accessToken) {
        setAuth(updated, accessToken)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  })

  const pwdMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/users/me/password', data)
      return res.data
    },
    onSuccess: (res) => {
      setPwdSuccess('Đổi mật khẩu thành công!')
      setPwdForm({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => setPwdSuccess(''), 4000)
    },
    onError: (err: any) => {
      setPwdError(err.response?.data?.detail || 'Lỗi khi đổi mật khẩu')
    }
  })

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Trình duyệt không hỗ trợ GPS')
      return
    }
    setGpsLoading(true)
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setGps({ lat: latitude, lng: longitude })
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=vi`
          )
          const data = await res.json()
          const addr = data.display_name || `${latitude}, ${longitude}`
          setAddress(addr)
          const province = data.address?.city || data.address?.state || data.address?.county || ''
          const district = data.address?.suburb || data.address?.town || data.address?.village || ''
          setForm(f => ({ ...f, province, district }))
        } catch {
          setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
        }
        setGpsLoading(false)
      },
      (err) => {
        setGpsError(err.message || 'Không thể lấy vị trí GPS')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate({
      full_name: form.full_name,
      phone: form.phone || null,
      organization_name: isOrg ? form.organization_name : undefined,
      province: form.province || null,
      district: form.district || null,
      lat: gps?.lat || null,
      lng: gps?.lng || null,
    })
  }

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError('')
    setPwdSuccess('')

    if (pwdForm.new_password !== pwdForm.confirm_password) {
      setPwdError('Mật khẩu nhập lại không khớp')
      return
    }

    if (pwdForm.new_password.length < 8) {
      setPwdError('Mật khẩu mới phải có ít nhất 8 ký tự')
      return
    }

    pwdMutation.mutate({
      current_password: pwdForm.current_password,
      new_password: pwdForm.new_password
    })
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <AlertBanner />
      <Navbar />
      <div className="page-container py-8 max-w-2xl space-y-8">
        <div className="greeting-header">
          <div className="avatar-circle w-12 h-12 text-lg">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h1>Cài đặt hồ sơ</h1>
            <p>{user?.email}</p>
          </div>
        </div>

        {/* Profile Info Form */}
        <form onSubmit={handleSubmitProfile} className="space-y-6">
          <div className="card space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <User size={16} className="text-blue-400" /> Thông tin cá nhân
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Họ và tên</label>
                <input className="input" value={form.full_name} placeholder="Nhập họ và tên"
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Số điện thoại</label>
                <input className="input" type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0xxx-xxx-xxx" />
              </div>
            </div>
            {isOrg && (
              <div>
                <label className="label">Tên tổ chức</label>
                <input className="input" value={form.organization_name} placeholder="Nhập tên tổ chức"
                  onChange={e => setForm(f => ({ ...f, organization_name: e.target.value }))} />
              </div>
            )}
          </div>

          <div className="card space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <MapPin size={16} className="text-green-400" /> Vị trí
            </h3>

            <button type="button" onClick={handleGPS} disabled={gpsLoading}
              className="btn-primary w-full md:w-auto">
              {gpsLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Đang lấy vị trí...</>
              ) : (
                <><MapPin size={16} /> Sử dụng vị trí hiện tại</>
              )}
            </button>

            {gpsError && <p className="text-red-400 text-sm">{gpsError}</p>}

            {gps && (
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400">Lat:</span>
                  <span className="text-white font-mono">{gps.lat.toFixed(5)}</span>
                  <span className="text-gray-400 ml-2">Lng:</span>
                  <span className="text-white font-mono">{gps.lng.toFixed(5)}</span>
                </div>
                {address && (
                  <div className="flex items-start gap-2 mt-2">
                    <MapPin size={14} className="text-green-400 mt-0.5 shrink-0" />
                    <p className="text-green-300 text-sm">{address}</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Tỉnh / Thành phố</label>
                <input className="input" value={form.province}
                  onChange={e => setForm(f => ({ ...f, province: e.target.value }))} placeholder="VD: Cần Thơ" />
              </div>
              <div>
                <label className="label">Quận / Huyện</label>
                <input className="input" value={form.district}
                  onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="VD: Ninh Kiều" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Đang lưu...</>
              ) : (
                <><Save size={16} /> Lưu thay đổi</>
              )}
            </button>
            {saved && <span className="text-green-400 text-sm animate-pulse">✓ Đã lưu thành công!</span>}
            {saveMutation.isError && <span className="text-red-400 text-sm">Lỗi không thể lưu!</span>}
          </div>
        </form>

        {/* Change Password Form */}
        <div className="card space-y-4 border border-red-900/40">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Lock size={16} className="text-red-400" /> Đổi mật khẩu
          </h3>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <KeyRound size={12} /> Bạn chỉ có thể đổi mật khẩu 7 ngày 1 lần.
          </p>

          <form onSubmit={handleSubmitPassword} className="space-y-4 mt-2">
            <div>
              <label className="label">Mật khẩu hiện tại</label>
              <input type="password" required className="input"
                value={pwdForm.current_password}
                onChange={e => setPwdForm({ ...pwdForm, current_password: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Mật khẩu mới</label>
                <input type="password" required className="input" minLength={8}
                  value={pwdForm.new_password}
                  onChange={e => setPwdForm({ ...pwdForm, new_password: e.target.value })} />
              </div>
              <div>
                <label className="label">Xác nhận mật khẩu mới</label>
                <input type="password" required className="input" minLength={8}
                  value={pwdForm.confirm_password}
                  onChange={e => setPwdForm({ ...pwdForm, confirm_password: e.target.value })} />
              </div>
            </div>
            
            {pwdError && <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">{pwdError}</div>}
            {pwdSuccess && <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 text-green-300 text-sm">{pwdSuccess}</div>}

            <div className="pt-2">
              <button type="submit" disabled={pwdMutation.isPending} className="btn-danger w-full md:w-auto">
                {pwdMutation.isPending ? (
                  <><Loader2 size={16} className="animate-spin" /> Đang xử lý...</>
                ) : (
                  <><Lock size={16} /> Cập nhật mật khẩu</>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
