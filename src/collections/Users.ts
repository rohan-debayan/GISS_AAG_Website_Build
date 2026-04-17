import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminFieldLevel } from '../access/byRole'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role'],
    group: 'People',
  },
  auth: true,
  access: {
    // Only admins manage other users.
    create: isAdmin,
    delete: isAdmin,
    read: ({ req }) => {
      // Everyone can read their own user; admins see all.
      if (!req.user) return false
      // @ts-expect-error — role is set at runtime.
      if (req.user.role === 'admin') return true
      return { id: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (!req.user) return false
      // @ts-expect-error
      if (req.user.role === 'admin') return true
      return { id: { equals: req.user.id } }
    },
    admin: ({ req }) => {
      if (!req.user) return false
      // @ts-expect-error — role is set at runtime.
      const role = req.user.role
      // Backward compat: accounts created before the role field was added
      // have role=null; treat them as admin so they aren't locked out.
      if (!role) return true
      return ['admin', 'editor'].includes(role as string)
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      admin: {
        description:
          'Display name shown on author bylines. Please fill this in for your own account.',
      },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Admin — full control', value: 'admin' },
        { label: 'Editor — CRUD all content', value: 'editor' },
        { label: 'Author — CRUD own posts only', value: 'author' },
      ],
      access: {
        // Only admins can change someone's role.
        create: isAdminFieldLevel,
        update: isAdminFieldLevel,
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'bio',
      type: 'textarea',
      admin: { description: 'Short bio shown on author pages.' },
    },
    {
      name: 'affiliation',
      type: 'text',
      admin: { description: 'e.g. "Texas A&M University"' },
    },
    // --- Migration tracking, not shown in UI by default ---
    {
      name: 'wpAuthorId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'Legacy WordPress author id; used for migration.',
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
}
