import { useEffect, useCallback } from 'react'
import { syncOfflineReports } from '@/services/storageService'
import api from '@/services/api'

export function useOnlineStatus(): boolean {
  const syncPending = useCallback(async () => {
    const count = await syncOfflineReports(async (report) => {
      const { lat, lng, localId, savedAt, ...rest } = report as any
      await api.post('/reports', { ...rest, lat, lng })
    })
    if (count > 0) {
      console.info(`[KNOT] Synced ${count} offline report(s)`)
    }
  }, [])

  useEffect(() => {
    const onOnline = () => syncPending()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [syncPending])

  return navigator.onLine
}
