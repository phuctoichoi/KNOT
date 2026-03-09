import Navbar from '@/components/layout/Navbar'
import AlertBanner from '@/components/alerts/AlertBanner'
import DisasterMap from '@/components/map/DisasterMap'
import MapControls from '@/components/map/MapControls'
import { useTranslation } from 'react-i18next'

export default function MapPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <AlertBanner />
      <Navbar />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar controls */}
        <div className="absolute top-3 left-3 z-20 w-64">
          <MapControls />
        </div>
        <DisasterMap style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  )
}
