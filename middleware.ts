export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/ideas/:path*',
    '/portfolio/:path*',
    '/watchlist/:path*',
    '/history/:path*',
    '/settings/:path*',
    '/api/chat/:path*',
    '/api/ideas/:path*',
    '/api/portfolio/:path*',
    '/api/watchlist/:path*',
    '/api/user/:path*',
  ],
}
