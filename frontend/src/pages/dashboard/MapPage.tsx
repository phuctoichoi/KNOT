import Navbar from '@/components/layout/Navbar'
import AlertBanner from '@/components/alerts/AlertBanner'
import DisasterMap from '@/components/map/DisasterMap'
import MapControls from '@/components/map/MapControls'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, MapPin } from 'lucide-react'

export default function MapPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <AlertBanner />
      <Navbar />
      <div className="flex flex-1 overflow-hidden relative w-full pt-4 px-4 pb-4 gap-4">
        {/* Sidebar controls */}
        <div className="w-64 shrink-0 flex flex-col gap-4 overflow-y-auto hidden lg:flex">
          <MapControls />
        </div>
        
        {/* Maps container */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          <div className="card flex flex-col h-full p-0 overflow-hidden border-red-900/40 relative">
            <div className="bg-red-900/30 border-b border-red-900/40 p-3 flex items-center gap-2 shrink-0">
              <AlertTriangle size={18} className="text-red-400" />
              <h2 className="font-semibold text-red-100 flex-1">{t('report.type.emergency', 'Báo cáo Khẩn cấp')}</h2>
            </div>
            <div className="flex-1 relative h-full min-h-0 w-full">
              <DisasterMap style={{ height: '100%', width: '100%' }} reportTypeFilter="emergency" />
            </div>
          </div>
          
          <div className="card flex flex-col h-full p-0 overflow-hidden border-blue-900/40 relative">
            <div className="bg-blue-900/30 border-b border-blue-900/40 p-3 flex items-center gap-2 shrink-0">
              <MapPin size={18} className="text-blue-400" />
              <h2 className="font-semibold text-blue-100 flex-1">{t('report.type.damage', 'Báo cáo Hậu thiên tai')}</h2>
            </div>
            <div className="flex-1 relative h-full min-h-0 w-full">
              <DisasterMap style={{ height: '100%', width: '100%' }} reportTypeFilter="damage" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
