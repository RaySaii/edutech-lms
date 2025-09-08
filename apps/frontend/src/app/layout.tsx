import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import { GlobalAuthGuard } from '../components/auth/GlobalAuthGuard'
import ClientOnlyToastProvider from '../components/ui/ClientOnlyToastProvider'
import { MainNavigation } from '../components/navigation/MainNavigation'

export const metadata: Metadata = {
  title: 'EduTech LMS',
  description: 'Learning Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <ClientOnlyToastProvider>
          <AuthProvider>
            <GlobalAuthGuard>
              <MainNavigation />
              {children}
            </GlobalAuthGuard>
          </AuthProvider>
        </ClientOnlyToastProvider>
      </body>
    </html>
  )
}