import type { User } from '@/payload-types'
import { studentAuth } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

/**
 * Resolves the authenticated student from either Authorization header (JWT <token>)
 * or the HTTP-only app-session cookie.
 */
export async function getAuthenticatedStudent(request?: Request): Promise<User | null> {
  if (request) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace(/^(JWT|Bearer)\s+/i, '').trim()
      if (token) {
        try {
          const payload = await getPayloadClient()
          const { user } = await payload.auth({
            headers: new Headers({ Authorization: `JWT ${token}` }),
          })
          if (user && user.collection === 'users') {
            return user as User
          }
        } catch {
          // Fall through to cookie
        }
      }
    }
  }

  return studentAuth.currentUser()
}
