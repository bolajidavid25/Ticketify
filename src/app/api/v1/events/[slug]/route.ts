import { NextResponse } from 'next/server'
import { findBySlug } from '@/lib/payload'
import { getCategoryImage } from '@/lib/event-media'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!slug) {
    return NextResponse.json({ success: false, error: 'Event slug is required.' }, { status: 400 })
  }

  try {
    const event: any = await findBySlug('events', slug, { depth: 1 })
    if (!event || event.status !== 'published') {
      return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 })
    }

    const remaining = Math.max(0, event.capacity - (event.issuedCount ?? 0))
    const imageObj = typeof event.image === 'object' && event.image?.url
      ? { url: event.image.url, alt: event.image.alt || event.title }
      : getCategoryImage(event.category)

    return NextResponse.json({
      success: true,
      data: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        startsAt: event.startsAt,
        venue: event.venue,
        category: event.category,
        capacity: event.capacity,
        issuedCount: event.issuedCount ?? 0,
        remainingSeats: remaining,
        isSoldOut: remaining === 0,
        price: event.price ?? 0,
        location: Array.isArray(event.location) ? event.location : null,
        featured: Boolean(event.featured),
        image: imageObj,
        gallery: Array.isArray(event.gallery)
          ? event.gallery
              .map((row: any) => (typeof row?.image === 'object' ? row.image?.url : null))
              .filter(Boolean)
          : [],
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch event.' },
      { status: 500 },
    )
  }
}
