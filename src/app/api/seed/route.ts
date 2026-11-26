import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { seedStarterEvents } from '@/lib/seed-events'

export async function POST() {
  const payload = await getPayloadClient()
  const results = await seedStarterEvents(payload)
  return NextResponse.json({ success: true, results })
}

export async function GET() {
  const payload = await getPayloadClient()
  const results = await seedStarterEvents(payload)
  return NextResponse.json({ success: true, results })
}
