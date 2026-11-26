import type { Payload } from 'payload'
import { STARTER_EVENTS } from './starter-events'

export type SeedEventResult = {
  action: 'created' | 'skipped_existing'
  id: string | number
  slug: string
  title: string
}

/**
 * Idempotently seeds starter campus events into PostgreSQL.
 * If an event with the given slug already exists, it is preserved without modification or duplication.
 */
export async function seedStarterEvents(payload: Payload): Promise<SeedEventResult[]> {
  const results: SeedEventResult[] = []

  for (const starter of STARTER_EVENTS) {
    const existing = await payload.find({
      collection: 'events',
      where: { slug: { equals: starter.slug } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.docs[0]) {
      results.push({
        action: 'skipped_existing',
        id: existing.docs[0].id,
        slug: existing.docs[0].slug,
        title: existing.docs[0].title,
      })
      continue
    }

    const created = await payload.create({
      collection: 'events',
      overrideAccess: true,
      data: {
        title: starter.title,
        slug: starter.slug,
        description: starter.description,
        startsAt: starter.startsAt,
        venue: starter.venue,
        category: starter.category,
        capacity: starter.capacity,
        issuedCount: starter.issuedCount,
        price: starter.price,
        location: starter.location,
        status: 'published',
        featured: starter.featured,
      },
    })

    results.push({
      action: 'created',
      id: created.id,
      slug: created.slug,
      title: created.title,
    })
  }

  return results
}
