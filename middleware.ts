export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/chat/:path*',
    '/watchlist/:path*',
    '/history/:path*',
    '/settings/:path*',
    '/api/chat/:path*',
    '/api/ideas/:path*',
    '/api/watchlist/:path*',
    '/api/user/:path*',
  ],
}
