import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { StudentDashboard, type DashboardEvent, type TicketHistoryItem } from '@/components/StudentDashboard'
import { studentAuth } from '@/lib/app-auth'
import { getCategoryImage } from '@/lib/event-media'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = {
  title: 'Your student dashboard · Ticketify',
  description: 'Discover nearby events and manage your Ticketify history.',
}

export default async function DiscoverPage() {
  const user = await studentAuth.currentUser()
  if (!user) redirect('/login')

  const payload = await getPayloadClient()
  const [eventResult, ticketResult, waitlistResult] = await Promise.all([
    payload.find({
      collection: 'events',
      depth: 1,
      limit: 100,
      overrideAccess: false,
      sort: 'startsAt',
      user,
      where: { status: { equals: 'published' } },
    }),
    payload.find({
      collection: 'tickets',
      depth: 2,
      limit: 50,
      overrideAccess: false,
      sort: '-createdAt',
      user,
      where: { student: { equals: user.id } },
    }),
    payload.find({
      collection: 'waitlist',
      depth: 0,
      limit: 50,
      overrideAccess: false,
      user,
      where: {
        and: [
          { student: { equals: user.id } },
          { status: { equals: 'waiting' } },
        ],
      },
    }),
  ])

  const activeTicketEventIds = new Set(
    ticketResult.docs
      .filter((ticket) => ticket.status === 'active')
      .map((ticket) => String(typeof ticket.event === 'object' ? ticket.event.id : ticket.event)),
  )
  const waitingEventIds = new Set(
    waitlistResult.docs.map((entry) =>
      String(typeof entry.event === 'object' ? entry.event.id : entry.event),
    ),
  )

  const events: DashboardEvent[] = eventResult.docs.map((event) => {
    const image = typeof event.image === 'object' ? event.image : null
    const fallbackImage = getCategoryImage(event.category)
    const startsAt = new Date(event.startsAt)
    const location = 'location' in event && Array.isArray(event.location)
      ? event.location as [number, number]
      : null

    return {
      capacity: event.capacity,
      category: event.category,
      dateLabel: new Intl.DateTimeFormat('en', {
        day: '2-digit',
        month: 'short',
        timeZone: 'UTC',
      }).format(startsAt),
      hasTicket: activeTicketEventIds.has(String(event.id)),
      id: String(event.id),
      image: image?.url ? { alt: image.alt || event.title, url: image.url } : fallbackImage,
      issuedCount: event.issuedCount ?? 0,
      location,
      onWaitlist: waitingEventIds.has(String(event.id)),
      price: event.price ?? 0,
      slug: event.slug,
      startsAt: event.startsAt,
      timeLabel: new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC',
      }).format(startsAt),
      title: event.title,
      venue: event.venue,
    }
  })

  const history: TicketHistoryItem[] = ticketResult.docs.flatMap((ticket) => {
    const event = typeof ticket.event === 'object' ? ticket.event : null
    if (!event) return []

    return [{
      code: ticket.code,
      dateLabel: new Intl.DateTimeFormat('en', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(event.startsAt)),
      eventSlug: event.slug,
      eventTitle: event.title,
      id: String(ticket.id),
      status: ticket.status,
    }]
  })

  return (
    <StudentDashboard
      events={events}
      history={history}
      student={{ name: user.name, studentId: user.studentId }}
    />
  )
}
