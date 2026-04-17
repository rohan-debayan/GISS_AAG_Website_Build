import type { CollectionConfig } from 'payload'
import { anyone, isAdminOrEditor } from '../access/byRole'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'eventType', 'startDate', 'location'],
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
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'eventType',
      type: 'select',
      required: true,
      options: [
        { label: 'AAG Annual Meeting Session', value: 'aag-session' },
        { label: 'Business Meeting', value: 'business-meeting' },
        { label: 'Distinguished Lecture', value: 'lecture' },
        { label: 'Competition Session', value: 'competition' },
        { label: 'Reception', value: 'reception' },
        { label: 'Webinar', value: 'webinar' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'endDate',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'location',
      type: 'text',
      admin: { description: 'e.g. "Detroit, MI" or "Online"' },
    },
    {
      name: 'venue',
      type: 'text',
      admin: {
        description: 'e.g. "AAG Annual Meeting 2026", "Cobo Center, Room 310"',
      },
    },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    { name: 'description', type: 'richText' },
    {
      name: 'speakers',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'affiliation', type: 'text' },
        { name: 'role', type: 'text', admin: { description: 'e.g. "Keynote", "Panelist"' } },
      ],
    },
    {
      name: 'registrationUrl',
      type: 'text',
      admin: { description: 'Optional external registration link.' },
    },
    {
      name: 'relatedPage',
      type: 'relationship',
      relationTo: 'pages',
      admin: {
        position: 'sidebar',
        description: 'Tie this event to an evergreen page (e.g. Tobler Lecture).',
      },
    },
  ],
}
