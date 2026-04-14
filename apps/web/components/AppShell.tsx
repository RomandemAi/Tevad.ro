'use client'

import Sidebar from './Sidebar'
import TopBar from './TopBar'
import MobileBottomNav from './MobileBottomNav'
import MobileAppNotices from './MobileAppNotices'
import SiteUnderstandingModal from './SiteUnderstandingModal'
import Footer from './Footer'

interface AppShellProps {
  children: React.ReactNode
  breadcrumb?: React.ReactNode
  topBarRight?: React.ReactNode
}

export default function AppShell({ children, breadcrumb, topBarRight }: AppShellProps) {
  return (
    <div className="tev-app-shell flex min-h-screen w-full bg-[var(--gray-50)]">
      <Sidebar className="hidden md:flex" />

      <main
        id="main-content"
        className="relative flex min-h-screen min-w-0 flex-1 flex-col scroll-mt-0 md:ml-[240px] md:pb-0 pb-[calc(4rem+env(safe-area-inset-bottom))]"
      >
        <MobileAppNotices />
        <SiteUnderstandingModal />
        {breadcrumb !== undefined && <TopBar right={topBarRight}>{breadcrumb}</TopBar>}
        {children}
        <Footer />
      </main>

      <MobileBottomNav />
    </div>
  )
}
