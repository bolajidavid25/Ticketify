import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  generateOAuthState,
  getGoogleOAuthUrl,
  OAUTH_STATE_COOKIE,
} from '@/lib/google-oauth'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const nextPath = url.searchParams.get('next') || '/discover'

  const { state, nonce, cookieValue } = generateOAuthState(nextPath)

  const cookieStore = await cookies()
  cookieStore.set(OAUTH_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    maxAge: 60 * 10, // 10 minutes
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    // In dev without credentials configured, return a clear error redirect
    const origin = url.origin
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          'Google OAuth client is not configured yet. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.',
        )}`,
        origin,
      ),
    )
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`
  const googleAuthUrl = getGoogleOAuthUrl({
    clientId,
    redirectUri,
    nonce,
    state,
  })

  return NextResponse.redirect(googleAuthUrl)
}
