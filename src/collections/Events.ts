import type { CollectionConfig } from 'payload'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    group: 'Ticket Drop',
    useAsTitle: 'title',
    defaultColumns: ['title', 'startsAt', 'venue', 'status', 'capacity'],
  },
  access: {
    create: ({ req }) => req.user?.collection === 'admins',
    read: ({ req }) => {
      if (req.user?.collection === 'admins') return true
      if (req.user?.collection === 'users') {
        return { status: { in: ['published', 'completed'] } }
      }
      return { status: { equals: 'published' } }
    },
    update: ({ req }) => req.user?.collection === 'admins',
    delete: ({ req }) => req.user?.collection === 'admins',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'slug', useAsSlug: 'title' },
    { name: 'description', type: 'textarea', required: true },
    { name: 'startsAt', type: 'date', required: true, index: true },
    { name: 'venue', type: 'text', required: true },
    {
      name: 'location',
      type: 'json',
      label: 'Event coordinates',
      admin: {
        description: 'JSON [longitude, latitude] array used to calculate distance from each student (e.g. [-73.9857, 40.7484]).',
      },
      validate: (value) => {
        if (value == null) return true
        if (
          Array.isArray(value) &&
          value.length === 2 &&
          typeof value[0] === 'number' &&
          typeof value[1] === 'number' &&
          Number.isFinite(value[0]) &&
          Number.isFinite(value[1])
        ) {
          return true
        }
        return 'Coordinates must be a [longitude, latitude] number pair.'
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: ['Music', 'Arts', 'Sports', 'Technology', 'Community'],
    },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'gallery',
      type: 'array',
      label: 'Additional event images (up to 3 shown)',
      maxRows: 3,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    { name: 'capacity', type: 'number', required: true, min: 1 },
    {
      name: 'issuedCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'price',
      type: 'number',
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      admin: { position: 'sidebar' },
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Completed', value: 'completed' },
      ],
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
