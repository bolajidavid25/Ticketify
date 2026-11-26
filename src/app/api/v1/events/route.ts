import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getCategoryImage } from '@/lib/event-media'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const search = url.searchParams.get('search')?.trim()
  const price = url.searchParams.get('price')
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)))

  try {
    const payload = await getPayloadClient()

    const whereConditions: any[] = [{ status: { equals: 'published' } }]

    if (category && category !== 'All') {
      whereConditions.push({ category: { equals: category } })
    }

    if (search) {
      whereConditions.push({
        or: [
          { title: { like: search } },
          { venue: { like: search } },
          { description: { like: search } },
        ],
      })
    }

    if (price === 'free') {
      whereConditions.push({ price: { equals: 0 } })
    } else if (price && !Number.isNaN(Number(price))) {
      whereConditions.push({ price: { less_than_equal: Number(price) } })
    }

    const result = await payload.find({
      collection: 'events',
      where: whereConditions.length > 1 ? { and: whereConditions } : whereConditions[0],
      sort: 'startsAt',
      page,
      limit,
      depth: 1,
      overrideAccess: false,
    })

    const events = result.docs.map((event: any) => {
      const remaining = Math.max(0, event.capacity - (event.issuedCount ?? 0))
      const imageObj = typeof event.image === 'object' && event.image?.url
        ? { url: event.image.url, alt: event.image.alt || event.title }
        : getCategoryImage(event.category)

      return {
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
      }
    })

    return NextResponse.json({
      success: true,
      data: events,
      pagination: {
        page: result.page || 1,
        limit: result.limit,
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to retrieve events.' },
      { status: 500 },
    )
  }
}
