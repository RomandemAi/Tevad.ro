import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface AppShellProps {
  children: React.ReactNode
  breadcrumb?: React.ReactNode
  topBarRight?: React.ReactNode
}

export default function AppShell({ children, breadcrumb, topBarRight }: AppShellProps) {
  return (
    <div className="flex min-h-screen max-w-[1020px] mx-auto">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {breadcrumb !== undefined && (
          <TopBar right={topBarRight}>{breadcrumb}</TopBar>
        )}
        {children}
      </main>
    </div>
  )
}
