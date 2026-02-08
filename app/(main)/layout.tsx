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
      <div className="app-shell">
        <header className="sticky top-0 z-20 border-b border-white/40 bg-white/80 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <Link
                  href="/ideas"
                  className="font-display text-lg text-slate-900 tracking-tight"
                >
                  Micro-Investment
                </Link>
                <nav className="hidden sm:flex items-center gap-2">
                  <Link
                    href="/ideas"
                    className="px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-600 hover:text-slate-900 rounded-full border border-slate-200 bg-white/70"
                  >
                    Ideas
                  </Link>
                  <Link
                    href="/portfolio"
                    className="px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-600 hover:text-slate-900 rounded-full border border-slate-200 bg-white/70"
                  >
                    Portfolio
                  </Link>
                  <Link
                    href="/watchlist"
                    className="px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-600 hover:text-slate-900 rounded-full border border-slate-200 bg-white/70"
                  >
                    Watchlist
                  </Link>
                  <Link
                    href="/history"
                    className="px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-600 hover:text-slate-900 rounded-full border border-slate-200 bg-white/70"
                  >
                    History
                  </Link>
                </nav>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs text-slate-500 bg-white/70 border border-slate-200 rounded-full px-3 py-1">
                  {session.user.email}
                </span>
                <Link
                  href="/settings"
                  className="text-xs uppercase tracking-[0.18em] text-slate-500 hover:text-slate-800"
                >
                  Settings
                </Link>
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>

        <nav className="sm:hidden border-b border-white/40 bg-white/80 backdrop-blur">
          <div className="flex justify-around py-2">
            <Link
              href="/ideas"
              className="text-xs uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 px-3 py-2"
            >
              Ideas
            </Link>
            <Link
              href="/portfolio"
              className="text-xs uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 px-3 py-2"
            >
              Portfolio
            </Link>
            <Link
              href="/watchlist"
              className="text-xs uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 px-3 py-2"
            >
              Watchlist
            </Link>
            <Link
              href="/history"
              className="text-xs uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 px-3 py-2"
            >
              History
            </Link>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </SessionProvider>
  )
}
