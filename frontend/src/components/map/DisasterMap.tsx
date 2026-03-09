import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Popup, Polygon, Tooltip, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMapStore } from '@/store/mapStore'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '@/services/api'

const SEVERITY_COLORS: Record<string, string> = {
  low: '#60A5FA', medium: '#FBBF24', high: '#F97316', critical: '#EF4444'
}

const TYPE_DOT: Record<string, string> = {
  emergency: '#EF4444',
  damage: '#3B82F6',
}

const getCustomIcon = (color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));">${svg}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })
}

interface ReportFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: {
    id: string; report_type: string; disaster_type: string
    severity: string; status: string; title: string; address_text?: string
  }
}

interface Props {
  compact?: boolean
  style?: React.CSSProperties
  reportTypeFilter?: 'emergency' | 'damage'
}

export default function DisasterMap({ compact = false, style, reportTypeFilter }: Props) {
  const { layers, filters } = useMapStore()
  const { t } = useTranslation()

  const { data: reportsGeo } = useQuery({
    queryKey: ['map', 'reports', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.types.length) params.set('types', filters.types.join(','))
      if (filters.statuses.length) params.set('statuses', filters.statuses.join(','))
      if (filters.province) params.set('province', filters.province)
      const { data } = await api.get(`/map/reports?${params}`)
      return data
    },
    refetchInterval: 30_000,
  })

  const { data: supportGeo } = useQuery({
    queryKey: ['map', 'support'],
    queryFn: async () => { const { data } = await api.get('/map/support-locations'); return data },
    enabled: layers.support,
    refetchInterval: 60_000,
  })

  const { data: zonesGeo } = useQuery({
    queryKey: ['map', 'zones'],
    queryFn: async () => { const { data } = await api.get('/map/zones'); return data },
    enabled: layers.zones || layers.dangerZones,
    refetchInterval: 120_000,
  })

  const mapStyle: React.CSSProperties = style || { height: compact ? '350px' : 'calc(100vh - 3.5rem)', width: '100%' }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[16.047, 108.206]}
        zoom={compact ? 5 : 6}
        style={mapStyle}
        zoomControl={!compact}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {layers.reports && reportsGeo?.features?.map((f: ReportFeature) => {
          if (reportTypeFilter && f.properties.report_type !== reportTypeFilter) return null
          const [lng, lat] = f.geometry.coordinates
          const color = TYPE_DOT[f.properties.report_type] || '#6B7280'
          return (
            <Marker key={f.properties.id} position={[lat, lng]} icon={getCustomIcon(color)}>
              <Popup>
                <div className="text-gray-900">
                  <p className="font-bold">{f.properties.title}</p>
                  <p className="text-sm">{t(`report.disaster.${f.properties.disaster_type}`)}</p>
                  <p className="text-xs text-gray-500">{f.properties.address_text}</p>
                  <span className={`badge-${f.properties.status.replace('_','-')} text-xs mt-1`}>
                    {t(`report.status.${f.properties.status}`)}
                  </span>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Support location markers */}
        {layers.support && supportGeo?.features?.map((f: any) => {
          const [lng, lat] = f.geometry.coordinates
          return (
            <Marker key={f.properties.id} position={[lat, lng]} icon={getCustomIcon('#22C55E')}>
              <Popup><div><p className="font-bold">{f.properties.title}</p><p className="text-sm text-green-700">{t(`support.type.${f.properties.support_type}`)}</p></div></Popup>
            </Marker>
          )
        })}

        {/* Zone overlays */}
        {(layers.zones || layers.dangerZones) && zonesGeo?.features?.map((f: any) => {
          if (!layers.dangerZones && f.properties.is_danger) return null
          const coords: [number, number][] = f.geometry.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng])
          const color = f.properties.is_danger ? '#EF4444' : f.properties.is_spread ? '#F97316' : '#6366F1'
          return (
            <Polygon key={f.properties.id} positions={coords}
              pathOptions={{ color, fillColor: color, fillOpacity: f.properties.is_danger ? 0.25 : 0.15, weight: 2 }}>
              <Tooltip sticky><span>{f.properties.name} – {f.properties.severity}</span></Tooltip>
            </Polygon>
          )
        })}
      </MapContainer>

      {compact && (
        <div className="absolute bottom-4 right-4 z-10">
          <Link to="/map" className="btn-danger text-sm shadow-xl">
            {t('map.view_full')}
          </Link>
        </div>
      )}
    </div>
  )
}
