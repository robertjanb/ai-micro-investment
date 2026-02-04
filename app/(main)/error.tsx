'use client'

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md text-center">
        {error.message || 'An unexpected error occurred. Please try again.'}
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
