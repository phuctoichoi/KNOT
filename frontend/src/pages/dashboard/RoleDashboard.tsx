import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import CitizenDashboard from './citizen/CitizenDashboard'
import VolunteerDashboard from './volunteer/VolunteerDashboard'
import OrgDashboard from './organization/OrgDashboard'
import ModeratorDashboard from './moderator/ModeratorDashboard'
import AdminDashboard from './admin/AdminDashboard'
import ProfilePage from './ProfilePage'

export default function RoleDashboard() {
  const { user } = useAuthStore()
  const role = user?.role ?? 'citizen'

  const DASHBOARDS: Record<string, React.ReactElement> = {
    citizen:      <CitizenDashboard />,
    volunteer:    <VolunteerDashboard />,
    organization: <OrgDashboard />,
    moderator:    <ModeratorDashboard />,
    admin:        <AdminDashboard />,
  }

  return (
    <Routes>
      <Route path="profile" element={<ProfilePage />} />
      <Route path="*" element={DASHBOARDS[role] ?? <CitizenDashboard />} />
    </Routes>
  )
}
