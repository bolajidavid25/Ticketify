import { NextResponse } from 'next/server'
import { getAuthenticatedStudent } from '@/lib/api-auth'
import { getPayloadClient } from '@/lib/payload'

export async function GET(request: Request) {
  const user = await getAuthenticatedStudent(request)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Please sign in.' },
      { status: 401 },
    )
  }

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))

  try {
    const payload = await getPayloadClient()

    const [notifResult, unreadCountResult] = await Promise.all([
      payload.find({
        collection: 'notifications',
        where: { recipient: { equals: user.id } },
        sort: '-createdAt',
        page,
        limit,
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

    const notifications = notifResult.docs.map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: Boolean(n.isRead),
      createdAt: n.createdAt,
    }))

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount: unreadCountResult.totalDocs,
        pagination: {
          page: notifResult.page || 1,
          limit: notifResult.limit,
          totalDocs: notifResult.totalDocs,
          totalPages: notifResult.totalPages,
        },
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to retrieve notifications.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedStudent(request)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Please sign in.' },
      { status: 401 },
    )
  }

  try {
    const payload = await getPayloadClient()

    // Mark all notifications as read for this student
    const unread = await payload.find({
      collection: 'notifications',
      where: {
        and: [{ recipient: { equals: user.id } }, { isRead: { equals: false } }],
      },
      limit: 100,
      overrideAccess: true,
    })

    for (const doc of unread.docs) {
      await payload.update({
        collection: 'notifications',
        id: doc.id,
        overrideAccess: true,
        data: { isRead: true },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${unread.docs.length} notifications as read.`,
      updatedCount: unread.docs.length,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update notifications.' },
      { status: 500 },
    )
  }
}
