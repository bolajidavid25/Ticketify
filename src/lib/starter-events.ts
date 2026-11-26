export type StarterEvent = {
  id: string | number
  title: string
  slug: string
  description: string
  startsAt: string
  venue: string
  category: 'Music' | 'Arts' | 'Sports' | 'Technology' | 'Community'
  capacity: number
  issuedCount: number
  price: number
  location: [number, number]
  status: 'published'
  featured: boolean
}

export const STARTER_EVENTS: StarterEvent[] = [
  {
    id: 'seed-music-1',
    title: 'AfroBeats Campus Fest 2026',
    slug: 'afrobeats-campus-fest',
    description:
      'The biggest outdoor live festival of the semester. Headline guest artists, student DJs, cultural food pop-ups, and campus energy.',
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    venue: 'Main Amphitheatre, Campus North',
    category: 'Music',
    capacity: 350,
    issuedCount: 280,
    price: 1500,
    location: [3.3792, 6.5244],
    status: 'published',
    featured: true,
  },
  {
    id: 'seed-arts-2',
    title: 'Annual Arts & Design Showcase',
    slug: 'annual-arts-showcase',
    description:
      'An immersive gallery exhibition spotlighting graduating fine art, photography, interactive digital media, and sculpture installations.',
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
    venue: 'Faculty of Arts Exhibition Hall',
    category: 'Arts',
    capacity: 150,
    issuedCount: 150, // Sold out!
    price: 0,
    location: [3.385, 6.528],
    status: 'published',
    featured: true,
  },
  {
    id: 'seed-sports-3',
    title: 'Varsity Basketball Championship Finals',
    slug: 'varsity-basketball-finals',
    description:
      'The grand finale of the inter-faculty basketball tournament. High-octane rivalry, halftime dance showcases, and live courtside commentary.',
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 16).toISOString(),
    venue: 'Indoor Sports Complex & Arena',
    category: 'Sports',
    capacity: 500,
    issuedCount: 420,
    price: 1000,
    location: [3.375, 6.52],
    status: 'published',
    featured: true,
  },
  {
    id: 'seed-tech-4',
    title: 'NextGen Tech Summit & AI Hackathon',
    slug: 'nextgen-tech-summit',
    description:
      '48 hours of rapid prototyping, mentorship from industry tech founders, API bounties, and pitch sessions with cash prize pools.',
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20).toISOString(),
    venue: 'Innovation Hub Auditorium, 3rd Floor',
    category: 'Technology',
    capacity: 200,
    issuedCount: 145,
    price: 0,
    location: [3.382, 6.526],
    status: 'published',
    featured: true,
  },
]
