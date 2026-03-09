import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { MapPin, Phone, Images } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { formatDistance, getDistance } from '@/utils/distance'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'

// Create custom icons for the markers
const createCustomIcon = (colorClass: string) => {
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `<div class="w-6 h-6 rounded-full flex items-center justify-center text-white ${colorClass} shadow-lg ring-2 ring-white shadow-black/30">
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24]
  })
}

const userIcon = createCustomIcon('bg-blue-600')
const reportIcon = createCustomIcon('bg-red-600')

export default function ReportDetailModal({ report, userLat, userLng, onClose, actions }: any) {
  const { t } = useTranslation()
  const [showMenu, setShowMenu] = useState(false)

  if (!report) return null

  const distance =
    userLat && userLng && report.lat && report.lng
      ? getDistance(userLat, userLng, report.lat, report.lng)
      : null

  const positions: [number, number][] = []
  if (userLat && userLng) positions.push([userLat, userLng])
  if (report.lat && report.lng) positions.push([report.lat, report.lng])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-white text-gray-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-8 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header Row */}
          <div className="flex items-center gap-3 mb-6">
            <span className={`px-3 py-1 text-sm font-semibold rounded-md ${
              report.status === 'pending' ? 'bg-red-500 text-white' : 
              report.status === 'verified' ? 'bg-blue-600 text-white' : 
              report.status === 'in_progress' ? 'bg-orange-500 text-white' : 
              'bg-green-600 text-white'
            }`}>
              {t(`report.status.${report.status}`)}
            </span>
          </div>

          {/* Info Summary Box */}
          <div className="bg-gray-50 rounded-lg p-5 mb-6 text-sm space-y-3 shadow-sm border border-gray-100">
            <div className="flex">
              <span className="w-28 font-semibold text-gray-700">Thời gian:</span>
              <span className="text-gray-600">
                {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: vi })}
              </span>
            </div>
            <div className="flex">
              <span className="w-28 font-semibold text-gray-700">Vị trí báo cáo:</span>
              <span className="text-gray-600 font-medium">{report.address_text || report.province || 'Chưa rõ'}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-semibold text-gray-700">Khoảng cách:</span>
              <span className="text-blue-600 font-bold">{formatDistance(distance) || 'Không xác định'}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-semibold text-gray-700">Loại báo cáo:</span>
              <span className="text-gray-600">{t(`report.type.${report.disaster_type}`)}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-semibold text-gray-700">Liên hệ:</span>
              <span className="text-gray-600">{report.contact_phone || report.contact_email || 'Không có'}</span>
            </div>
          </div>

          {/* Detailed Description */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-800 mb-2">Mô tả chi tiết:</h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{report.description || 'Không có mô tả chi tiết'}</p>
          </div>

          {/* Images */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Images size={16} /> Hình ảnh:
            </h3>
            {report.images && report.images.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {report.images.map((img: any) => (
                  <img key={img.id} src={img.url} className="h-28 w-40 object-cover rounded-lg border border-gray-200 shadow-sm" alt="Báo cáo" />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 text-sm italic py-4">
                <Images size={16} /> Không có hình ảnh
              </div>
            )}
          </div>

          {/* Map */}
          {positions.length > 0 && (
            <div className="mb-8">
              <h3 className="text-base font-semibold text-gray-800 mb-3">Vị trí và khoảng cách:</h3>
              <div className="h-[250px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner">
                <MapContainer
                  bounds={positions}
                  boundsOptions={{ padding: [50, 50], maxZoom: 15 }}
                  style={{ height: '100%', width: '100%', zIndex: 0 }}
                  zoomControl={true}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  
                  {report.lat && report.lng && (
                    <Marker position={[report.lat, report.lng]} icon={reportIcon} />
                  )}
                  {userLat && userLng && (
                    <Marker position={[userLat, userLng]} icon={userIcon} />
                  )}
                  
                  {positions.length === 2 && (
                    <Polyline 
                      positions={positions} 
                      pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '8, 8' }} 
                    />
                  )}
                </MapContainer>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100 relative">
            <button
              onClick={(e) => { e.stopPropagation(); onClose() }}
              className="px-6 py-2.5 bg-white border border-gray-300 text-blue-600 font-medium rounded-lg hover:bg-gray-50 flex-1 transition-colors"
            >
              Đóng
            </button>
            
            <div className="flex-1 relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
                className="w-full px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex justify-center items-center gap-2"
              >
                Cập nhật trạng thái
              </button>
              
              {showMenu && (
                <div className="absolute bottom-full mb-2 right-0 w-full bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden z-10 animate-in slide-in-from-bottom-2 fade-in">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); actions.verify(report.id); onClose() }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    Đã xác minh
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); actions.process(report.id); onClose() }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    Đang xử lý
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); actions.resolve(report.id); onClose() }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium text-green-600 hover:bg-green-50 transition-colors"
                  >
                    Xử lý hoàn tất
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
