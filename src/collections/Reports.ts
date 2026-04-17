import type { CollectionConfig, Access } from 'payload'
import { anyone, isAdminOrEditor } from '../access/byRole'

/**
 * Business meeting minutes, presentations, budgets, annual reports.
 * Uploaded via /admin -> Content -> Reports. Per-document visibility
 * flag ('public' or 'officers') controls whether the item appears on
 * the public /reports page for anonymous visitors.
 *
 * Enforcement: the read access function filters at query time so
 * logged-out visitors literally can't see 'officers' docs (can't list
 * them, can't fetch them by id). Officers (anyone logged in with a
 * user account) see everything.
 *
 * This is NOT a substitute for file-level ACLs. The uploaded Media
 * file's URL remains public — if someone knows or guesses the media
 * URL they can still download it. For true file gating we'd need a
 * Payload access hook on the Media collection that reads the parent
 * Report's visibility. Keeping that out of scope for now.
 */
const reportRead: Access = ({ req }) => {
  if (req.user) return true
  return {
    visibility: { equals: 'public' },
  }
}

export const Reports: CollectionConfig = {
  slug: 'reports',
  labels: { singular: 'Report', plural: 'Reports' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'year', 'kind', 'visibility'],
    group: 'Content',
  },
  access: {
    read: reportRead,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'year',
      type: 'number',
      required: true,
      min: 1985,
      max: 2100,
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Business Meeting Minutes', value: 'minutes' },
        { label: 'Business Meeting Presentation', value: 'presentation' },
        { label: 'Budget / Treasurer Report', value: 'budget' },
        { label: 'Annual Report', value: 'annual-report' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'file',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description:
          'The file to download (DOCX, PPTX, XLSX, PDF). Uploaded to the Media library.',
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      admin: {
        description:
          'Optional one-line description shown under the title on the reports page.',
      },
    },
    {
      name: 'visibility',
      type: 'select',
      required: true,
      defaultValue: 'officers',
      options: [
        { label: 'Public \u2014 anyone can view', value: 'public' },
        { label: 'Officers only \u2014 requires login', value: 'officers' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Minutes default to officers-only since they often contain internal deliberations. Budgets, annual reports, and summaries can usually be public.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 100,
      admin: { position: 'sidebar' },
    },
  ],
}
