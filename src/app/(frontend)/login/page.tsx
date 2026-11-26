import type { Metadata } from 'next'
import { loginStudent } from '@/app/(frontend)/auth-actions'
import { StudentAuthScreen } from '@/components/StudentAuthScreen'

export const metadata: Metadata = {
  title: 'Student sign in · Ticketify',
  description: 'Sign in to your Ticketify student account.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return <StudentAuthScreen action={loginStudent} mode="login" nextPath={next} />
}
