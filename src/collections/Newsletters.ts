import type { CollectionConfig } from 'payload'
import { anyone, isAdminOrEditor } from '../access/byRole'

export const Newsletters: CollectionConfig = {
  slug: 'newsletters',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'issueDate', 'issueNumber'],
    group: 'Content',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'issueNumber',
      type: 'text',
      admin: { description: 'e.g. "Vol. 1, Issue 1" or "2025-09"' },
    },
    {
      name: 'issueDate',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'pdf',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: { description: 'The PDF file. Uploaded to the Media library first.' },
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional thumbnail for the newsletter archive.' },
    },
    {
      name: 'summary',
      type: 'textarea',
      admin: { description: 'One or two sentences of what this issue covers.' },
    },
  ],
}
