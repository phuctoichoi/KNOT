import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Tooltip } from 'react-leaflet'
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
}

export default function DisasterMap({ compact = false, style }: Props) {
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
    <div className="relative">
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

        {/* Report markers */}
        {layers.reports && reportsGeo?.features?.map((f: ReportFeature) => {
          const [lng, lat] = f.geometry.coordinates
          const color = TYPE_DOT[f.properties.report_type] || '#6B7280'
          const r = f.properties.severity === 'critical' ? 12 : f.properties.severity === 'high' ? 9 : 7
          return (
            <CircleMarker key={f.properties.id} center={[lat, lng]}
              radius={r} pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 2 }}>
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
            </CircleMarker>
          )
        })}

        {/* Support location markers */}
        {layers.support && supportGeo?.features?.map((f: any) => {
          const [lng, lat] = f.geometry.coordinates
          return (
            <CircleMarker key={f.properties.id} center={[lat, lng]}
              radius={8} pathOptions={{ color: '#22C55E', fillColor: '#22C55E', fillOpacity: 0.85, weight: 2 }}>
              <Popup><div><p className="font-bold">{f.properties.title}</p><p className="text-sm text-green-700">{t(`support.type.${f.properties.support_type}`)}</p></div></Popup>
            </CircleMarker>
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
