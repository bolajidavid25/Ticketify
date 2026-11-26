import type { CollectionConfig } from 'payload'

const isAdmin = ({ req }: { req: { user?: { collection?: string } | null } }) =>
  req.user?.collection === 'admins'

export const Complaints: CollectionConfig = {
  slug: 'complaints',
  admin: {
    group: 'Ticket Drop',
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'name', 'email', 'category', 'status', 'createdAt'],
  },
  access: {
    create: () => true,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 100 },
    { name: 'email', type: 'email', required: true, index: true },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Ticket claim', value: 'ticket-claim' },
        { label: 'Waitlist', value: 'waitlist' },
        { label: 'Event information', value: 'event-information' },
        { label: 'Account access', value: 'account-access' },
        { label: 'Other', value: 'other' },
      ],
    },
    { name: 'subject', type: 'text', required: true, maxLength: 160 },
    { name: 'message', type: 'textarea', required: true, minLength: 20, maxLength: 3000 },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      admin: { position: 'sidebar' },
      access: {
        create: () => false,
        update: isAdmin,
      },
      options: [
        { label: 'New', value: 'new' },
        { label: 'In review', value: 'in-review' },
        { label: 'Resolved', value: 'resolved' },
      ],
    },
  ],
  timestamps: true,
}
