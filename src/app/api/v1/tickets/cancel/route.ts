import { NextResponse } from 'next/server'
import { getAuthenticatedStudent } from '@/lib/api-auth'
import { cancelTicketAction } from '@/app/(frontend)/ticket-actions'

export async function POST(request: Request) {
  const user = await getAuthenticatedStudent(request)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Please sign in to manage tickets.' },
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

  const { ticketId } = body
  if (!ticketId) {
    return NextResponse.json(
      { success: false, error: 'Ticket ID (ticketId) is required.' },
      { status: 400 },
    )
  }

  const result = await cancelTicketAction(ticketId, user)

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.message },
      { status: 400 },
    )
  }

  return NextResponse.json({
    success: true,
    message: result.message,
  })
}
