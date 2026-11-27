import { NextResponse } from 'next/server'
import {
  generateOAuthState,
  getGoogleOAuthUrl,
  getPublicOrigin,
  OAUTH_STATE_COOKIE,
} from '@/lib/google-oauth'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const nextPath = url.searchParams.get('next') || '/discover'

  const { state, nonce, cookieValue } = generateOAuthState(nextPath)
  const origin = getPublicOrigin(request)
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    // In dev without credentials configured, return a clear error redirect
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          'Google OAuth client is not configured yet. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.',
        )}`,
        origin,
      ),
      302,
    )
  }

  const redirectUri = `${origin}/api/auth/google/callback`
  const googleAuthUrl = getGoogleOAuthUrl({
    clientId,
    redirectUri,
    nonce,
    state,
  })

  const response = NextResponse.redirect(googleAuthUrl, 302)
  response.cookies.set(OAUTH_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    maxAge: 60 * 10, // 10 minutes
    path: '/',
    sameSite: 'lax',
    secure: origin.startsWith('https://'),
  })
  return response
}
