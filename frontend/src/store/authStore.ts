import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  full_name: string
  email: string
  role: 'citizen' | 'volunteer' | 'organization' | 'moderator' | 'admin'
  status: string
  avatar_url?: string
  organization_name?: string
  province?: string
  district?: string
  phone?: string
  lat?: number
  lng?: number
}

interface AuthStore {
  user: User | null
  accessToken: string | null
  setAuth: (user: User, token: string) => void
  setToken: (token: string) => void
  logout: () => void
  isAuthenticated: () => boolean
  hasRole: (...roles: string[]) => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      setToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null }),
      isAuthenticated: () => !!get().accessToken && !!get().user,
      hasRole: (...roles) => {
        const role = get().user?.role
        return role ? roles.includes(role) : false
      },
    }),
    {
      name: 'knot-auth',
      // Only persist user object, NOT access token (security: keep token in memory)
      partialize: (state) => ({ user: state.user }),
    }
  )
)
