import type { Access, CollectionConfig, PayloadRequest } from 'payload'

const ownNotifications = (req: PayloadRequest) =>
  req.user?.collection === 'users' ? { recipient: { equals: req.user.id } } : false

const updateOwnNotifications: Access = ({ req }) => ownNotifications(req)

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: {
    group: 'Ticket Drop',
    defaultColumns: ['title', 'recipient', 'type', 'isRead', 'createdAt'],
  },
  access: {
    create: () => false,
    read: ({ req }) => (req.user?.collection === 'admins' ? true : ownNotifications(req)),
    update: updateOwnNotifications,
    delete: () => false,
  },
  fields: [
    { name: 'recipient', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'title', type: 'text', required: true },
    { name: 'message', type: 'textarea', required: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: ['ticket_allocated', 'waitlist_allocated', 'ticket_cancelled', 'event_cancelled'],
    },
    { name: 'isRead', type: 'checkbox', defaultValue: false },
  ],
  timestamps: true,
}
