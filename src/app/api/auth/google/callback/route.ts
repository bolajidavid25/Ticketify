import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, studentAuth } from '@/lib/app-auth'
import {
  getPublicOrigin,
  OAUTH_STATE_COOKIE,
  parseOAuthStateCookie,
  verifyGoogleTokenPayload,
  verifySignedOAuthState,
} from '@/lib/google-oauth'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = getPublicOrigin(request)
  const errorParam = url.searchParams.get('error')
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const cookieStore = await cookies()
  const stateCookie = cookieStore.get(OAUTH_STATE_COOKIE)?.value
  const parsedCookieState = parseOAuthStateCookie(stateCookie)
  const signedState = state ? verifySignedOAuthState(state) : null

  // Handle user cancelled auth
  if (errorParam === 'access_denied') {
    const res = NextResponse.redirect(new URL('/login?error=cancelled', origin), 302)
    res.cookies.delete(OAUTH_STATE_COOKIE)
    return res
  }

  if (errorParam) {
    const res = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(`Google authentication failed: ${errorParam}`)}`, origin),
      302,
    )
    res.cookies.delete(OAUTH_STATE_COOKIE)
    return res
  }

  // Validate state: prefer strict cookie match when present, or HMAC-signed state fallback for Safari/iOS ITP
  const validState =
    state && parsedCookieState && state === parsedCookieState.state
      ? parsedCookieState
      : signedState

  if (!validState) {
    const res = NextResponse.redirect(
      new URL('/login?error=Invalid+or+expired+OAuth+session.+Please+try+again.', origin),
      302,
    )
    res.cookies.delete(OAUTH_STATE_COOKIE)
    return res
  }

  if (!code) {
    const res = NextResponse.redirect(
      new URL('/login?error=Authorization+code+missing+from+Google+callback.', origin),
      302,
    )
    res.cookies.delete(OAUTH_STATE_COOKIE)
    return res
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/login?error=Google+OAuth+credentials+not+configured+on+server.', origin),
    )
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Google token exchange error:', errorText)
      return NextResponse.redirect(
        new URL('/login?error=Failed+to+exchange+authorization+code+with+Google.', origin),
      )
    }

    const tokens = await tokenResponse.json()
    if (!tokens.id_token) {
      return NextResponse.redirect(
        new URL('/login?error=Google+did+not+return+a+valid+identity+token.', origin),
      )
    }

    // Decode and verify the ID token
    // Parse JWT payload safely
    const parts = tokens.id_token.split('.')
    if (parts.length !== 3) {
      throw new Error('Malformed ID token.')
    }
    const tokenPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))

    const verified = verifyGoogleTokenPayload(tokenPayload, {
      clientId,
      expectedNonce: validState.nonce,
    })

    // Establish student session in Payload / PostgreSQL and attach cookie directly to the 302 redirect for Safari/iOS
    const { token } = await studentAuth.authenticateGoogleUser({
      googleId: verified.googleId,
      email: verified.email,
      emailVerified: verified.emailVerified,
      name: verified.name,
      avatar: verified.avatar,
    })

    const destination = validState.next || '/discover'
    const response = NextResponse.redirect(new URL(destination, origin), 302)
    response.cookies.delete(OAUTH_STATE_COOKIE)
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax',
      secure: origin.startsWith('https://'),
    })
    return response
  } catch (err: any) {
    console.error('Google callback error:', err)
    const res = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err.message || 'Authentication error')}`, origin),
      302,
    )
    res.cookies.delete(OAUTH_STATE_COOKIE)
    return res
  }
}
