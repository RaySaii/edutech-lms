import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import { GlobalAuthGuard } from '../components/auth/GlobalAuthGuard'

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
        <AuthProvider>
          <GlobalAuthGuard>
            {children}
          </GlobalAuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}