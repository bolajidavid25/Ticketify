import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { sendComplaintNotificationEmail } from '@/lib/resend'

const ALLOWED_CATEGORIES = new Set([
  'ticket-claim',
  'waitlist',
  'event-information',
  'account-access',
  'other',
])

export async function POST(request: Request) {
  let body: any = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request body.' },
      { status: 400 },
    )
  }

  const { name, email, category, subject, message } = body

  const errors: Record<string, string> = {}
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.name = 'Full name must be at least 2 characters.'
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Valid email address is required.'
  }
  if (!category || !ALLOWED_CATEGORIES.has(category)) {
    errors.category = 'Valid category is required (ticket-claim, waitlist, event-information, account-access, other).'
  }
  if (!subject || typeof subject !== 'string' || subject.trim().length < 4) {
    errors.subject = 'Subject must be at least 4 characters.'
  }
  if (!message || typeof message !== 'string' || message.trim().length < 20) {
    errors.message = 'Message must be at least 20 characters.'
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { success: false, error: 'Validation failed.', errors },
      { status: 400 },
    )
  }

  try {
    const payload = await getPayloadClient()
    const complaint = await payload.create({
      collection: 'complaints',
      overrideAccess: true,
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        category,
        subject: subject.trim(),
        message: message.trim(),
        status: 'new',
      },
    })

    await sendComplaintNotificationEmail({
      id: complaint.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      category,
      subject: subject.trim(),
      message: message.trim(),
    })

    return NextResponse.json({
      success: true,
      message: 'Support request received. Our team will review it shortly.',
      id: complaint.id,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to submit inquiry.' },
      { status: 500 },
    )
  }
}
