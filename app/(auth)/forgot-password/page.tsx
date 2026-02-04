'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    setIsLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to send reset email')
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="mt-8 space-y-6 text-center">
        <div className="bg-green-50 dark:bg-green-900/50 text-green-600 dark:text-green-400 p-4 rounded-md">
          <p className="font-medium">Check your email</p>
          <p className="mt-1 text-sm">
            If an account exists with that email, we&apos;ve sent password reset instructions.
          </p>
        </div>
        <Link
          href="/login"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          placeholder="you@example.com"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Sending...' : 'Send reset link'}
      </button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
