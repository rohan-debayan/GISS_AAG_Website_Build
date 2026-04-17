import type { CollectionConfig } from 'payload'
import { anyone, isAdminOrEditor } from '../access/byRole'

/**
 * Gallery: photos from meetings, lectures, field work, receptions.
 * Each entry is a single image with optional caption + album. On the
 * /gallery page they render as a masonry-ish card grid.
 *
 * Storage: lives in the same Payload Media pipeline. In dev, files sit
 * under ./media; in prod they'll go to Cloudflare R2 via
 * @payloadcms/storage-s3.
 */
export const Gallery: CollectionConfig = {
  slug: 'gallery',
  labels: { singular: 'Gallery Item', plural: 'Gallery' },
  admin: {
    useAsTitle: 'caption',
    defaultColumns: ['caption', 'album', 'takenAt', 'sortOrder'],
    group: 'Library',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'caption',
      type: 'text',
      admin: {
        description: 'Short caption shown under the image in the public gallery.',
      },
    },
    {
      name: 'album',
      type: 'text',
      admin: {
        description:
          'Optional grouping, e.g. "AAG 2025 Detroit", "Tobler Lecture 2024". Items without an album fall under "General".',
      },
    },
    {
      name: 'credit',
      type: 'text',
      admin: { description: 'Photo credit or source (optional).' },
    },
    {
      name: 'takenAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description: 'When this photo was taken (optional).',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 100,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first within an album.',
      },
    },
  ],
}
