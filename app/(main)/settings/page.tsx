'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'

export default function SettingsPage() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (!password) {
      setError('Please enter your password')
      return
    }

    setIsDeleting(true)
    setError('')

    try {
      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete account')
        setIsDeleting(false)
        return
      }

      await signOut({ callbackUrl: '/login' })
    } catch {
      setError('Failed to delete account')
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Settings
      </h1>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-base font-medium text-red-600 dark:text-red-400 mb-2">
          Delete Account
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          This will permanently delete your account and all associated data
          including conversations, watchlist items, and preferences.
          This action cannot be undone.
        </p>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Confirm your password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm deletion'}
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false)
                  setPassword('')
                  setError('')
                }}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
