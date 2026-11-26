import type { CollectionConfig, PayloadRequest } from 'payload'

const ownEntries = (req: PayloadRequest) =>
  req.user?.collection === 'users' ? { student: { equals: req.user.id } } : false

export const Waitlist: CollectionConfig = {
  slug: 'waitlist',
  admin: {
    group: 'Ticket Drop',
    defaultColumns: ['event', 'student', 'status', 'joinedAt'],
  },
  access: {
    create: () => false,
    read: ({ req }) => (req.user?.collection === 'admins' ? true : ownEntries(req)),
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'student', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'waiting',
      options: ['waiting', 'allocated', 'cancelled', 'removed'],
    },
    { name: 'joinedAt', type: 'date', required: true, index: true },
    { name: 'allocatedAt', type: 'date' },
  ],
  timestamps: true,
}
