import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { 
  Menu, X, Sun, Moon, Globe, Bell, LayoutDashboard, LogOut, Map, 
  AlertTriangle, BarChart2, ShieldCheck 
} from 'lucide-react'
import api from '@/services/api'
import { useTheme } from '@/hooks/useTheme'

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const toggleLang = () => {
    const next = i18n.language === 'vi' ? 'en' : 'vi'
    i18n.changeLanguage(next)
  }

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch { }
    logout()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
      <div className="page-container flex items-center justify-between h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <img src="/icons/knot-logo.png" alt="KNOT Logo" className="h-10 object-contain group-hover:scale-105 transition-transform dark:invert" />
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {isAuthenticated() && (
            <Link to="/dashboard/map" className="btn-ghost"><Map size={16} />{t('nav.map')}</Link>
          )}
          <Link to="/alerts" className="btn-ghost"><AlertTriangle size={16} />{t('nav.alerts')}</Link>
          <Link to="/stats" className="btn-ghost"><BarChart2 size={16} />{t('nav.stats')}</Link>
          <Link to="/safe-search" className="btn-ghost text-green-600 dark:text-green-400 font-medium">
            <ShieldCheck size={16} />{t('nav.safe_search')}
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button onClick={toggleTheme} className="btn-ghost flex items-center justify-center p-2 rounded-full" title={t('nav.toggle_theme')}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Language toggle */}
          <button onClick={toggleLang} className="btn-ghost flex items-center gap-1" title={t('nav.switch_lang')}>
            <Globe size={15} />
            <span className="text-xs uppercase">{i18n.language}</span>
          </button>

          {isAuthenticated() ? (
            <>
              {/* User avatar + profile link */}
              <Link to="/dashboard/profile" className="btn-ghost flex items-center gap-2" title={t('profile.settings')}>
                <span className="avatar-circle text-[10px]">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
                <span className="hidden lg:inline text-sm text-gray-300">{user?.full_name}</span>
              </Link>

              {/* Notifications */}
              <Link to="/dashboard" className="relative btn-ghost p-2">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center animate-pulse-fast">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link to="/dashboard" className="btn-ghost">
                <LayoutDashboard size={16} />
                <span className="hidden sm:inline">{t('nav.dashboard')}</span>
              </Link>
              <button onClick={handleLogout} className="btn-ghost text-red-400 hover:text-red-300" title={t('nav.logout')}>
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm">{t('nav.login')}</Link>
              <Link to="/register" className="btn-danger text-sm px-3 py-1.5">{t('nav.register')}</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
