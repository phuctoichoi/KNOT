import { ReactNode } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import AlertBanner from '@/components/alerts/AlertBanner'

interface MainLayoutProps {
  children: ReactNode
  showFooter?: boolean
}

export default function MainLayout({ children, showFooter = true }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <AlertBanner />
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  )
}
