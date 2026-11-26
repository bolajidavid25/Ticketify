'use server'

import { getPayloadClient } from '@/lib/payload'

export type ComplaintFormState = {
  success: boolean
  message: string
  errors?: Partial<Record<'name' | 'email' | 'category' | 'subject' | 'message', string>>
}

const initialError = (message: string): ComplaintFormState => ({ success: false, message })

const readField = (formData: FormData, key: string) => {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function submitComplaint(
  _previousState: ComplaintFormState,
  formData: FormData,
): Promise<ComplaintFormState> {
  if (readField(formData, 'website')) {
    return { success: true, message: 'Thanks. Your complaint has been received.' }
  }

  const name = readField(formData, 'name')
  const email = readField(formData, 'email').toLowerCase()
  const category = readField(formData, 'category')
  const subject = readField(formData, 'subject')
  const message = readField(formData, 'message')
  const allowedCategories = new Set([
    'ticket-claim',
    'waitlist',
    'event-information',
    'account-access',
    'other',
  ])
  const errors: NonNullable<ComplaintFormState['errors']> = {}

  if (name.length < 2 || name.length > 100) errors.name = 'Enter your full name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.'
  if (!allowedCategories.has(category)) errors.category = 'Choose a complaint category.'
  if (subject.length < 4 || subject.length > 160) errors.subject = 'Add a short, clear subject.'
  if (message.length < 20 || message.length > 3000) {
    errors.message = 'Tell us what happened in at least 20 characters.'
  }

  if (Object.keys(errors).length) {
    return { success: false, message: 'Please check the highlighted fields.', errors }
  }

  try {
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'complaints',
      draft: false,
      overrideAccess: false,
      data: {
        name,
        email,
        category: category as 'ticket-claim' | 'waitlist' | 'event-information' | 'account-access' | 'other',
        subject,
        message,
      },
    })

    return {
      success: true,
      message: 'Your complaint has been lodged. Our support team will review it shortly.',
    }
  } catch {
    return initialError('We could not submit your complaint right now. Please try again.')
  }
}
