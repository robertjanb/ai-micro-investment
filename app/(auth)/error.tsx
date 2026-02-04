'use client'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mt-8 text-center">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  )
}
