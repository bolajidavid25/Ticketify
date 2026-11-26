import type { CollectionConfig, PayloadRequest } from 'payload'

const ownRecords = (req: PayloadRequest) =>
  req.user?.collection === 'users' ? { student: { equals: req.user.id } } : false

export const Tickets: CollectionConfig = {
  slug: 'tickets',
  admin: {
    group: 'Ticket Drop',
    useAsTitle: 'code',
    defaultColumns: ['code', 'event', 'student', 'status', 'createdAt'],
  },
  access: {
    create: () => false,
    read: ({ req }) => (req.user?.collection === 'admins' ? true : ownRecords(req)),
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create' || data?.status !== 'active') return data
        const studentId = typeof data.student === 'object' ? data.student?.id : data.student
        const eventId = typeof data.event === 'object' ? data.event?.id : data.event
        if (!studentId || !eventId) return data

        const existing = await req.payload.find({
          collection: 'tickets',
          limit: 1,
          overrideAccess: true,
          req,
          where: {
            and: [
              { student: { equals: studentId } },
              { event: { equals: eventId } },
              { status: { equals: 'active' } },
            ],
          },
        })

        if (existing.totalDocs > 0) {
          throw new Error('Strict rule: Only 1 ticket per person is allowed for each event.')
        }

        return data
      },
    ],
  },
  fields: [
    { name: 'code', type: 'text', required: true, unique: true, index: true },
    { name: 'student', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: ['active', 'cancelled'],
    },
    { name: 'cancelledAt', type: 'date' },
  ],
  timestamps: true,
}
