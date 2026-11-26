import Image from 'next/image'
import Link from 'next/link'
import { connection } from 'next/server'
import { HeroSlider } from '@/components/HeroSlider'
import { ContactSection } from '@/components/ContactSection'
import { studentAuth } from '@/lib/app-auth'
import { getCategoryImage } from '@/lib/event-media'
import { getPayloadClient } from '@/lib/payload'

type MediaRef = { url?: string | null; alt?: string | null; width?: number | null; height?: number | null } | number | string | null

type EventCard = {
  id: number | string
  title: string
  slug: string
  description: string
  startsAt: string
  venue: string
  category: string
  capacity: number
  issuedCount?: number | null
  price?: number | null
  image?: MediaRef
  gallery?: Array<{ image?: MediaRef } | null> | null
}

const CANONICAL_DROPS = [
  'afrobeats-campus-fest',     // 1. The concert
  'annual-arts-showcase',      // 2. The art studio
  'varsity-basketball-finals', // 3. The Basketball game
  'nextgen-tech-summit',       // 4. The Tech event
] as const

async function getUpcomingEvents(): Promise<EventCard[]> {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'events',
      overrideAccess: false,
      where: {
        and: [
          { status: { equals: 'published' } },
          { slug: { in: CANONICAL_DROPS } },
        ],
      },
      depth: 1,
      limit: 10,
    })

    const docs = (result.docs || []) as EventCard[]
    // Return strictly the 4 distinct events in the requested order:
    return CANONICAL_DROPS.map((slug) => docs.find((d) => d.slug === slug)).filter(Boolean) as EventCard[]
  } catch {
    return []
  }
}

export default async function HomePage() {
  await connection()
  const [events, currentUser] = await Promise.all([
    getUpcomingEvents(),
    studentAuth.currentUser(),
  ])

  return (
    <main className="overflow-hidden bg-[#f6f7f2] text-[#10271e]">
      <HeroSlider />

      <section className="mx-auto max-w-[1440px] px-6 py-24 sm:px-10 lg:px-16 lg:py-32" id="events">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[#16844b]">Fresh on campus</p>
            <h2 className="max-w-2xl text-4xl font-black leading-none tracking-[-0.045em] sm:text-6xl">What&apos;s dropping next</h2>
          </div>
          <p className="max-w-md text-base leading-7 text-[#54635c]">
            Live availability from the source of truth. When seats go, join the queue and we&apos;ll keep your place.
          </p>
        </div>

        {events.length ? (
          <div className="grid gap-8 md:grid-cols-2">
            {events.map((event) => {
              const coverImage = (() => {
                const img = event.image
                if (img && typeof img === 'object' && img.url) return { alt: (img.alt as string) || event.title, url: img.url as string }
                return getCategoryImage(event.category)
              })()
              const remaining = Math.max(0, event.capacity - (event.issuedCount ?? 0))
              const date = new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short' }).format(new Date(event.startsAt))
              const time = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(event.startsAt))
              const loginHref = `/login?next=${encodeURIComponent(`/events/${event.slug}`)}`
              const signupHref = `/signup?next=${encodeURIComponent(`/events/${event.slug}`)}`
              const targetHref = currentUser ? `/events/${event.slug}` : loginHref

              return (
                <article className="group flex flex-col overflow-hidden rounded-[2.25rem] border border-[#dce1d9] bg-white transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(12,54,34,.12)]" key={event.id}>
                  <Link className="relative block aspect-[16/9] overflow-hidden rounded-t-[2.25rem] bg-[#dfe7de]" href={targetHref}>
                    <Image
                      alt={coverImage.alt}
                      className="object-cover transition duration-700 group-hover:scale-105"
                      fill
                      sizes="(min-width: 1280px) 40vw, (min-width: 768px) 50vw, 95vw"
                      src={coverImage.url}
                    />
                    <div className="absolute left-5 top-5 rounded-full bg-white/92 px-4 py-2 text-xs font-extrabold text-[#0e3826] shadow-sm backdrop-blur">
                      {event.category}
                    </div>
                    <div className={`absolute bottom-5 right-5 rounded-full px-4 py-2 text-xs font-extrabold shadow-sm backdrop-blur ${remaining > 0 ? 'bg-[#c8ff66] text-[#123222]' : 'bg-[#d94747] text-white'}`}>
                      {remaining > 0 ? `${remaining} / ${event.capacity} seats left` : 'Sold out · Waitlist'}
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col p-6 sm:p-8">
                    <div className="mb-5 flex gap-5">
                      <div className="min-w-16 rounded-2xl border border-[#dce1d9] bg-[#f6f8f5] p-3 text-center">
                        <span className="block text-2xl font-black leading-none text-[#16844b]">{date.split(' ')[0]}</span>
                        <span className="mt-1 block text-xs font-extrabold uppercase tracking-wider text-[#6c7972]">{date.split(' ')[1]}</span>
                      </div>
                      <div className="min-w-0">
                        <Link href={targetHref}>
                          <h3 className="text-xl font-black tracking-[-0.025em] text-[#10271e] transition group-hover:text-[#16844b] sm:text-2xl">{event.title}</h3>
                        </Link>
                        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-[#6c7972]">
                          <svg aria-hidden="true" className="size-4 shrink-0 text-[#16844b]" fill="none" viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" /></svg>
                          <span>{time} · {event.venue}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#f3f6f2] p-3.5 text-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#6c7972]">Available</p>
                        <p className={`mt-0.5 text-base font-black ${remaining > 0 ? 'text-[#16844b]' : 'text-[#d94747]'}`}>{remaining}</p>
                      </div>
                      <div className="border-x border-[#dce1d9]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#6c7972]">Total seats</p>
                        <p className="mt-0.5 text-base font-black text-[#10271e]">{event.capacity}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#6c7972]">Price</p>
                        <p className="mt-0.5 text-base font-black text-[#10271e]">{event.price ? `₦${event.price.toLocaleString()}` : 'Free'}</p>
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#65716b]">{event.description}</p>
                    
                    <div className="mt-auto pt-6">
                      {currentUser ? (
                        <div className="flex items-center justify-between border-t border-[#f0f3ee] pt-4">
                          <span className="text-xs font-bold text-[#6c7972]">1 seat per student</span>
                          <Link className="inline-flex items-center gap-2 rounded-full bg-[#0b2a1d] px-5 py-2.5 text-xs font-black text-white transition hover:bg-[#16844b]" href={`/events/${event.slug}`}>
                            {remaining > 0 ? 'Get ticket' : 'Join waitlist'} <span aria-hidden="true">→</span>
                          </Link>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f3ee] pt-4">
                          <span className="text-xs font-semibold text-[#6c7972]">Sign in or sign up to claim:</span>
                          <div className="flex items-center gap-2">
                            <Link className="rounded-full bg-[#0b2a1d] px-4 py-2 text-xs font-black text-white transition hover:bg-[#16844b]" href={loginHref}>
                              Sign in
                            </Link>
                            <Link className="rounded-full border border-[#0b2a1d]/30 bg-white px-3.5 py-2 text-xs font-black text-[#0b2a1d] transition hover:bg-[#0b2a1d]/5" href={signupHref}>
                              Sign up
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-[#aac0b2] bg-white px-8 py-16 text-center">
            <p className="text-xl font-black">The next drop is being prepared.</p>
            <p className="mt-2 text-[#66736c]">Check back soon for newly published campus events.</p>
          </div>
        )}
      </section>

      <section className="bg-[#0b2a1d] text-white" id="how-it-works">
        <div className="mx-auto grid max-w-[1440px] gap-16 px-6 py-24 sm:px-10 lg:grid-cols-[.8fr_1.2fr] lg:px-16 lg:py-32">
          <div>
            <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.2em] text-[#c8ff66]">No chaos. No shortcuts.</p>
            <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl">A fairer way to get in.</h2>
            <p className="mt-7 max-w-md text-base leading-7 text-white/60">
              Ticket Drop keeps every allocation transparent, prevents duplicate claims, and moves released seats fairly.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-[2rem] bg-white/12 sm:grid-cols-3">
            {[
              ['01', 'Discover', 'Browse verified events and see real remaining capacity.'],
              ['02', 'Claim', 'Sign in and secure one ticket with a unique confirmation code.'],
              ['03', 'Stay ready', 'Sold out? Join the FIFO waitlist and get the next released seat.'],
            ].map(([number, title, copy]) => (
              <div className="bg-[#103726] p-8 sm:p-9" key={number}>
                <span className="text-xs font-black tracking-[0.2em] text-[#c8ff66]">{number}</span>
                <h3 className="mt-12 text-2xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/58">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-24 sm:px-10 lg:px-16 lg:py-32" id="waitlist">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#c8ff66] px-8 py-14 sm:px-14 lg:px-20 lg:py-20">
          <div className="absolute -right-20 -top-36 size-96 rounded-full border-[70px] border-[#0b2a1d]/8" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#28643f]">The second chance, automated</p>
            <h2 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.05em] text-[#0b2a1d] sm:text-6xl">Sold out isn&apos;t always the end.</h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#345441]">
              Join the waitlist in one tap. If someone cancels, the earliest eligible student is allocated the seat automatically.
            </p>
            <a className="mt-9 inline-flex rounded-full bg-[#0b2a1d] px-7 py-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#164f35]" href="#events">
              Find an event
            </a>
          </div>
        </div>
      </section>

      <ContactSection />

      <footer className="relative min-h-[520px] overflow-hidden bg-[#061b13] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(45,216,38,.18),transparent_32%),linear-gradient(135deg,#061b13_0%,#0a2a1d_100%)]" />
        <Image
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[8%] left-[42%] w-[125%] max-w-none -translate-x-1/2 object-contain opacity-45 sm:-bottom-[24%] sm:left-[66%] sm:w-[92%]"
          height={708}
          sizes="(min-width: 640px) 92vw, 125vw"
          src="/images/ticketify-footer-logo.png"
          width={1614}
        />
        <div className="relative z-10 mx-auto flex min-h-[520px] max-w-[1440px] flex-col justify-between px-6 py-10 sm:px-10 sm:py-14 lg:px-16">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#77e974]">Ticketify campus</p>
              <h2 className="mt-5 max-w-xl text-4xl font-black leading-[0.94] tracking-[-0.05em] sm:text-6xl">
                Your next campus moment starts here.
              </h2>
            </div>
            <a className="inline-flex items-center gap-3 border-b-2 border-[#77e974] pb-2 text-sm font-extrabold text-white transition hover:text-[#77e974]" href="#events">
              Explore upcoming events <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6 border-t border-white/15 pt-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Ticketify · Campus events, fairly allocated</p>
              <p className="mt-2 max-w-sm text-sm text-white/55">Fair access, live availability, and a waitlist that keeps every student in the running.</p>
            </div>
            <div className="flex gap-6 text-sm font-bold text-white/70">
              <a className="transition hover:text-[#77e974]" href="#events">Events</a>
              <a className="transition hover:text-[#77e974]" href="#contact">Contact</a>
              <Link className="transition hover:text-[#77e974]" href="/login">Student login</Link>
              <Link className="transition hover:text-[#77e974]" href="/admin">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
