'use client'

import Image from 'next/image'
import { useActionState } from 'react'
import { submitComplaint, type ComplaintFormState } from '@/app/(frontend)/contact-actions'

const initialState: ComplaintFormState = { success: false, message: '' }

export function ContactSection() {
  const [state, formAction, pending] = useActionState(submitComplaint, initialState)

  return (
    <section className="mx-auto max-w-[1440px] px-6 pb-24 sm:px-10 lg:px-16 lg:pb-32" id="contact">
      <div className="overflow-hidden border border-[#d8e1da] bg-white shadow-[0_32px_90px_rgba(12,54,34,.1)]">
        <div className="grid lg:grid-cols-[.88fr_1.12fr]">
          <div className="relative min-h-[500px] overflow-hidden bg-[#0b2a1d] lg:min-h-[780px]">
            <Image
              alt="A student speaking with a campus support advisor"
              className="object-cover opacity-55"
              fill
              sizes="(min-width: 1024px) 44vw, 100vw"
              src="/images/student-support.png"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,28,18,.08),rgba(4,28,18,.88))]" />

            <div className="absolute inset-x-0 bottom-0 p-8 text-white sm:p-12">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] backdrop-blur">
                We&apos;re listening
              </span>
              <h2 className="mt-6 max-w-md text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl">
                Something not right?
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-white/68">
                Tell us what happened. Every complaint is sent privately to the Ticket Drop support team.
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden p-7 sm:p-12 lg:p-16">
            <svg
              aria-hidden="true"
              className="contact-shapes pointer-events-none absolute inset-0 size-full text-[#16844b]"
              fill="none"
              viewBox="0 0 700 800"
            >
              <circle className="shape shape-one" cx="610" cy="74" r="38" stroke="currentColor" strokeWidth="2" />
              <rect className="shape shape-two" height="74" stroke="currentColor" strokeWidth="2" transform="rotate(18 86 174)" width="74" x="49" y="137" />
              <path className="shape shape-three" d="m620 304 46 80h-92l46-80Z" stroke="currentColor" strokeWidth="2" />
              <path className="shape shape-four" d="m78 473 45 27-11 52-51 10-30-43 21-46h26Z" stroke="currentColor" strokeWidth="2" />
              <rect className="shape shape-five" height="34" stroke="currentColor" strokeWidth="2" transform="rotate(-28 626 564)" width="34" x="609" y="547" />
              <path className="shape shape-six" d="m596 680 48 40-18 60h-62l-19-59 51-41Z" stroke="currentColor" strokeWidth="2" />
            </svg>

            <div className="relative z-10">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#16844b]">Contact support</p>
              <h3 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#10271e] sm:text-5xl">Lodge a complaint</h3>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#66736c]">
                You do not need an account. Include enough detail for us to understand the issue and respond.
              </p>

              <form action={formAction} className="mt-9 grid gap-6 sm:grid-cols-2">
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input autoComplete="off" id="website" name="website" tabIndex={-1} />
              </div>

              <Field error={state.errors?.name} label="Full name">
                <input className="contact-input" id="name" maxLength={100} name="name" placeholder="Your full name" required type="text" />
              </Field>

              <Field error={state.errors?.email} label="Email address">
                <input className="contact-input" id="email" name="email" placeholder="you@university.edu" required type="email" />
              </Field>

              <Field error={state.errors?.subject} label="Subject">
                <input className="contact-input" id="subject" maxLength={160} name="subject" placeholder="A short summary" required type="text" />
              </Field>

              <fieldset className="sm:col-span-2">
                <legend className="mb-3 text-sm font-extrabold text-[#263c31]">What is this about?</legend>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['ticket-claim', 'Ticket claim'],
                    ['waitlist', 'Waitlist'],
                    ['event-information', 'Event information'],
                    ['account-access', 'Account access'],
                    ['other', 'Something else'],
                  ].map(([value, label]) => (
                    <label className="category-chip cursor-pointer" key={value}>
                      <input className="peer sr-only" name="category" required type="radio" value={value} />
                      <span className="block border-b-2 border-transparent px-1 py-2 text-xs font-bold text-[#53645a] transition peer-checked:border-[#16844b] peer-checked:text-[#12673b]">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
                {state.errors?.category && <p className="mt-2 text-xs font-semibold text-[#c6383f]">{state.errors.category}</p>}
              </fieldset>

              <div className="sm:col-span-2">
                <Field error={state.errors?.message} label="Tell us what happened">
                  <textarea className="contact-input min-h-36 resize-y" id="message" maxLength={3000} name="message" placeholder="Share the event, date, ticket code (if available), and what went wrong..." required />
                </Field>
              </div>

              <div className="sm:col-span-2">
                {state.message && (
                  <p
                    aria-live="polite"
                    className={`mb-4 border-l-2 px-4 py-3 text-sm font-semibold ${
                      state.success ? 'bg-[#e5f8eb] text-[#12633a]' : 'bg-[#fff0f0] text-[#b62f35]'
                    }`}
                  >
                    {state.message}
                  </p>
                )}
                <button
                  className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#0b2a1d] px-7 py-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#17623f] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                  disabled={pending}
                  type="submit"
                >
                  {pending ? 'Submitting complaint…' : 'Submit complaint'}
                  {!pending && <span aria-hidden="true">→</span>}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({
  children,
  error,
  label,
}: {
  children: React.ReactNode
  error?: string
  label: string
}) {
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
