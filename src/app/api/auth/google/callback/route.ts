import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { studentAuth } from '@/lib/app-auth'
import {
  OAUTH_STATE_COOKIE,
  parseOAuthStateCookie,
  verifyGoogleTokenPayload,
} from '@/lib/google-oauth'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = url.origin
  const errorParam = url.searchParams.get('error')
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const cookieStore = await cookies()
  const stateCookie = cookieStore.get(OAUTH_STATE_COOKIE)?.value
  const parsedState = parseOAuthStateCookie(stateCookie)

  // Clear OAuth state cookie
  cookieStore.delete(OAUTH_STATE_COOKIE)

  // Handle user cancelled auth
  if (errorParam === 'access_denied') {
    return NextResponse.redirect(new URL('/login?error=cancelled', origin))
  }

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(`Google authentication failed: ${errorParam}`)}`, origin),
    )
  }

  // Validate state
  if (!state || !parsedState || state !== parsedState.state) {
    return NextResponse.redirect(
      new URL('/login?error=Invalid+or+expired+OAuth+session.+Please+try+again.', origin),
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=Authorization+code+missing+from+Google+callback.', origin),
    )
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
      expectedNonce: parsedState.nonce,
    })

    // Establish student session in Payload / PostgreSQL
    await studentAuth.handleGoogleUser({
      googleId: verified.googleId,
      email: verified.email,
      emailVerified: verified.emailVerified,
      name: verified.name,
      avatar: verified.avatar,
    })

    const destination = parsedState.next || '/discover'
    return NextResponse.redirect(new URL(destination, origin))
  } catch (err: any) {
    console.error('Google callback error:', err)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err.message || 'Authentication error')}`, origin),
    )
  }
}
