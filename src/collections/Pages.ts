import type { CollectionConfig } from 'payload'
import { anyone, isAdminOrEditor, publicReadOrAuthed } from '../access/byRole'

/**
 * Pages are evergreen content: About, Mission, Constitution, Award overview
 * pages, etc. Uses Payload's draft system so editors can iterate before
 * publishing.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'menuOrder', '_status'],
    group: 'Content',
  },
  access: {
    read: publicReadOrAuthed,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
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
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'subtitle',
      type: 'text',
      admin: { description: 'Optional small line above the title.' },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'showInNav',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Include this page in the main site navigation.',
      },
    },
    {
      name: 'menuOrder',
      type: 'number',
      defaultValue: 100,
      admin: {
        position: 'sidebar',
        description: 'Sort order in the nav (lower = earlier).',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'pages',
      admin: {
        position: 'sidebar',
        description: 'Optional: nest this page under another page.',
      },
    },
    // --- Migration tracking ---
    {
      name: 'wpPageId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
}
