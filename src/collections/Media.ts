import type { CollectionConfig } from 'payload'
import { anyone, isAdminOrEditor } from '../access/byRole'

/** Strip the Payload serverURL prefix so the returned URL is a relative
 *  path. Avoids Next.js Image's private-IP SSRF block during dev, and
 *  keeps frontend code origin-agnostic for production too. */
const localize = (url?: string | null): string | undefined => {
  if (!url || typeof url !== 'string') return url ?? undefined
  try {
    const u = new URL(url)
    // If host is our own app (any host, really), return just the path.
    return u.pathname + u.search + u.hash
  } catch {
    return url
  }
}

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'mimeType'],
    group: 'Library',
  },
  access: {
    read: anyone, // public site needs to serve images
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  hooks: {
    afterRead: [
      ({ doc }) => {
        if (!doc) return doc
        if (doc.url) doc.url = localize(doc.url)
        if (doc.thumbnailURL) doc.thumbnailURL = localize(doc.thumbnailURL)
        if (doc.sizes && typeof doc.sizes === 'object') {
          for (const key of Object.keys(doc.sizes)) {
            const size = doc.sizes[key]
            if (size && size.url) size.url = localize(size.url)
          }
        }
        return doc
      },
    ],
  },
  upload: {
    // Defaults to ./media relative to the app. Good for dev; we'll
    // swap to Cloudflare R2 in production via @payloadcms/storage-s3.
    staticDir: 'media',
    mimeTypes: [
      'image/*',
      'application/pdf',
      // Meeting minutes and slides from the WP archive
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 400, position: 'centre' },
      { name: 'card', width: 800, height: 600, position: 'centre' },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: {
        description:
          'Describe this image for screen readers and when the image fails to load. One short sentence.',
      },
    },
    {
      name: 'caption',
      type: 'text',
      admin: { description: 'Optional caption shown under the image on posts/pages.' },
    },
    {
      name: 'credit',
      type: 'text',
      admin: { description: 'Photographer / source attribution, if applicable.' },
    },
    // --- Migration tracking ---
    {
      name: 'wpAttachmentId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'Legacy WordPress attachment id; used for migration de-duplication.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'wpSourceUrl',
      type: 'text',
      admin: {
        description: 'Original URL on aag-giss.org (for migration audit).',
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
}
