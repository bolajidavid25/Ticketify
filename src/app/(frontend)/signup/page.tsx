import type { Metadata } from 'next'
import { signupStudent } from '@/app/(frontend)/auth-actions'
import { StudentAuthScreen } from '@/components/StudentAuthScreen'

export const metadata: Metadata = {
  title: 'Create your student account · Ticketify',
  description: 'Create a Ticketify account for fair access to campus events.',
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return <StudentAuthScreen action={signupStudent} mode="signup" nextPath={next} />
}
