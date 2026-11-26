'use server'

import { ValidationError } from 'payload'
import { redirect } from 'next/navigation'
import { studentAuth } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export type AuthFormState = {
  errors?: Partial<Record<'email' | 'name' | 'password' | 'passwordConfirmation' | 'studentId', string>>
  message: string
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function safeNextPath(value: string): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) {
    return value
  }
  return '/discover'
}

function emailIsValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function payloadErrors(error: unknown): AuthFormState['errors'] {
  if (!(error instanceof ValidationError)) return undefined

  return Object.fromEntries(
    error.data.errors
      .filter(({ path }) => ['email', 'name', 'password', 'studentId'].includes(path))
      .map(({ message, path }) => [path, message]),
  )
}

export async function loginStudent(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, 'email').toLowerCase()
  const password = field(formData, 'password')
  const errors: AuthFormState['errors'] = {}

  if (!emailIsValid(email)) errors.email = 'Enter a valid university email address.'
  if (!password) errors.password = 'Enter your password.'
  if (Object.keys(errors).length) return { errors, message: 'Check the highlighted fields.' }

  try {
    await studentAuth.login(email, password)
  } catch {
    return { message: 'Email or password is incorrect. Please try again.' }
  }

  redirect(safeNextPath(field(formData, 'next')))
}

export async function signupStudent(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = field(formData, 'name')
  const email = field(formData, 'email').toLowerCase()
  const studentId = field(formData, 'studentId').toUpperCase()
  const password = field(formData, 'password')
  const passwordConfirmation = field(formData, 'passwordConfirmation')
  const errors: AuthFormState['errors'] = {}

  if (name.length < 2) errors.name = 'Enter your full name.'
  if (!emailIsValid(email)) errors.email = 'Enter a valid university email address.'
  if (studentId.length < 3) errors.studentId = 'Enter your student ID.'
  if (password.length < 8) errors.password = 'Use at least 8 characters.'
  if (passwordConfirmation !== password) errors.passwordConfirmation = 'Passwords do not match.'
  if (Object.keys(errors).length) return { errors, message: 'Check the highlighted fields.' }

  try {
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'users',
      data: { email, name, password, studentId },
      overrideAccess: false,
    })
    await studentAuth.login(email, password)
  } catch (error) {
    const errorsFromPayload = payloadErrors(error)
    if (errorsFromPayload && Object.keys(errorsFromPayload).length) {
      return { errors: errorsFromPayload, message: 'We could not create your account yet.' }
    }
    return {
      message: 'An account with that email or student ID may already exist. Try logging in instead.',
    }
  }

  redirect(safeNextPath(field(formData, 'next')))
}

export async function logoutStudent(): Promise<void> {
  await studentAuth.logout()
  redirect('/')
}

export async function updateStudentIdAction(studentIdInput: string): Promise<{ ok: boolean; message: string }> {
  const user = await studentAuth.currentUser()
  if (!user) {
    return { ok: false, message: 'Please log in first.' }
  }

  const studentId = studentIdInput.trim().toUpperCase()
  if (studentId.length < 3) {
    return { ok: false, message: 'Please enter a valid student ID (at least 3 characters).' }
  }

  const payload = await getPayloadClient()

  const existing = await payload.find({
    collection: 'users',
    where: {
      and: [
        { studentId: { equals: studentId } },
        { id: { not_equals: user.id } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.totalDocs > 0) {
    return { ok: false, message: 'This student ID is already associated with another account.' }
  }

  try {
    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      data: { studentId },
    })

    return { ok: true, message: 'Student ID successfully updated!' }
  } catch (err: any) {
    return { ok: false, message: err.message || 'Unable to update student ID.' }
  }
}
