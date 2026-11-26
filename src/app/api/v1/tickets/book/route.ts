import { NextResponse } from 'next/server'
import { getAuthenticatedStudent } from '@/lib/api-auth'
import { bookTicketAction } from '@/app/(frontend)/ticket-actions'

export async function POST(request: Request) {
  const user = await getAuthenticatedStudent(request)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Please sign in to book a ticket.' },
      { status: 401 },
    )
  }

  let body: any = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request body.' },
      { status: 400 },
    )
  }

  const { eventId } = body
  if (!eventId) {
    return NextResponse.json(
      { success: false, error: 'Event ID (eventId) is required.' },
      { status: 400 },
    )
  }

  const result = await bookTicketAction(eventId, user)

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.message },
      { status: 400 },
    )
  }

  return NextResponse.json({
    success: true,
    message: result.message,
    ticketCode: result.ticketCode,
  })
}
