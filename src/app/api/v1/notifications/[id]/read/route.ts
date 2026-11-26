import { NextResponse } from 'next/server'
import { getAuthenticatedStudent } from '@/lib/api-auth'
import { getPayloadClient } from '@/lib/payload'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedStudent(request)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Please sign in.' },
      { status: 401 },
    )
  }

  const { id } = await params
  const notifId = Number.isNaN(Number(id)) ? id : Number(id)

  try {
    const payload = await getPayloadClient()

    const notif: any = await payload.findByID({
      collection: 'notifications',
      id: notifId,
      overrideAccess: true,
    })

    if (!notif) {
      return NextResponse.json(
        { success: false, error: 'Notification not found.' },
        { status: 404 },
      )
    }

    const recipientId = typeof notif.recipient === 'object' ? notif.recipient?.id : notif.recipient
    if (recipientId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. You do not have access to this notification.' },
        { status: 403 },
      )
    }

    await payload.update({
      collection: 'notifications',
      id: notif.id,
      overrideAccess: true,
      data: { isRead: true },
    })

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read.',
      id: notif.id,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update notification.' },
      { status: 500 },
    )
  }
}
