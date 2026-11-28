'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  bookTicketAction,
  cancelTicketAction,
  joinWaitlistAction,
} from '@/app/(frontend)/ticket-actions'
import { TicketQrCode } from '@/components/TicketQrCode'

export function TicketCheckout({
  capacity,
  eventId,
  eventSlug,
  existingTicket,
  isLoggedIn,
  issuedCount,
  onWaitlist,
  price,
}: {
  capacity: number
  eventId: string | number
  eventSlug: string
  existingTicket: { id: string | number; code: string } | null
  isLoggedIn: boolean
  issuedCount: number
  onWaitlist: boolean
  price: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [warning, setWarning] = useState('')

  const remaining = Math.max(0, capacity - issuedCount)
  const soldOut = remaining === 0
  const maxPerPerson = 1
  const availablePercent = capacity > 0 ? Math.round((remaining / capacity) * 100) : 0
  const circumference = 2 * Math.PI * 42
  const dash = (availablePercent / 100) * circumference

  function handleBook() {
    setFeedback(null)
    startTransition(async () => {
      const result = await bookTicketAction(eventId)
      setFeedback({ ok: result.ok, text: result.message })
      if (result.ok) router.refresh()
    })
  }

  function handleJoinWaitlist() {
    setFeedback(null)
    startTransition(async () => {
      const result = await joinWaitlistAction(eventId)
      setFeedback({ ok: result.ok, text: result.message })
      if (result.ok) router.refresh()
    })
  }

  function handleCancel() {
    if (!existingTicket) return
    setFeedback(null)
    startTransition(async () => {
      const result = await cancelTicketAction(existingTicket.id)
      setFeedback({ ok: result.ok, text: result.message })
      if (result.ok) router.refresh()
    })
  }

  return (
    <section className="rounded-[1.75rem] bg-[#0b2a1d] p-5 text-white shadow-[0_18px_50px_rgba(5,30,20,.2)]">
      <div className="flex items-center gap-5">
        <div className="relative grid size-28 shrink-0 place-items-center">
          <svg aria-hidden="true" className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" fill="none" r="42" stroke="rgba(255,255,255,.1)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              fill="none"
              r="42"
              stroke={soldOut ? '#d94747' : '#c8ff66'}
              strokeDasharray={`${dash} ${circumference}`}
              strokeLinecap="round"
              strokeWidth="8"
            />
          </svg>
          <div className="relative text-center">
            <span className="block text-2xl font-black">{remaining}</span>
            <span className="text-[9px] font-black uppercase tracking-[0.13em] text-white/50">Seats left</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#91aa9d]">Live capacity</p>
          <h2 className="mt-1 text-xl font-black">{soldOut ? 'Sold out' : 'Tickets available'}</h2>
          <p className="mt-2 text-xs leading-5 text-white/65">
            {remaining} available · {capacity} maximum seats ({issuedCount} claimed)
          </p>
        </div>
      </div>

      {!soldOut && !existingTicket && (
        <div className="mt-6 flex items-center justify-between border-y border-white/10 py-5">
          <div>
            <p className="text-sm font-extrabold">Ticket quantity</p>
            <p className="mt-1 text-[11px] text-[#c8ff66]">Strict rule: {maxPerPerson} ticket per person</p>
          </div>
          <div className="flex items-center gap-4 rounded-full bg-white/8 p-1.5">
            <button
              aria-label="Decrease quantity"
              className="grid size-9 place-items-center rounded-full bg-white/10 text-lg transition hover:bg-white/20"
              onClick={() => setWarning('Minimum 1 ticket when booking.')}
              type="button"
            >
              −
            </button>
            <span className="min-w-4 text-center text-sm font-black">1</span>
            <button
              aria-label="Increase quantity"
              className="grid size-9 place-items-center rounded-full bg-[#c8ff66] text-lg text-[#0b2a1d] transition hover:bg-white"
              onClick={() => setWarning('Strict rule: Maximum 1 ticket per person for each event.')}
              type="button"
            >
              +
            </button>
          </div>
        </div>
      )}

      {warning && (
        <p aria-live="polite" className="mt-4 border-l-2 border-[#c8ff66] bg-white/8 px-3 py-2.5 text-xs font-semibold leading-5 text-[#e8ffbc]">
          {warning}
        </p>
      )}

      {feedback && (
        <p
          aria-live="polite"
          className={`mt-4 border-l-2 px-3 py-2.5 text-xs font-semibold leading-5 ${
            feedback.ok ? 'border-[#c8ff66] bg-white/10 text-[#e8ffbc]' : 'border-[#ff7a7a] bg-[#441515]/70 text-[#ffd2d2]'
          }`}
        >
          {feedback.text}
        </p>
      )}

      <div className="mt-5">
        {!isLoggedIn ? (
          <>
            <Link
              className="flex w-full items-center justify-center rounded-full bg-[#c8ff66] px-6 py-4 text-sm font-black text-[#0b2a1d] transition hover:bg-white"
              href={`/login?next=${encodeURIComponent(`/events/${eventSlug}`)}`}
            >
              {soldOut ? 'Sign in to join waitlist' : `Sign in to book · ${price ? `₦${price.toLocaleString()}` : 'Free'}`}
            </Link>
            <Link
              className="mt-3 flex w-full items-center justify-center rounded-full border border-white/20 px-6 py-3.5 text-xs font-extrabold text-white transition hover:bg-white/10"
              href={`/signup?next=${encodeURIComponent(`/events/${eventSlug}`)}`}
            >
              New student? Create an account
            </Link>
          </>
        ) : existingTicket ? (
          <div className="rounded-2xl border border-[#c8ff66]/40 bg-white/8 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#c8ff66]">Ticket confirmed · 1 per person</p>
                <p className="mt-1 text-xl font-black tracking-wider">{existingTicket.code}</p>
                <p className="mt-1 text-xs text-white/60">Show this QR code at the venue entrance.</p>
              </div>
              <TicketQrCode className="shrink-0" code={existingTicket.code} size={82} />
            </div>
            <button
              className="mt-4 w-full rounded-full border border-white/25 px-5 py-3 text-xs font-extrabold text-white transition hover:bg-white/10 disabled:opacity-60"
              disabled={pending}
              onClick={handleCancel}
              type="button"
            >
              {pending ? 'Cancelling…' : 'Cancel ticket & release seat'}
            </button>
          </div>
        ) : soldOut ? (
          <>
            <div className="w-full rounded-full bg-[#66736c]/60 px-6 py-3.5 text-center text-xs font-black uppercase tracking-wider text-white/80">
              Sold Out
            </div>
            {onWaitlist ? (
              <div className="mt-3 rounded-full border border-[#c8ff66]/50 bg-white/10 px-6 py-4 text-center text-sm font-black text-[#c8ff66]">
                You&apos;re on the waitlist
              </div>
            ) : (
              <button
                className="mt-3 flex w-full items-center justify-center rounded-full bg-[#c8ff66] px-6 py-4 text-sm font-black text-[#0b2a1d] transition hover:bg-white disabled:opacity-60"
                disabled={pending}
                onClick={handleJoinWaitlist}
                type="button"
              >
                {pending ? 'Joining waitlist…' : 'Join Waitlist'}
              </button>
            )}
            <p className="mt-4 text-center text-[11px] leading-5 text-white/55">
              Canceling a ticket frees the seat for the next person on the waitlist.
            </p>
          </>
        ) : (
          <>
            <button
              className="flex w-full items-center justify-center rounded-full bg-[#c8ff66] px-6 py-4 text-sm font-black text-[#0b2a1d] transition hover:bg-white disabled:opacity-60"
              disabled={pending}
              onClick={handleBook}
              type="button"
            >
              {pending ? 'Booking ticket…' : `Book Ticket · ${price ? `₦${price.toLocaleString()}` : 'Free'}`}
            </button>
            <p className="mt-3 text-center text-[10px] font-semibold text-white/45">
              Strict rule: 1 ticket per student per event
            </p>
          </>
        )}
      </div>
    </section>
  )
}
