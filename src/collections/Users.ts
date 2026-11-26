import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    group: 'Ticket Drop',
    useAsTitle: 'name',
  },
  access: {
    create: () => true,
    read: ({ req }) =>
      req.user?.collection === 'users' ? { id: { equals: req.user.id } } : false,
    update: ({ req }) =>
      req.user?.collection === 'users' ? { id: { equals: req.user.id } } : false,
    delete: () => false,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'studentId',
      type: 'text',
      required: false,
      unique: true,
      index: true,
      hooks: {
        beforeValidate: [
          ({ value }) =>
            typeof value === 'string' && value.trim().length > 0 ? value.trim().toUpperCase() : null,
        ],
      },
    },
    {
      name: 'googleId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'avatar',
      type: 'text',
    },
    {
      name: 'authProvider',
      type: 'select',
      defaultValue: 'local',
      options: ['local', 'google', 'both'],
    },
  ],
}
