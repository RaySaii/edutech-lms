import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import { GlobalAuthGuard } from '../components/auth/GlobalAuthGuard'
import { ToastProvider } from '../components/ui/toast'

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
      <body>
        <ToastProvider>
          <AuthProvider>
            <GlobalAuthGuard>
              {children}
            </GlobalAuthGuard>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}