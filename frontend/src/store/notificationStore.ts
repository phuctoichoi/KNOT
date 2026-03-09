import { create } from 'zustand'

interface Notification {
  id: string
  type: string
  title: string
  body?: string
  link?: string
  is_read: boolean
  created_at: string
}

interface NotificationStore {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Notification) => void
  setNotifications: (n: Notification[]) => void
  markRead: (id: string) => void
  markAllRead: () => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (n) =>
    set((s) => ({
      notifications: [n, ...s.notifications].slice(0, 100),
      unreadCount: s.unreadCount + (n.is_read ? 0 : 1),
    })),
  setNotifications: (notifications) =>
    set({ notifications, unreadCount: notifications.filter((n) => !n.is_read).length }),
  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),
}))
