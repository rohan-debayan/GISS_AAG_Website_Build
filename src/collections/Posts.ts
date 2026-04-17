import type { CollectionConfig } from 'payload'
import { adminOrSelf, isAdminOrEditor, publicReadOrAuthed } from '../access/byRole'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'publishedAt', '_status'],
    group: 'Content',
  },
  access: {
    read: publicReadOrAuthed,
    create: ({ req }) => Boolean(req.user), // any logged-in user can draft
    update: adminOrSelf('author'),
    delete: isAdminOrEditor,
  },
  versions: {
    drafts: {
      autosave: { interval: 2000 },
    },
    maxPerDoc: 25,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 250,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description:
          'URL-friendly identifier, e.g. "student-honors-2026". Lowercase, hyphens, no spaces.',
        position: 'sidebar',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'news',
      options: [
        { label: 'News', value: 'news' },
        { label: 'Award', value: 'award' },
        { label: 'Meeting', value: 'meeting' },
        { label: 'Event', value: 'event' },
        { label: 'Call for Papers', value: 'call-for-papers' },
        { label: 'Newsletter', value: 'newsletter' },
        { label: 'Board Nomination', value: 'board-nomination' },
        { label: 'Jobs', value: 'jobs' },
        { label: 'Website Update', value: 'website-update' },
      ],
    },
    {
      name: 'tags',
      type: 'array',
      fields: [{ name: 'tag', type: 'text' }],
      admin: { description: 'Free-form tags. Keep short.' },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description:
          'Short summary shown in post lists. If blank, derived from content.',
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'coAuthors',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Pin to the home page.',
      },
    },
    // --- Migration tracking ---
    {
      name: 'wpPostId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Legacy WordPress post id.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        // If publishing and no publishedAt set, stamp it now.
        if (operation === 'create' || operation === 'update') {
          if (data._status === 'published' && !data.publishedAt) {
            data.publishedAt = new Date().toISOString()
          }
        }
        return data
      },
    ],
  },
}
