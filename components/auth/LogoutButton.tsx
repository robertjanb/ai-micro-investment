'use client'

import { signOut } from 'next-auth/react'

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-xs uppercase tracking-[0.18em] text-slate-500 hover:text-slate-900"
    >
      Sign out
    </button>
  )
}
