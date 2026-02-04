import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { SessionProvider } from '@/components/providers/SessionProvider'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-14 items-center">
              <div className="flex items-center gap-8">
                <Link
                  href="/chat"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  AI Micro-Investment
                </Link>
                <nav className="hidden sm:flex gap-6">
                  <Link
                    href="/chat"
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    Chat
                  </Link>
                  <Link
                    href="/watchlist"
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    Watchlist
                  </Link>
                  <Link
                    href="/history"
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    History
                  </Link>
                </nav>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                  {session.user.email}
                </span>
                <Link
                  href="/settings"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Settings
                </Link>
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>

        {/* Mobile navigation */}
        <nav className="sm:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-around py-2">
            <Link
              href="/chat"
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-1"
            >
              Chat
            </Link>
            <Link
              href="/watchlist"
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-1"
            >
              Watchlist
            </Link>
            <Link
              href="/history"
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-1"
            >
              History
            </Link>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </SessionProvider>
  )
}
