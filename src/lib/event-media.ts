export type EventImageItem = {
  alt: string
  url: string
}

export const CATEGORY_IMAGES: Record<string, { alt: string; url: string }> = {
  Music: { alt: 'Music festival crowd', url: '/images/campus-festival.png' },
  Arts: { alt: 'Campus arts showcase', url: '/images/arts-showcase.png' },
  Sports: { alt: 'Arena sports night', url: '/images/arena-night.png' },
  Technology: { alt: 'Campus technology summit', url: '/images/tech-summit.png' },
  Community: { alt: 'Student community gathering', url: '/images/student-support.png' },
}

const FALLBACK_GALLERY: Record<string, string[]> = {
  Music: ['/images/campus-festival.png', '/images/arena-night.png', '/images/arts-showcase.png'],
  Arts: ['/images/arts-showcase.png', '/images/campus-festival.png', '/images/student-support.png'],
  Sports: ['/images/arena-night.png', '/images/campus-festival.png', '/images/student-support.png'],
  Technology: ['/images/tech-summit.png', '/images/student-support.png', '/images/arena-night.png'],
  Community: ['/images/student-support.png', '/images/arts-showcase.png', '/images/tech-summit.png'],
}

export function getCategoryImage(category: string): EventImageItem {
  return CATEGORY_IMAGES[category] ?? { alt: category, url: '/images/campus-festival.png' }
}

type MediaRef = { url?: string | null; alt?: string | null } | number | string | null | undefined

export function getEventImages(
  event: {
    title: string
    category: string
    image?: MediaRef
    gallery?: Array<{ image?: MediaRef } | null> | null
  },
  count = 3,
): EventImageItem[] {
  const images: EventImageItem[] = []
  const seen = new Set<string>()

  const pushMedia = (media: MediaRef) => {
    if (media && typeof media === 'object' && media.url && !seen.has(media.url)) {
      seen.add(media.url)
      images.push({ alt: media.alt || event.title, url: media.url })
    }
  }

  pushMedia(event.image)
  if (Array.isArray(event.gallery)) {
    for (const item of event.gallery) {
      pushMedia(item?.image)
      if (images.length >= count) break
    }
  }

  const fallbacks = FALLBACK_GALLERY[event.category] ?? FALLBACK_GALLERY.Music
  for (const fallbackUrl of fallbacks) {
    if (images.length >= count) break
    if (!seen.has(fallbackUrl)) {
      seen.add(fallbackUrl)
      images.push({ alt: event.title, url: fallbackUrl })
    }
  }

  return images.slice(0, count)
}
