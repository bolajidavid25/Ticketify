import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TicketCheckout } from '@/components/TicketCheckout'
import { studentAuth } from '@/lib/app-auth'
import { getCategoryImage } from '@/lib/event-media'
import { findBySlug, getPayloadClient } from '@/lib/payload'

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [event, user] = await Promise.all([
    findBySlug('events', slug, { depth: 1 }),
    studentAuth.currentUser(),
  ])
  if (!event) notFound()

  let existingTicket: { id: string | number; code: string } | null = null
  let onWaitlist = false

  if (user) {
    const payload = await getPayloadClient()
    const [ticketResult, waitlistResult] = await Promise.all([
      payload.find({
        collection: 'tickets',
        limit: 1,
        overrideAccess: false,
        user,
        where: {
          and: [
            { student: { equals: user.id } },
            { event: { equals: event.id } },
            { status: { equals: 'active' } },
          ],
        },
      }),
      payload.find({
        collection: 'waitlist',
        limit: 1,
        overrideAccess: false,
        user,
        where: {
          and: [
            { student: { equals: user.id } },
            { event: { equals: event.id } },
            { status: { equals: 'waiting' } },
          ],
        },
      }),
    ])

    if (ticketResult.docs[0]) {
      existingTicket = {
        code: ticketResult.docs[0].code,
        id: ticketResult.docs[0].id,
      }
    }
    onWaitlist = waitlistResult.totalDocs > 0
  }

  const image = typeof event.image === 'object' ? event.image : null
  const heroImage = image?.url ? { alt: image.alt || event.title, url: image.url } : getCategoryImage(event.category)
  const startsAt = new Date(event.startsAt)
  const date = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(startsAt)
  const time = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(startsAt)

  return (
    <main className="min-h-screen bg-[#dfe6df] text-[#10271e]">
      <div className="mx-auto min-h-screen max-w-[480px] overflow-hidden bg-[#f7f8f4] shadow-[0_0_80px_rgba(11,42,29,.16)]">
        <section className="relative h-[410px] overflow-hidden bg-[#0b2a1d]">
          <Image
            alt={heroImage.alt}
            className="object-cover"
            fill
            priority
            sizes="480px"
            src={heroImage.url}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,24,16,.12)_15%,rgba(3,24,16,.9)_100%)]" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
            <Link aria-label="Back to discover" className="grid size-11 place-items-center rounded-full bg-[#0b2a1d]/60 text-white backdrop-blur" href="/discover">
              <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            </Link>
            <button aria-label="Save event" className="grid size-11 place-items-center rounded-full bg-white/90 text-[#173b2a] backdrop-blur" type="button">
              <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24"><path d="M12 20S4.5 16 4.5 9.5A4 4 0 0 1 12 7.6a4 4 0 0 1 7.5 1.9C19.5 16 12 20 12 20Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" /></svg>
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <span className="inline-flex rounded-full bg-[#c8ff66] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#173b2a]">
              {event.category}
            </span>
            <h1 className="mt-4 text-[2.65rem] font-black leading-[0.92] tracking-[-0.055em]">{event.title}</h1>
          </div>
        </section>

        <div className="relative -mt-1 rounded-t-[2rem] bg-[#f7f8f4] px-5 pb-12 pt-7">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#dce4de] bg-white p-4">
              <div className="grid size-9 place-items-center rounded-xl bg-[#e9f5ea] text-[#16844b]">
                <CalendarIcon />
              </div>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.13em] text-[#88948d]">Date & time</p>
              <p className="mt-1 text-sm font-extrabold leading-5">{date}<br />{time}</p>
            </div>
            <div className="rounded-2xl border border-[#dce4de] bg-white p-4">
              <div className="grid size-9 place-items-center rounded-xl bg-[#e9f5ea] text-[#16844b]">
                <PinIcon />
              </div>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.13em] text-[#88948d]">Location</p>
              <p className="mt-1 text-sm font-extrabold leading-5">{event.venue}</p>
            </div>
          </div>

          <section className="mt-7">
            <h2 className="text-lg font-black tracking-[-0.025em]">About this event</h2>
            <p className="mt-3 text-sm leading-6 text-[#65736b]">{event.description}</p>
          </section>

          <section className="mt-7">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black tracking-[-0.025em]">Location</h2>
              <span className="text-xs font-extrabold text-[#16844b]">View map</span>
            </div>
            <div className="relative h-36 overflow-hidden rounded-2xl border border-[#dce4de] bg-[#e8ede7]">
              <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(27deg,transparent_45%,#c6d0c8_46%,#c6d0c8_50%,transparent_51%),linear-gradient(112deg,transparent_42%,#fff_43%,#fff_48%,transparent_49%)] [background-size:90px_70px,120px_85px]" />
              <div className="absolute left-[54%] top-[45%] grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#0b2a1d] text-[#c8ff66] shadow-[0_8px_18px_rgba(11,42,29,.25)]">
                <PinIcon />
              </div>
              <span className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-[10px] font-black text-[#284536] backdrop-blur">{event.venue}</span>
            </div>
          </section>

          <div className="mt-7">
            <TicketCheckout
              capacity={event.capacity}
              eventId={event.id}
              eventSlug={event.slug}
              existingTicket={existingTicket}
              isLoggedIn={Boolean(user)}
              issuedCount={event.issuedCount ?? 0}
              onWaitlist={onWaitlist}
              price={event.price ?? 0}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

function CalendarIcon() {
  return <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24"><rect height="16" rx="2" stroke="currentColor" strokeWidth="1.8" width="17" x="3.5" y="5" /><path d="M8 3v4m8-4v4M4 10h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>
}

function PinIcon() {
  return <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" /></svg>
}
