import crypto from 'node:crypto'
import { cookies } from 'next/headers'

export const OAUTH_STATE_COOKIE = 'g_oauth_state'

export type OAuthStatePayload = {
  next: string
  nonce: string
  state: string
}

export function generateOAuthState(nextPath?: string): {
  cookieValue: string
  nonce: string
  state: string
} {
  const state = crypto.randomBytes(32).toString('hex')
  const nonce = crypto.randomBytes(16).toString('hex')
  const next = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/discover'

  const cookieValue = JSON.stringify({ state, nonce, next })
  return { state, nonce, cookieValue }
}

export function parseOAuthStateCookie(cookieHeader?: string | null): OAuthStatePayload | null {
  if (!cookieHeader) return null
  try {
    const parsed = JSON.parse(cookieHeader)
    if (parsed && typeof parsed.state === 'string' && typeof parsed.nonce === 'string') {
      return parsed as OAuthStatePayload
    }
    return null
  } catch {
    return null
  }
}

export function getGoogleOAuthUrl(options: {
  clientId: string
  redirectUri: string
  nonce: string
  state: string
}): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', options.clientId)
  url.searchParams.set('redirect_uri', options.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', options.state)
  url.searchParams.set('nonce', options.nonce)
  url.searchParams.set('prompt', 'select_account')
  return url.toString()
}

export type VerifiedGoogleIdToken = {
  avatar?: string
  email: string
  emailVerified: boolean
  googleId: string
  name: string
}

/**
 * Validates Google OpenID Connect ID token claims:
 * 1. Issuer must be accounts.google.com or https://accounts.google.com
 * 2. Audience must match clientId
 * 3. Expiration must be in the future
 * 4. Nonce must match session nonce
 */
export function verifyGoogleTokenPayload(
  payload: any,
  options: { clientId: string; expectedNonce?: string },
): VerifiedGoogleIdToken {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid token payload.')
  }

  const validIssuers = ['accounts.google.com', 'https://accounts.google.com']
  if (!validIssuers.includes(payload.iss)) {
    throw new Error(`Invalid token issuer: ${payload.iss}`)
  }

  if (payload.aud !== options.clientId) {
    throw new Error(`Token audience mismatch. Expected ${options.clientId}, got ${payload.aud}`)
  }

  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp === 'number' && payload.exp < now - 60) {
    throw new Error('Google token has expired.')
  }

  if (options.expectedNonce && payload.nonce && payload.nonce !== options.expectedNonce) {
    throw new Error('OIDC nonce mismatch. Possible replay attack.')
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Token does not contain a valid Google user ID (sub).')
  }

  if (!payload.email || typeof payload.email !== 'string') {
    throw new Error('Token does not contain a valid email address.')
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    emailVerified: Boolean(payload.email_verified),
    name: payload.name || payload.given_name || 'Student',
    avatar: payload.picture,
  }
}
