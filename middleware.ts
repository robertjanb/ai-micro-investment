export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/ideas/:path*',
    '/portfolio/:path*',
    '/watchlist/:path*',
    '/history/:path*',
    '/performance/:path*',
    '/settings/:path*',
    '/api/chat/:path*',
    '/api/ideas/:path*',
    '/api/portfolio/:path*',
    '/api/watchlist/:path*',
    '/api/performance/:path*',
    '/api/user/:path*',
  ],
}
