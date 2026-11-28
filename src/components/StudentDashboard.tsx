'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { joinWaitlistAction } from '@/app/(frontend)/ticket-actions'
import { TicketQrCode } from '@/components/TicketQrCode'
import { getCategoryImage } from '@/lib/event-media'

export type DashboardEvent = {
  capacity: number
  category: string
  dateLabel: string
  hasTicket?: boolean
  id: string
  image: { alt: string; url: string } | null
  issuedCount: number
  location: [number, number] | null
  onWaitlist?: boolean
  price: number
  slug: string
  startsAt: string
  timeLabel: string
  title: string
  venue: string
}

export type TicketHistoryItem = {
  code: string
  dateLabel: string
  eventSlug: string
  eventTitle: string
  id: string
  status: 'active' | 'cancelled'
}

type Coordinates = { latitude: number; longitude: number }
type PriceFilter = 'all' | 'free' | '1000' | '2000' | 'paid'
type DistanceFilter = 'all' | '1' | '3' | '5'

const categories = ['All', 'Music', 'Arts', 'Sports', 'Technology', 'Community']

export function StudentDashboard({
  events,
  history,
  student,
}: {
  events: DashboardEvent[]
  history: TicketHistoryItem[]
  student: { name: string; studentId?: string | null }
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [price, setPrice] = useState<PriceFilter>('all')
  const [distance, setDistance] = useState<DistanceFilter>('all')
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [locationMessage, setLocationMessage] = useState('')
  const [locating, setLocating] = useState(false)

  function requestLocation(nextDistance?: DistanceFilter) {
    if (!navigator.geolocation) {
      setLocationMessage('Location is not available in this browser.')
      return
    }

    setLocating(true)
    setLocationMessage('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setDistance(nextDistance && nextDistance !== 'all' ? nextDistance : distance)
        setLocating(false)
      },
      () => {
        setLocationMessage('Allow location access to sort events by distance.')
        setLocating(false)
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 },
    )
  }

  function selectDistance(value: DistanceFilter) {
    if (value !== 'all' && !coordinates) {
      setDistance(value)
      requestLocation(value)
      return
    }
    setDistance(value)
  }

  const eventsWithDistance = useMemo(() => events.map((event) => ({
    ...event,
    distanceKm: coordinates && event.location
      ? distanceInKm(coordinates, event.location)
      : null,
  })), [coordinates, events])

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return eventsWithDistance
      .filter((event) => {
        const matchesCategory = category === 'All' || event.category === category
        const matchesQuery =
          !normalizedQuery ||
          event.title.toLowerCase().includes(normalizedQuery) ||
          event.venue.toLowerCase().includes(normalizedQuery)
        const matchesPrice =
          price === 'all' ||
          (price === 'free' && event.price === 0) ||
          (price === 'paid' && event.price > 0) ||
          (price !== 'free' && price !== 'paid' && event.price <= Number(price))
        const matchesDistance =
          distance === 'all' ||
          event.distanceKm === null ||
          event.distanceKm <= Number(distance)
        return matchesCategory && matchesQuery && matchesPrice && matchesDistance
      })
      .sort((a, b) => {
        if (coordinates) {
          if (a.distanceKm === null) return 1
          if (b.distanceKm === null) return -1
          return a.distanceKm - b.distanceKm
        }
        return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      })
  }, [category, coordinates, distance, eventsWithDistance, price, query])

  return (
    <main className="min-h-screen bg-[#dfe6df] text-[#10271e]">
      <div className="mx-auto min-h-screen max-w-[480px] overflow-hidden bg-[#f7f8f4] shadow-[0_0_80px_rgba(11,42,29,.16)]">
        <header className="bg-[#0a2a1d] px-5 pb-7 pt-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8bb39e]">Student dashboard</p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.04em]">Hi, {student.name.split(' ')[0]}</h1>
              <p className="mt-1 text-[11px] font-semibold text-white/45">
                {student.studentId || 'ID needed before booking · Tap Account'}
              </p>
            </div>
            <Link
              aria-label="Student account"
              className="grid size-12 place-items-center rounded-full border border-white/15 bg-[#c8ff66] text-sm font-black text-[#0b2a1d]"
              href="/account"
            >
              {initials(student.name)}
            </Link>
          </div>

          <button
            className="mt-5 flex items-center gap-2 text-left text-xs font-extrabold text-white/75"
            onClick={() => requestLocation()}
            type="button"
          >
            <PinIcon className="size-4 text-[#c8ff66]" />
            {locating ? 'Finding your location…' : coordinates ? 'Using your current location' : 'Use my location'}
            <span className="ml-auto text-[10px] font-black uppercase tracking-[0.12em] text-[#c8ff66]">
              {coordinates ? 'Active' : 'Enable'}
            </span>
          </button>
          {locationMessage && <p aria-live="polite" className="mt-2 text-[11px] font-semibold text-[#ffc1c1]">{locationMessage}</p>}

          <div className="relative mt-5">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#6f7e76]" />
            <input
              aria-label="Search events"
              className="h-14 w-full rounded-2xl border-0 bg-white pl-12 pr-4 text-sm font-semibold text-[#13291e] outline-none placeholder:text-[#8c9891] focus:ring-2 focus:ring-[#c8ff66]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search events, venues..."
              type="search"
              value={query}
            />
          </div>
        </header>

        <section className="border-b border-[#dfe5df] bg-white py-4">
          <FilterRow label="Genre">
            {categories.map((item) => {
              const thumb = item === 'All' ? { alt: 'All events', url: '/images/campus-festival.png' } : getCategoryImage(item)
              const active = category === item
              return (
                <button
                  className={`flex shrink-0 items-center gap-2.5 rounded-2xl border p-1.5 pr-3.5 text-xs font-extrabold transition ${
                    active
                      ? 'border-[#0b2a1d] bg-[#0b2a1d] text-white shadow-sm'
                      : 'border-[#dce4de] bg-[#f4f7f4] text-[#354c3f] hover:border-[#9eb9a8]'
                  }`}
                  key={item}
                  onClick={() => setCategory(item)}
                  type="button"
                >
                  <span className="relative size-8 overflow-hidden rounded-xl bg-[#dfe7de]">
                    <Image alt={thumb.alt} className="object-cover" fill sizes="32px" src={thumb.url} />
                  </span>
                  <span>{item}</span>
                </button>
              )
            })}
          </FilterRow>
          <FilterRow label="Price">
            {([
              ['all', 'All prices'],
              ['free', 'Free'],
              ['1000', 'Under ₦1k'],
              ['2000', 'Under ₦2k'],
              ['paid', 'Paid'],
            ] as const).map(([value, label]) => (
              <FilterButton active={price === value} key={value} onClick={() => setPrice(value)}>
                {label}
              </FilterButton>
            ))}
          </FilterRow>
          <FilterRow label="Distance">
            {([
              ['all', 'Any distance'],
              ['1', 'Within 1 km'],
              ['3', 'Within 3 km'],
              ['5', 'Within 5 km'],
            ] as const).map(([value, label]) => (
              <FilterButton active={distance === value} key={value} onClick={() => selectDistance(value)}>
                {label}
              </FilterButton>
            ))}
          </FilterRow>
        </section>

        <div className="px-5 pb-28 pt-7">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#16844b]">Recommended for you</p>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.045em]">Explore events</h2>
            </div>
            <span className="text-xs font-bold text-[#7d8a82]">{visibleEvents.length} found</span>
          </div>

          <div className="mt-6 grid gap-5">
            {visibleEvents.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
            {!visibleEvents.length && (
              <div className="rounded-3xl border border-dashed border-[#bdc9c0] bg-white px-7 py-12 text-center">
                <SearchIcon className="mx-auto size-7 text-[#7b8c82]" />
                <p className="mt-4 font-black">No matching events</p>
                <p className="mt-1 text-sm leading-6 text-[#758078]">Try widening your price, genre, or distance filters.</p>
              </div>
            )}
          </div>

          <HistorySection history={history} />
        </div>

        <nav aria-label="App navigation" className="fixed inset-x-0 bottom-0 z-30 mx-auto flex h-[76px] max-w-[480px] items-center justify-around border-t border-[#dce4de] bg-white/95 px-5 backdrop-blur-xl">
          <Link className="flex flex-col items-center gap-1 text-[10px] font-extrabold text-[#126f40]" href="/discover">
            <CompassIcon className="size-5" /> Dashboard
          </Link>
          <a className="flex flex-col items-center gap-1 text-[10px] font-bold text-[#849087]" href="#history">
            <TicketIcon className="size-5" /> History
          </a>
          <Link className="flex flex-col items-center gap-1 text-[10px] font-bold text-[#849087]" href="/account">
            <UserIcon className="size-5" /> Account
          </Link>
        </nav>
      </div>
    </main>
  )
}

function FilterRow({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="mb-2 px-5 text-[9px] font-black uppercase tracking-[0.17em] text-[#8a958e]">{label}</p>
      <div className="flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
    </div>
  )
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${active ? 'bg-[#0b2a1d] text-white' : 'bg-[#edf1ed] text-[#58685f]'}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

function HistorySection({ history }: { history: TicketHistoryItem[] }) {
  return (
    <section className="mt-10" id="history">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black tracking-[-0.025em]">Your ticket history</h2>
        <span className="text-xs font-bold text-[#16844b]">{history.length} total</span>
      </div>
      <div className="mt-4 grid gap-3">
        {history.length ? history.map((item) => (
          <Link className="flex items-center gap-4 rounded-2xl border border-[#dce4de] bg-white p-4" href={`/events/${item.eventSlug}`} key={item.id}>
            {item.status === 'active' ? (
              <TicketQrCode className="shrink-0" code={item.code} size={52} />
            ) : (
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#edf3ed] text-[#377052]">
                <TicketIcon className="size-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">{item.eventTitle}</p>
              <p className="mt-1 text-xs text-[#79847e]">{item.dateLabel} · <span className="font-mono font-bold text-[#10271e]">{item.code}</span></p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${item.status === 'active' ? 'bg-[#e4f6e8] text-[#17683e]' : 'bg-[#f1f1ef] text-[#747b76]'}`}>
              {item.status}
            </span>
          </Link>
        )) : (
          <div className="flex items-center gap-4 rounded-2xl border border-[#dce4de] bg-white p-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#edf3ed] text-[#377052]">
              <TicketIcon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold">No ticket history yet</p>
              <p className="mt-0.5 text-xs leading-5 text-[#79847e]">Booked and cancelled tickets will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function EventCard({ event }: { event: DashboardEvent & { distanceKm: number | null } }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [waitlistMsg, setWaitlistMsg] = useState('')
  const remaining = Math.max(0, event.capacity - event.issuedCount)
  const soldOut = remaining === 0
  const takenPercent = event.capacity > 0 ? Math.min(100, Math.round((event.issuedCount / event.capacity) * 100)) : 100

  function handleJoinWaitlist(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      const result = await joinWaitlistAction(event.id)
      setWaitlistMsg(result.message)
      if (result.ok) router.refresh()
    })
  }

  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-[#dce4de] bg-white shadow-[0_12px_35px_rgba(19,55,37,.07)] transition">
      <Link className="block" href={`/events/${event.slug}`}>
        <div className="relative aspect-[1.7] overflow-hidden bg-[#dfe7de]">
          {event.image && <Image alt={event.image.alt} className="object-cover transition duration-500 group-hover:scale-105" fill sizes="440px" src={event.image.url} />}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(4,25,17,.65))]" />
          <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#1e5136] backdrop-blur">{event.category}</span>
          {soldOut && (
            <span className="absolute right-4 top-4 rounded-full bg-[#d94747] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow">
              Sold Out
            </span>
          )}
          <span className="absolute bottom-4 right-4 rounded-full bg-[#0b2a1d]/90 px-3 py-2 text-xs font-extrabold text-white backdrop-blur">{event.price ? `₦${event.price.toLocaleString()}` : 'Free'}</span>
        </div>
        <div className="p-5 pb-4">
          <div className="flex gap-4">
            <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#eff5ef] text-center">
              <span className="text-base font-black leading-none text-[#16844b]">{event.dateLabel.split(' ')[0]}</span>
              <span className="mt-1 text-[9px] font-black uppercase tracking-wider text-[#63756a]">{event.dateLabel.split(' ')[1]}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-black tracking-[-0.025em]">{event.title}</h3>
              <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-medium text-[#748078]"><PinIcon className="size-3 shrink-0" />{event.timeLabel} · {event.venue}</p>
              {event.distanceKm !== null && <p className="mt-1 text-[10px] font-extrabold text-[#16844b]">{formatDistance(event.distanceKm)} away</p>}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#f3f6f2] p-2.5 text-center">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#6c7972]">Available</p>
              <p className={`mt-0.5 text-xs font-black ${soldOut ? 'text-[#d94747]' : 'text-[#16844b]'}`}>{remaining}</p>
            </div>
            <div className="border-x border-[#dce4de]">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#6c7972]">Max seats</p>
              <p className="mt-0.5 text-xs font-black text-[#10271e]">{event.capacity}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#6c7972]">Price</p>
              <p className="mt-0.5 text-xs font-black text-[#10271e]">{event.price ? `₦${event.price.toLocaleString()}` : 'Free'}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-extrabold">
              <span className={remaining ? 'text-[#177346]' : 'text-[#d94747]'}>{remaining ? `${remaining} of ${event.capacity} seats available` : 'Sold out'}</span>
              <span className="text-[#89938d]">1 / student</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#e5ebe6]">
              <div className={`h-full rounded-full ${remaining ? 'bg-[#35b66c]' : 'bg-[#d94747]'}`} style={{ width: `${takenPercent}%` }} />
            </div>
          </div>
        </div>
      </Link>

      <div className="border-t border-[#eef2ee] px-5 py-3">
        {event.hasTicket ? (
          <Link className="flex w-full items-center justify-center rounded-full bg-[#e4f6e8] px-4 py-2.5 text-xs font-black text-[#17683e]" href={`/events/${event.slug}`}>
            Ticket Held (1 per student) · View
          </Link>
        ) : soldOut ? (
          event.onWaitlist ? (
            <div className="rounded-full bg-[#eff5ef] px-4 py-2.5 text-center text-xs font-black text-[#16844b]">
              On Waitlist
            </div>
          ) : (
            <button
              className="w-full rounded-full bg-[#0b2a1d] px-4 py-2.5 text-xs font-black text-[#c8ff66] transition hover:bg-[#17623f] disabled:opacity-60"
              disabled={pending}
              onClick={handleJoinWaitlist}
              type="button"
            >
              {pending ? 'Joining waitlist…' : 'Sold Out · Join Waitlist'}
            </button>
          )
        ) : (
          <Link className="flex w-full items-center justify-center rounded-full bg-[#0b2a1d] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#17623f]" href={`/events/${event.slug}`}>
            Book Ticket · {event.price ? `₦${event.price.toLocaleString()}` : 'Free'}
          </Link>
        )}
        {waitlistMsg && <p className="mt-2 text-center text-[11px] font-semibold text-[#16844b]">{waitlistMsg}</p>}
      </div>
    </article>
  )
}

function distanceInKm(origin: Coordinates, destination: [number, number]): number {
  const [longitude, latitude] = destination
  const toRadians = (value: number) => value * Math.PI / 180
  const latitudeDelta = toRadians(latitude - origin.latitude)
  const longitudeDelta = toRadians(longitude - origin.longitude)
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(origin.latitude)) *
      Math.cos(toRadians(latitude)) *
      Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(value: number): string {
  return value < 1 ? `${Math.round(value * 1000)} m` : `${value.toFixed(1)} km`
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function SearchIcon({ className }: { className?: string }) {
  return <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>
}
function PinIcon({ className }: { className?: string }) {
  return <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" /></svg>
}
function UserIcon({ className }: { className?: string }) {
  return <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" /><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>
}
function TicketIcon({ className }: { className?: string }) {
  return <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24"><path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4V7.5Z" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8v8" stroke="currentColor" strokeDasharray="2 2" strokeWidth="1.5" /></svg>
}
function CompassIcon({ className }: { className?: string }) {
  return <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" fill="currentColor" /></svg>
}
