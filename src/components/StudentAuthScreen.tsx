'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useActionState } from 'react'
import type { AuthFormState } from '@/app/(frontend)/auth-actions'

type StudentAuthScreenProps = {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>
  mode: 'login' | 'signup'
  nextPath?: string
}

const initialState: AuthFormState = { message: '' }

export function StudentAuthScreen(props: StudentAuthScreenProps) {
  return (
    <Suspense fallback={null}>
      <StudentAuthScreenInner {...props} />
    </Suspense>
  )
}

function StudentAuthScreenInner({ action, mode, nextPath }: StudentAuthScreenProps) {
  const [state, formAction, pending] = useActionState(action, initialState)
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const signup = mode === 'signup'
  const safeNext = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : ''

  const displayError = errorParam === 'cancelled'
    ? 'Google sign-in was cancelled.'
    : errorParam || state.message

  return (
    <main className="min-h-screen bg-[#eef2eb] px-4 py-4 text-[#10271e] sm:px-6 sm:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1500px] overflow-hidden bg-white shadow-[0_32px_90px_rgba(12,54,34,.12)] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[.94fr_1.06fr]">
        <section className="relative min-h-[420px] overflow-hidden bg-[#09291c] lg:min-h-full">
          <Image
            alt={signup ? 'University friends heading together to a campus event' : 'A student checking a digital ticket at a campus venue'}
            className="object-cover"
            fill
            priority
            sizes="(min-width: 1024px) 47vw, 100vw"
            src={signup ? '/images/student-signup.png' : '/images/student-login.png'}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,28,18,.08)_15%,rgba(4,28,18,.92)_100%)]" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-7 sm:p-10">
            <Link aria-label="Ticketify home" className="relative block h-14 w-36" href="/">
              <Image alt="Ticketify" className="object-contain object-left" fill priority sizes="144px" src="/images/ticketify-nav-logo.png" />
            </Link>
            <Link className="border-b border-white/60 pb-1 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition hover:border-[#c8ff66] hover:text-[#c8ff66]" href="/">
              Back home
            </Link>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-8 text-white sm:p-12 lg:p-16">
            <h1 className="max-w-xl text-5xl font-black leading-[0.9] tracking-[-0.055em] sm:text-7xl">
              {signup ? 'Get closer to every campus moment.' : 'Your next event is waiting.'}
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-white/68">
              {signup
                ? 'Create one verified student profile for fair ticket claims, live availability, and automatic waitlists.'
                : 'Sign in to manage your tickets, hold your place in line, and discover what is dropping next.'}
            </p>
          </div>
        </section>

        <section className="relative flex items-center overflow-hidden px-7 py-16 sm:px-14 lg:px-[clamp(4rem,7vw,7.5rem)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full border-[54px] border-[#c8ff66]/35" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-14 size-32 rotate-12 border-2 border-[#16844b]/15" />

          <div className="relative z-10 w-full max-w-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#16844b]">
              {signup ? 'Student registration' : 'Student sign in'}
            </p>
            <h2 className="mt-4 text-4xl font-black leading-none tracking-[-0.045em] sm:text-6xl">
              {signup ? 'Create your account.' : 'Good to see you.'}
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-[#66736c]">
              {signup ? 'Use your university details or sign in with Google.' : 'Sign in with your Google account or university credentials.'}
            </p>

            {/* Google OAuth Button */}
            <div className="mt-8">
              <a
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d2ddd5] bg-white px-5 py-3.5 text-sm font-extrabold text-[#173b2a] shadow-sm transition hover:border-[#9fb4a5] hover:bg-[#f7f9f7] hover:shadow"
                href={`/api/auth/google${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ''}`}
              >
                <svg className="size-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Continue with Google</span>
              </a>
            </div>

            <div className="relative my-7 flex items-center justify-center">
              <div className="w-full border-t border-[#dce4de]" />
              <span className="absolute bg-white px-3 text-xs font-bold uppercase tracking-wider text-[#8a9890]">
                Or with email
              </span>
            </div>

            {displayError && (
              <p aria-live="polite" className="mb-4 border-l-2 border-[#c6383f] bg-[#fff0f0] px-4 py-3 text-sm font-semibold text-[#a92b31]">
                {displayError}
              </p>
            )}

            <form action={formAction} className="grid gap-6 sm:grid-cols-2">
              {safeNext && <input name="next" type="hidden" value={safeNext} />}
              {signup && (
                <>
                  <AuthField error={state.errors?.name} label="Full name">
                    <input autoComplete="name" className="contact-input" id="name" maxLength={100} name="name" placeholder="Your full name" required type="text" />
                  </AuthField>
                  <AuthField error={state.errors?.studentId} label="Student ID">
                    <input autoComplete="off" className="contact-input uppercase" id="studentId" maxLength={50} name="studentId" placeholder="e.g. UNI/24/1042" required type="text" />
                  </AuthField>
                </>
              )}

              <div className={signup ? 'sm:col-span-2' : 'sm:col-span-2'}>
                <AuthField error={state.errors?.email} label="University email">
                  <input autoComplete="email" className="contact-input" id="email" name="email" placeholder="you@university.edu" required type="email" />
                </AuthField>
              </div>

              <div className={signup ? '' : 'sm:col-span-2'}>
                <AuthField error={state.errors?.password} label="Password">
                  <input autoComplete={signup ? 'new-password' : 'current-password'} className="contact-input" id="password" minLength={signup ? 8 : undefined} name="password" placeholder={signup ? 'At least 8 characters' : 'Your password'} required type="password" />
                </AuthField>
              </div>

              {signup && (
                <AuthField error={state.errors?.passwordConfirmation} label="Confirm password">
                  <input autoComplete="new-password" className="contact-input" id="passwordConfirmation" minLength={8} name="passwordConfirmation" placeholder="Repeat your password" required type="password" />
                </AuthField>
              )}

              <div className="sm:col-span-2">
                <button className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#0b2a1d] px-7 py-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#17623f] disabled:cursor-wait disabled:opacity-60 sm:w-auto" disabled={pending} type="submit">
                  {pending ? (signup ? 'Creating account…' : 'Signing in…') : (signup ? 'Create student account' : 'Sign in')}
                  {!pending && <span aria-hidden="true">→</span>}
                </button>
              </div>
            </form>

            <p className="mt-9 text-sm text-[#65716b]">
              {signup ? 'Already registered?' : 'New to Ticketify?'}{' '}
              <Link
                className="font-extrabold text-[#126f40] underline decoration-[#9cd19e] underline-offset-4 transition hover:text-[#0b2a1d]"
                href={
                  safeNext
                    ? `${signup ? '/login' : '/signup'}?next=${encodeURIComponent(safeNext)}`
                    : signup
                      ? '/login'
                      : '/signup'
                }
              >
                {signup ? 'Sign in' : 'Create an account'}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

function AuthField({ children, error, label }: { children: React.ReactNode; error?: string; label: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-extrabold text-[#263c31]" htmlFor={String((children as React.ReactElement<{ id?: string }>).props.id)}>
        {label}
      </label>
      {children}
      {error && <p className="mt-2 text-xs font-semibold text-[#c6383f]">{error}</p>}
    </div>
  )
}
