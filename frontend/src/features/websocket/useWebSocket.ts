import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { queryClient } from '@/main'

const isDev = import.meta.env.DEV
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const defaultWsUrl = `${protocol}//${window.location.host}/ws/connect`
const WS_URL = import.meta.env.VITE_WS_URL || defaultWsUrl
const PING_INTERVAL = 25_000
const RECONNECT_DELAY = 3_000

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const { accessToken } = useAuthStore()
  const { addNotification } = useNotificationStore()

  useEffect(() => {
    let pingTimer: ReturnType<typeof setInterval>
    let reconnectTimer: ReturnType<typeof setTimeout>
    let active = true

    const connect = () => {
      if (!active) return
      const url = accessToken ? `${WS_URL}?token=${accessToken}` : WS_URL
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }))
          }
        }, PING_INTERVAL)
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          switch (msg.type) {
            case 'new_report':
            case 'report_update':
              queryClient.invalidateQueries({ queryKey: ['map', 'reports'] })
              queryClient.invalidateQueries({ queryKey: ['reports'] })
              break
            case 'new_alert':
              queryClient.invalidateQueries({ queryKey: ['alerts'] })
              break
            case 'notification':
              addNotification(msg)
              break
          }
        } catch {}
      }

      ws.onclose = () => {
        clearInterval(pingTimer)
        if (active) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY)
        }
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      active = false
      clearInterval(pingTimer)
      clearTimeout(reconnectTimer)
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.onopen = () => wsRef.current?.close()
        } else {
          wsRef.current.close()
        }
      }
    }
  }, [accessToken])
}
