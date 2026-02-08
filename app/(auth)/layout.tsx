import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (session) {
    redirect('/ideas')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Micro-Investment
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Your skeptical finance consultant
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
