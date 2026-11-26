'use server'

import crypto from 'node:crypto'
import { studentAuth } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export type TicketActionResult = {
  ok: boolean
  message: string
  ticketCode?: string
}

function generateTicketCode(): string {
  return `TD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

async function resolveEvent(payload: any, eventIdInput: string | number, user: any) {
  const id = Number.isNaN(Number(eventIdInput)) ? eventIdInput : Number(eventIdInput)
  return payload.findByID({
    collection: 'events',
    id,
    overrideAccess: false,
    user,
  })
}

export async function bookTicketAction(
  eventIdInput: string | number,
  authenticatedUser?: any,
): Promise<TicketActionResult> {
  const user = authenticatedUser || (await studentAuth.currentUser())
  if (!user) {
    return { ok: false, message: 'Please log in or sign up to book a ticket.' }
  }

  if (!user.studentId) {
    return {
      ok: false,
      message: 'Please provide your Student ID on your profile before claiming or booking tickets.',
    }
  }

  const payload = await getPayloadClient()

  let event: any
  try {
    event = await resolveEvent(payload, eventIdInput, user)
  } catch {
    return { ok: false, message: 'Event not found.' }
  }

  if (!event || event.status !== 'published') {
    return { ok: false, message: 'This event is not open for booking.' }
  }

  // Enforce strict 1 person per event rule
  const existingTicket = await payload.find({
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
  })

  if (existingTicket.totalDocs > 0) {
    return {
      ok: false,
      message: 'You already have a ticket for this event. Strict limit: 1 ticket per person.',
    }
  }

  const issuedCount = event.issuedCount ?? 0
  const remaining = Math.max(0, event.capacity - issuedCount)
  if (remaining <= 0) {
    return {
      ok: false,
      message: 'This event is sold out. Join the waitlist to be notified if a seat opens.',
    }
  }

  const code = generateTicketCode()

  try {
    // 1. Create the active ticket
    await payload.create({
      collection: 'tickets',
      overrideAccess: true,
      data: {
        code,
        event: event.id,
        status: 'active',
        student: user.id,
      },
    })

    // 2. Increment the issued counter on the event
    await payload.update({
      collection: 'events',
      id: event.id,
      overrideAccess: true,
      data: {
        issuedCount: issuedCount + 1,
      },
    })

    // 3. If the student was waiting on the waitlist, mark entry as allocated
    const waitingEntry = await payload.find({
      collection: 'waitlist',
      limit: 1,
      overrideAccess: true,
      where: {
        and: [
          { student: { equals: user.id } },
          { event: { equals: event.id } },
          { status: { equals: 'waiting' } },
        ],
      },
    })

    if (waitingEntry.docs[0]) {
      await payload.update({
        collection: 'waitlist',
        id: waitingEntry.docs[0].id,
        overrideAccess: true,
        data: {
          allocatedAt: new Date().toISOString(),
          status: 'allocated',
        },
      })
    }

    // 4. Reliable notification: only created after successful booking persistence
    await payload.create({
      collection: 'notifications',
      overrideAccess: true,
      data: {
        recipient: user.id,
        title: 'Ticket Confirmed',
        message: `You secured a seat for "${event.title}"! Your confirmation code is ${code}.`,
        type: 'ticket_allocated',
        isRead: false,
      },
    })

    return {
      ok: true,
      ticketCode: code,
      message: `Ticket confirmed! Your code is ${code}.`,
    }
  } catch (err: any) {
    return {
      ok: false,
      message: err.message || 'Unable to complete your ticket booking. Please try again.',
    }
  }
}

export async function joinWaitlistAction(
  eventIdInput: string | number,
  authenticatedUser?: any,
): Promise<TicketActionResult> {
  const user = authenticatedUser || (await studentAuth.currentUser())
  if (!user) {
    return { ok: false, message: 'Please log in or sign up to join the waitlist.' }
  }

  if (!user.studentId) {
    return {
      ok: false,
      message: 'Please provide your Student ID on your profile before joining the waitlist.',
    }
  }

  const payload = await getPayloadClient()

  let event: any
  try {
    event = await resolveEvent(payload, eventIdInput, user)
  } catch {
    return { ok: false, message: 'Event not found.' }
  }

  if (!event || event.status !== 'published') {
    return { ok: false, message: 'This event is not accepting waitlist requests.' }
  }

  const existingTicket = await payload.find({
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
  })

  if (existingTicket.totalDocs > 0) {
    return {
      ok: false,
      message: 'You already have a ticket for this event (1 ticket per person limit).',
    }
  }

  const existingWaitlist = await payload.find({
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
  })

  if (existingWaitlist.totalDocs > 0) {
    return {
      ok: true,
      message: 'You are already on the waitlist for this event.',
    }
  }

  await payload.create({
    collection: 'waitlist',
    overrideAccess: true,
    data: {
      event: event.id,
      joinedAt: new Date().toISOString(),
      status: 'waiting',
      student: user.id,
    },
  })

  return {
    ok: true,
    message: 'You are on the waitlist! If a ticket is cancelled, the next seat goes in order.',
  }
}

export async function cancelTicketAction(
  ticketIdInput: string | number,
  authenticatedUser?: any,
): Promise<TicketActionResult> {
  const user = authenticatedUser || (await studentAuth.currentUser())
  if (!user) {
    return { ok: false, message: 'Please log in to manage your tickets.' }
  }

  const ticketId = Number.isNaN(Number(ticketIdInput)) ? ticketIdInput : Number(ticketIdInput)
  const payload = await getPayloadClient()

  let ticket: any
  try {
    ticket = await payload.findByID({
      collection: 'tickets',
      id: ticketId,
      depth: 1,
      overrideAccess: false,
      user,
    })
  } catch {
    return { ok: false, message: 'Ticket not found.' }
  }

  const ownerId = typeof ticket?.student === 'object' ? ticket.student.id : ticket?.student
  if (!ticket || ownerId !== user.id || ticket.status !== 'active') {
    return { ok: false, message: 'Only active tickets in your account can be cancelled.' }
  }

  const eventId = typeof ticket.event === 'object' ? ticket.event.id : ticket.event
  const event = await payload.findByID({
    collection: 'events',
    id: eventId,
    overrideAccess: true,
  })

  if (!event) {
    return { ok: false, message: 'Associated event could not be found.' }
  }

  try {
    // 1. Mark current ticket cancelled
    await payload.update({
      collection: 'tickets',
      id: ticket.id,
      overrideAccess: true,
      data: {
        cancelledAt: new Date().toISOString(),
        status: 'cancelled',
      },
    })

    // 2. Notification to the student cancelling their ticket
    await payload.create({
      collection: 'notifications',
      overrideAccess: true,
      data: {
        recipient: user.id,
        title: 'Ticket Cancelled',
        message: `Your ticket for "${event.title}" (${ticket.code}) was cancelled.`,
        type: 'ticket_cancelled',
        isRead: false,
      },
    })

    // 3. FIFO waitlist auto-allocation
    const nextInLine = await payload.find({
      collection: 'waitlist',
      limit: 1,
      overrideAccess: true,
      sort: 'joinedAt',
      where: {
        and: [
          { event: { equals: event.id } },
          { status: { equals: 'waiting' } },
        ],
      },
    })

    const waiter = nextInLine.docs[0]
    if (waiter) {
      const waiterId = typeof waiter.student === 'object' ? waiter.student.id : waiter.student
      const existingForWaiter = await payload.find({
        collection: 'tickets',
        limit: 1,
        overrideAccess: true,
        where: {
          and: [
            { student: { equals: waiterId } },
            { event: { equals: event.id } },
            { status: { equals: 'active' } },
          ],
        },
      })

      if (existingForWaiter.totalDocs === 0) {
        const newCode = generateTicketCode()
        await payload.create({
          collection: 'tickets',
          overrideAccess: true,
          data: {
            code: newCode,
            event: event.id,
            status: 'active',
            student: waiterId,
          },
        })

        await payload.update({
          collection: 'waitlist',
          id: waiter.id,
          overrideAccess: true,
          data: {
            allocatedAt: new Date().toISOString(),
            status: 'allocated',
          },
        })

        // 4. Notification to the allocated waitlist student
        await payload.create({
          collection: 'notifications',
          overrideAccess: true,
          data: {
            recipient: waiterId,
            title: 'Waitlist Seat Allocated!',
            message: `A seat opened up for "${event.title}" and has been allocated to you! Your ticket code is ${newCode}.`,
            type: 'waitlist_allocated',
            isRead: false,
          },
        })

        return {
          ok: true,
          message: 'Ticket cancelled. Your seat was automatically assigned to the next student on the waitlist.',
        }
      }
    }

    // If waitlist was empty or next waiter already had a ticket, return seat to event capacity
    await payload.update({
      collection: 'events',
      id: event.id,
      overrideAccess: true,
      data: {
        issuedCount: Math.max(0, (event.issuedCount ?? 1) - 1),
      },
    })

    return {
      ok: true,
      message: 'Ticket cancelled and seat returned to available capacity.',
    }
  } catch (err: any) {
    return {
      ok: false,
      message: err.message || 'Error occurred during cancellation.',
    }
  }
}
