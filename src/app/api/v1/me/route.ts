import { NextResponse } from 'next/server'
import { getAuthenticatedStudent } from '@/lib/api-auth'
import { getPayloadClient } from '@/lib/payload'

export async function GET(request: Request) {
  const user = await getAuthenticatedStudent(request)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Please sign in to access your profile.' },
      { status: 401 },
    )
  }

  try {
    const payload = await getPayloadClient()

    const [ticketsResult, waitlistResult, notifCountResult] = await Promise.all([
      payload.find({
        collection: 'tickets',
        where: { student: { equals: user.id } },
        depth: 1,
        sort: '-createdAt',
        limit: 50,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'waitlist',
        where: {
          and: [{ student: { equals: user.id } }, { status: { equals: 'waiting' } }],
        },
        depth: 1,
        sort: '-joinedAt',
        limit: 50,
        overrideAccess: true,
      }),
      payload.count({
        collection: 'notifications',
        where: {
          and: [{ recipient: { equals: user.id } }, { isRead: { equals: false } }],
        },
        overrideAccess: true,
      }),
    ])

    const activeTickets = ticketsResult.docs
      .filter((t: any) => t.status === 'active')
      .map((t: any) => ({
        id: t.id,
        code: t.code,
        status: t.status,
        createdAt: t.createdAt,
        event: typeof t.event === 'object' && t.event
          ? {
              id: t.event.id,
              title: t.event.title,
              slug: t.event.slug,
              startsAt: t.event.startsAt,
              venue: t.event.venue,
              category: t.event.category,
            }
          : { id: t.event },
      }))

    const cancelledTickets = ticketsResult.docs
      .filter((t: any) => t.status === 'cancelled')
      .map((t: any) => ({
        id: t.id,
        code: t.code,
        status: t.status,
        cancelledAt: t.cancelledAt,
        event: typeof t.event === 'object' && t.event
          ? {
              id: t.event.id,
              title: t.event.title,
              slug: t.event.slug,
              startsAt: t.event.startsAt,
              venue: t.event.venue,
            }
          : { id: t.event },
      }))

    const waitlist = waitlistResult.docs.map((w: any) => ({
      id: w.id,
      status: w.status,
      joinedAt: w.joinedAt,
      event: typeof w.event === 'object' && w.event
        ? {
            id: w.event.id,
            title: w.event.title,
            slug: w.event.slug,
            startsAt: w.event.startsAt,
            venue: w.event.venue,
          }
        : { id: w.event },
    }))

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          studentId: user.studentId || null,
          avatar: user.avatar || null,
          authProvider: user.authProvider || 'local',
        },
        activeTickets,
        cancelledTickets,
        waitlist,
        unreadNotificationsCount: notifCountResult.totalDocs,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to retrieve student profile.' },
      { status: 500 },
    )
  }
}
