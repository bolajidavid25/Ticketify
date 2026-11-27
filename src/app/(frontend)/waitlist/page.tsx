import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { studentAuth } from '@/lib/app-auth'
import { getCategoryImage } from '@/lib/event-media'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = {
  title: 'Waitlist · Ticketify',
  description: 'Track your FIFO waitlist positions and join queues for sold-out campus events.',
}

export default async function WaitlistPage() {
  await connection()
  const [user, payload] = await Promise.all([studentAuth.currentUser(), getPayloadClient()])

  const eventsResult = await payload.find({
    collection: 'events',
    where: { status: { equals: 'published' } },
    depth: 1,
    sort: 'startsAt',
    limit: 50,
    overrideAccess: false,
    user: user ?? undefined,
  })

  const soldOutEvents = eventsResult.docs.filter((event: any) => (event.issuedCount ?? 0) >= event.capacity)

  let myWaitlist: Array<{
    id: string | number
    status: string
    joinedAt: string
    allocatedAt?: string | null
    position: number | null
    event: { id: string | number; title: string; slug: string; startsAt: string; venue: string }
  }> = []

  if (user) {
    const waitlistResult = await payload.find({
      collection: 'waitlist',
      where: { student: { equals: user.id } },
      depth: 1,
      sort: '-joinedAt',
      limit: 30,
      overrideAccess: false,
      user,
    })

    myWaitlist = await Promise.all(
      waitlistResult.docs.map(async (entry: any) => {
        const ev = typeof entry.event === 'object' && entry.event ? entry.event : null
        let position: number | null = null

        if (entry.status === 'waiting' && ev) {
          const ahead = await payload.count({
            collection: 'waitlist',
            overrideAccess: true,
            where: {
              and: [
                { event: { equals: ev.id } },
                { status: { equals: 'waiting' } },
                { joinedAt: { less_than_equal: entry.joinedAt } },
              ],
            },
          })
          position = Math.max(1, ahead.totalDocs)
        }

        return {
          id: entry.id,
          status: entry.status,
          joinedAt: entry.joinedAt,
          allocatedAt: entry.allocatedAt ?? null,
          position,
          event: ev
            ? {
                id: ev.id,
                title: ev.title,
                slug: ev.slug,
                startsAt: ev.startsAt,
                venue: ev.venue,
              }
            : {
                id: entry.event,
                title: 'Campus Event',
                slug: '',
                startsAt: entry.joinedAt,
                venue: 'Main Campus',
              },
        }
      }),
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f7f2] text-[#10271e]">
      <header className="border-b border-[#dce4de] bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 sm:px-10 lg:px-16">
          <Link aria-label="Ticketify home" className="relative block h-12 w-32 sm:w-36" href="/">
            <Image
              alt="Ticketify"
              className="object-contain object-left"
              fill
              priority
              sizes="144px"
              src="/images/ticketify-nav-logo.png"
            />
          </Link>
          <div className="flex items-center gap-5 text-sm font-extrabold">
            <Link className="text-[#54635c] transition hover:text-[#10271e]" href="/discover">
              Explore events
            </Link>
            {user ? (
              <Link className="rounded-full bg-[#0b2a1d] px-5 py-2.5 text-white transition hover:bg-[#16844b]" href="/account">
                Account
              </Link>
            ) : (
              <Link className="rounded-full bg-[#0b2a1d] px-5 py-2.5 text-white transition hover:bg-[#16844b]" href="/login?next=/waitlist">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-6 py-14 sm:px-10 lg:px-16 lg:py-20">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#16844b]">FIFO Waitlist Queue</p>
            <h1 className="mt-3 text-4xl font-black leading-none tracking-[-0.045em] sm:text-6xl">
              Your waitlist &amp; sold-out drops
            </h1>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#54635c]">
            Seats released by cancellations are automatically allocated in strict first-in, first-out order.
          </p>
        </div>

        {/* Student's Waitlist Entries */}
        <div className="mt-12 rounded-[2rem] border border-[#dce1d9] bg-white p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf1eb] pb-5">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.03em]">Your queue status</h2>
              <p className="mt-1 text-sm text-[#65716b]">
                {user
                  ? `Signed in as ${user.name}${user.studentId ? ` · ${user.studentId}` : ''}`
                  : 'Sign in to view your live waitlist positions and automatic seat allocations.'}
              </p>
            </div>
            {!user && (
              <Link
                className="rounded-full bg-[#c8ff66] px-6 py-3 text-xs font-black uppercase tracking-wider text-[#0b2a1d] transition hover:bg-[#0b2a1d] hover:text-white"
                href="/login?next=/waitlist"
              >
                Sign in to view queue
              </Link>
            )}
          </div>

          {user && myWaitlist.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-lg font-extrabold text-[#10271e]">You are not on any waitlist right now.</p>
              <p className="mt-2 text-sm text-[#65716b]">
                Browse sold-out events below or explore upcoming drops to claim a ticket.
              </p>
            </div>
          )}

          {user && myWaitlist.length > 0 && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {myWaitlist.map((item) => {
                const isAllocated = item.status === 'allocated'
                const isWaiting = item.status === 'waiting'
                return (
                  <div
                    className="flex flex-col justify-between rounded-2xl border border-[#dce1d9] bg-[#f8faf7] p-5"
                    key={item.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-[#10271e]">{item.event.title}</p>
                        <p className="mt-1 text-xs font-semibold text-[#65716b]">{item.event.venue}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                          isAllocated
                            ? 'bg-[#c8ff66] text-[#0b2a1d]'
                            : isWaiting
                              ? 'bg-[#0b2a1d] text-white'
                              : 'bg-[#e6ebe4] text-[#54635c]'
                        }`}
                      >
                        {isWaiting && item.position ? `#${item.position} in line` : item.status}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#e7ece5] pt-3 text-xs font-semibold text-[#65716b]">
                      <span>
                        Joined {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(item.joinedAt))}
                      </span>
                      {item.event.slug && (
                        <Link className="font-black text-[#16844b] hover:underline" href={`/events/${item.event.slug}`}>
                          View event →
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sold-Out Events Accepting Waitlist */}
        <div className="mt-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-[-0.03em] sm:text-3xl">Sold-out events accepting waitlist</h2>
            <Link className="text-sm font-extrabold text-[#16844b] hover:underline" href="/discover">
              All events →
            </Link>
          </div>

          {soldOutEvents.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-[#aac0b2] bg-white px-8 py-12 text-center">
              <p className="text-lg font-black">No events are sold out right now.</p>
              <p className="mt-2 text-sm text-[#66736c]">Seats are currently available on the main events page.</p>
              <Link className="mt-5 inline-flex rounded-full bg-[#0b2a1d] px-6 py-3 text-xs font-black text-white transition hover:bg-[#16844b]" href="/discover">
                Browse available events
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {soldOutEvents.map((event: any) => {
                const img = typeof event.image === 'object' ? event.image : null
                const cover = img?.url ? { url: img.url, alt: img.alt || event.title } : getCategoryImage(event.category)
                const targetHref = user ? `/events/${event.slug}` : `/login?next=${encodeURIComponent(`/events/${event.slug}`)}`

                return (
                  <article className="flex flex-col overflow-hidden rounded-[2rem] border border-[#dce1d9] bg-white" key={event.id}>
                    <Link className="relative block aspect-[16/9] bg-[#dfe7de]" href={targetHref}>
                      <Image
                        alt={cover.alt}
                        className="object-cover"
                        fill
                        sizes="(min-width: 768px) 50vw, 95vw"
                        src={cover.url}
                      />
                      <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3.5 py-1.5 text-xs font-extrabold text-[#0e3826]">
                        {event.category}
                      </div>
                      <div className="absolute bottom-4 right-4 rounded-full bg-[#d94747] px-3.5 py-1.5 text-xs font-extrabold text-white">
                        Sold out · Waitlist open
                      </div>
                    </Link>
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-xl font-black text-[#10271e]">{event.title}</h3>
                      <p className="mt-1 text-sm font-medium text-[#6c7972]">{event.venue}</p>
                      <p className="mt-3 line-clamp-2 text-sm text-[#65716b]">{event.description}</p>
                      <div className="mt-auto pt-5">
                        <Link
                          className="inline-flex items-center gap-2 rounded-full bg-[#0b2a1d] px-5 py-2.5 text-xs font-black text-white transition hover:bg-[#16844b]"
                          href={targetHref}
                        >
                          {user ? 'Join waitlist' : 'Sign in to join waitlist'} <span aria-hidden="true">→</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
