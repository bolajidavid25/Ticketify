import 'server-only'

import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import type { User } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'

export const SESSION_COOKIE = 'app-session'

export type GoogleUserProfile = {
  avatar?: string
  email: string
  emailVerified: boolean
  googleId: string
  name: string
}

function signHS256JWT(
  payloadData: Record<string, any>,
  secret: string,
  expiresInSeconds: number,
): { token: string; exp: number } {
  const header = { alg: 'HS256', authVersion: 1, typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const exp = now + expiresInSeconds
  const fullPayload = { ...payloadData, iat: now, exp }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  const data = `${encodedHeader}.${encodedPayload}`

  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url')
  return {
    token: `${data}.${signature}`,
    exp,
  }
}

export function createAppAuth(appUserCollection: 'users') {
  return {
    async currentUser(): Promise<User | null> {
      const token = (await cookies()).get(SESSION_COOKIE)?.value
      if (!token) return null

      const payload = await getPayloadClient()
      const authHeaders = new Headers({ Authorization: `JWT ${token}` })
      const { user } = await payload.auth({ headers: authHeaders })

      if (!user || user.collection !== appUserCollection) return null
      return user as User
    },

    async issueUserSession(user: { id: string | number; email: string }): Promise<string> {
      const payload = await getPayloadClient()
      const maxAge = 60 * 60 * 24 * 7 // 7 days
      const sid = crypto.randomUUID()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + maxAge * 1000)

      const sessionObj = {
        id: sid,
        type: 'login',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      }

      // Add session into user's sessions in PostgreSQL
      const userDoc = await payload.findByID({
        collection: appUserCollection,
        id: user.id,
        overrideAccess: true,
      })

      const activeSessions = (userDoc?.sessions || []).filter(
        (s: any) => s.expiresAt && new Date(s.expiresAt) > now,
      )

      await payload.update({
        collection: appUserCollection,
        id: user.id,
        overrideAccess: true,
        data: {
          sessions: [...activeSessions, sessionObj],
        },
      })

      const { token } = signHS256JWT(
        {
          id: user.id,
          collection: appUserCollection,
          email: user.email,
          sid,
        },
        payload.secret,
        maxAge,
      )

      const cookieStore = await cookies()
      const isHttps =
        process.env.NODE_ENV === 'production' &&
        !(process.env.NEXT_PUBLIC_SITE_URL || '').startsWith('http://localhost')
      cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        maxAge,
        path: '/',
        sameSite: 'lax',
        secure: isHttps,
      })

      return token
    },

    async authenticateGoogleUser(profile: GoogleUserProfile): Promise<{ token: string; user: User }> {
      const payload = await getPayloadClient()
      const normalizedEmail = profile.email.trim().toLowerCase()

      // 1. Check if user already exists by googleId
      const byGoogleId = await payload.find({
        collection: appUserCollection,
        where: { googleId: { equals: profile.googleId } },
        limit: 1,
        overrideAccess: true,
      })

      if (byGoogleId.docs[0]) {
        const existing = byGoogleId.docs[0]
        const updated = await payload.update({
          collection: appUserCollection,
          id: existing.id,
          overrideAccess: true,
          data: {
            avatar: profile.avatar || existing.avatar,
            name: existing.name || profile.name,
          },
        })
        const token = await this.issueUserSession(updated)
        return { token, user: updated as User }
      }

      // 2. Check if user exists by email (Account Linking)
      const byEmail = await payload.find({
        collection: appUserCollection,
        where: { email: { equals: normalizedEmail } },
        limit: 1,
        overrideAccess: true,
      })

      if (byEmail.docs[0]) {
        // Prevent account takeover: verify Google email verification status
        if (!profile.emailVerified) {
          throw new Error('Google account email is not verified. Account linking denied for security.')
        }

        const existing = byEmail.docs[0]
        const updated = await payload.update({
          collection: appUserCollection,
          id: existing.id,
          overrideAccess: true,
          data: {
            googleId: profile.googleId,
            avatar: profile.avatar || existing.avatar,
            authProvider: 'both',
          },
        })
        const token = await this.issueUserSession(updated)
        return { token, user: updated as User }
      }

      // 3. Register new student via Google
      const internalPassword = crypto.randomBytes(32).toString('hex') + 'Aa1!'
      const newUser = await payload.create({
        collection: appUserCollection,
        overrideAccess: true,
        data: {
          email: normalizedEmail,
          name: profile.name || 'Student',
          googleId: profile.googleId,
          avatar: profile.avatar,
          authProvider: 'google',
          password: internalPassword,
        },
      })

      const token = await this.issueUserSession(newUser)
      return { token, user: newUser as User }
    },

    async handleGoogleUser(profile: GoogleUserProfile): Promise<User> {
      const { user } = await this.authenticateGoogleUser(profile)
      return user
    },

    async login(email: string, password: string): Promise<User> {
      const payload = await getPayloadClient()
      const result = await payload.login({
        collection: appUserCollection,
        data: { email, password },
        overrideAccess: false,
      })

      if (!result.token || !result.user || result.user.collection !== appUserCollection) {
        throw new Error('Unable to start your student session.')
      }

      const now = Math.floor(Date.now() / 1000)
      const maxAge = result.exp ? Math.max(0, result.exp - now) : 60 * 60 * 2
      const cookieStore = await cookies()
      const isHttps =
        process.env.NODE_ENV === 'production' &&
        !(process.env.NEXT_PUBLIC_SITE_URL || '').startsWith('http://localhost')
      cookieStore.set(SESSION_COOKIE, result.token, {
        httpOnly: true,
        maxAge,
        path: '/',
        sameSite: 'lax',
        secure: isHttps,
      })

      return result.user as User
    },

    async logout(): Promise<void> {
      const cookieStore = await cookies()
      cookieStore.delete(SESSION_COOKIE)
    },
  }
}

export const studentAuth = createAppAuth('users')
