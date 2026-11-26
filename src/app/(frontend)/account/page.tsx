import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { logoutStudent } from '@/app/(frontend)/auth-actions'
import { StudentIdForm } from '@/components/StudentIdForm'
import { StudentNotificationsFeed } from '@/components/StudentNotificationsFeed'
import { studentAuth } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = {
  title: 'Student account · Ticketify',
}

export default async function AccountPage() {
  const user = await studentAuth.currentUser()
  if (!user) redirect('/login')

  const payload = await getPayloadClient()

  const [ticketResult, waitlistResult, notifResult] = await Promise.all([
    payload.find({
      collection: 'tickets',
      where: {
        and: [{ student: { equals: user.id } }, { status: { equals: 'active' } }],
      },
      depth: 1,
      sort: '-createdAt',
      overrideAccess: true,
      limit: 20,
    }),
    payload.find({
      collection: 'waitlist',
      where: {
        and: [{ student: { equals: user.id } }, { status: { equals: 'waiting' } }],
      },
      depth: 1,
      sort: '-joinedAt',
      overrideAccess: true,
      limit: 20,
    }),
    payload.find({
      collection: 'notifications',
      where: { recipient: { equals: user.id } },
      depth: 0,
      sort: '-createdAt',
      overrideAccess: true,
      limit: 30,
    }),
  ])

  const activeTickets = ticketResult.docs.map((t: any) => ({
    id: t.id,
    code: t.code,
    status: t.status,
    event: typeof t.event === 'object' && t.event
      ? {
          title: t.event.title,
          slug: t.event.slug,
          startsAt: t.event.startsAt,
          venue: t.event.venue,
        }
      : { title: 'Campus Event', slug: '#', startsAt: t.createdAt, venue: 'Main Campus' },
  }))

  const waitlistItems = waitlistResult.docs.map((w: any) => ({
    id: w.id,
    joinedAt: w.joinedAt,
    event: typeof w.event === 'object' && w.event
      ? {
          title: w.event.title,
          slug: w.event.slug,
        }
      : { title: 'Campus Event', slug: '#' },
  }))

  const notifications = notifResult.docs.map((n: any) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: Boolean(n.isRead),
    createdAt: n.createdAt,
  }))

  return (
    <main className="min-h-screen bg-[#eef2eb] px-4 py-4 text-[#10271e] sm:px-6 sm:py-6">
      <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1500px] overflow-hidden bg-white shadow-[0_32px_90px_rgba(12,54,34,.1)] sm:min-h-[calc(100vh-3rem)]">
        <header className="flex items-center justify-between border-b border-[#dce4de] px-6 py-5 sm:px-10">
          <Link aria-label="Ticketify home" className="relative block h-14 w-36" href="/">
            <Image alt="Ticketify" className="object-contain object-left" fill priority sizes="144px" src="/images/ticketify-nav-logo.png" />
          </Link>
          <div className="flex items-center gap-6">
            <Link className="text-sm font-extrabold text-[#16844b] transition hover:underline" href="/discover">
              Dashboard
            </Link>
            <form action={logoutStudent}>
              <button className="border-b-2 border-[#16844b] pb-1 text-sm font-extrabold text-[#163b29] transition hover:text-[#16844b]" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="grid min-h-[calc(100vh-9rem)] lg:grid-cols-[1fr_1.1fr]">
          {/* Left Column: Hero & Profile Details */}
          <div className="flex flex-col justify-between bg-[#0b2a1d] p-8 text-white sm:p-14 lg:p-16">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#c8ff66]">Student account</p>
              <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl">
                Hi, {user.name.split(' ')[0]}.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
                Your verified campus profile. Ensure your Student ID is set to book tickets and join waitlists under fair campus access.
              </p>

              <div className="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="grid gap-1 py-3 sm:grid-cols-[130px_1fr] sm:items-center">
                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8ea89b]">Full name</span>
                  <span className="text-sm font-extrabold text-white">{user.name}</span>
                </div>
                <div className="grid gap-1 py-3 sm:grid-cols-[130px_1fr] sm:items-center">
                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8ea89b]">University email</span>
                  <span className="text-sm font-extrabold text-white">{user.email}</span>
                </div>
                <div className="grid gap-1 py-3 sm:grid-cols-[130px_1fr] sm:items-center">
                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8ea89b]">Student ID</span>
                  <div>
                    <StudentIdForm currentId={user.studentId} />
                    {!user.studentId && (
                      <p className="mt-1 text-[11px] font-medium text-[#c8ff66]">
                        Option C requirement: Required before claiming tickets.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <Link className="inline-flex items-center gap-3 rounded-full bg-[#c8ff66] px-7 py-4 text-sm font-extrabold text-[#0b2a1d] transition hover:-translate-y-0.5 hover:bg-white" href="/discover">
                Discover campus drops <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Active Tickets, Waitlist & Live Notifications */}
          <div className="space-y-10 overflow-y-auto p-8 sm:p-14 lg:p-16">
            {/* Active Tickets Section */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black tracking-[-0.025em] text-[#122e22]">
                  Your active tickets
                </h2>
                <span className="rounded-full bg-[#e6f4ea] px-3 py-1 text-xs font-black text-[#156e3e]">
                  {activeTickets.length} active
                </span>
              </div>

              {activeTickets.length ? (
                <div className="space-y-3">
                  {activeTickets.map((ticket) => (
                    <div
                      className="flex flex-col justify-between gap-3 rounded-2xl border border-[#dce4de] bg-[#f9fbf9] p-4 sm:flex-row sm:items-center"
                      key={ticket.id}
                    >
                      <div>
                        <Link
                          className="text-sm font-black text-[#122e22] transition hover:text-[#16844b]"
                          href={`/events/${ticket.event.slug}`}
                        >
                          {ticket.event.title}
                        </Link>
                        <p className="mt-1 text-xs text-[#6e7d74]">
                          {ticket.event.venue}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-[#0b2a1d] px-3 py-2 font-mono text-xs font-black tracking-wider text-[#c8ff66]">
                          {ticket.code}
                        </span>
                        <Link
                          className="rounded-xl border border-[#c2cdc5] px-3 py-2 text-xs font-extrabold text-[#173b2a] transition hover:bg-[#edf3ee]"
                          href={`/events/${ticket.event.slug}`}
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#dce4de] bg-[#f8faf8] p-6 text-center text-sm text-[#748279]">
                  No active tickets right now.{' '}
                  <Link className="font-bold text-[#16844b] underline" href="/discover">
                    Explore drops
                  </Link>
                </div>
              )}
            </section>

            {/* Waitlist Section */}
            {waitlistItems.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-black tracking-[-0.025em] text-[#122e22]">
                    Waitlist queue
                  </h2>
                  <span className="text-xs font-bold text-[#e0622a]">
                    {waitlistItems.length} waiting
                  </span>
                </div>
                <div className="space-y-2">
                  {waitlistItems.map((item) => (
                    <div
                      className="flex items-center justify-between rounded-xl border border-[#e8ede8] bg-[#fffbf9] p-3 text-xs"
                      key={item.id}
                    >
                      <span className="font-bold text-[#1e3427]">{item.event.title}</span>
                      <span className="font-black text-[#d35a24]">FIFO in queue</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Notifications Feed */}
            <section className="pt-2">
              <StudentNotificationsFeed initialNotifications={notifications} />
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}
