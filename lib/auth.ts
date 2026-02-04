import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

const LOGIN_RATE_LIMIT = { maxRequests: 10, windowMs: 60000 }

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.toLowerCase().trim()

        const rateCheck = checkRateLimit(`auth:login:${email}`, LOGIN_RATE_LIMIT)
        if (!rateCheck.allowed) {
          throw new Error('Too many login attempts. Please wait a moment.')
        }

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          return null
        }

        const isValid = await compare(credentials.password, user.passwordHash)

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          tokenVersion: user.tokenVersion,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.tokenVersion = (user as unknown as Record<string, unknown>).tokenVersion as number
      }
      // Periodically verify tokenVersion hasn't changed (session invalidation)
      if (token.id && token.tokenVersion !== undefined) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { tokenVersion: true },
        })
        if (!dbUser || dbUser.tokenVersion !== token.tokenVersion) {
          return { ...token, id: '' }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      } else {
        // Token was invalidated
        return { ...session, user: { id: '', email: '' } }
      }
      return session
    },
  },
}

export function getSession() {
  return getServerSession(authOptions)
}
