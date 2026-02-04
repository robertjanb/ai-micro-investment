import type { Metadata } from 'next'
import { Manrope, Sora } from 'next/font/google'
import './globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-body' })
const sora = Sora({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'AI Micro-Investment Companion',
  description: 'Your skeptical finance consultant for daily investment ideas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${sora.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  )
}
