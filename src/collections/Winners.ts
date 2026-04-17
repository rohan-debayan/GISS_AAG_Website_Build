import type { CollectionConfig } from 'payload'
import { anyone, isAdminOrEditor } from '../access/byRole'

/**
 * Winners / recipients / distinguished speakers for the three GISS-SG awards.
 * One row per person per year. Admins add new rows each award cycle.
 *
 * - Student Honors: 1st, 2nd, 3rd place (plus optional HM, finalists)
 * - Aangeenbrug:    one Recipient per year
 * - Tobler:         one Speaker per year (the distinguished lecturer)
 */
export const Winners: CollectionConfig = {
  slug: 'winners',
  labels: { singular: 'Award Winner', plural: 'Award Winners' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'award', 'year', 'position', 'affiliation'],
    group: 'Content',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    {
      name: 'award',
      type: 'select',
      required: true,
      options: [
        { label: 'Student Honors Paper Competition', value: 'student-honors' },
        { label: 'Aangeenbrug Award', value: 'aangeenbrug' },
        { label: 'Waldo Tobler Distinguished Lecture', value: 'tobler-lecture' },
      ],
    },
    {
      name: 'year',
      type: 'number',
      required: true,
      min: 1985,
      max: 2100,
      admin: {
        description:
          'The competition year (e.g. 2026). Used to group entries and pick the latest cohort to display.',
      },
    },
    {
      name: 'position',
      type: 'select',
      required: true,
      options: [
        // Student Honors positions
        { label: '1st Place', value: 'first' },
        { label: '2nd Place', value: 'second' },
        { label: '3rd Place', value: 'third' },
        { label: 'Honorable Mention', value: 'honorable-mention' },
        { label: 'Finalist', value: 'finalist' },
        // Aangeenbrug
        { label: 'Recipient', value: 'recipient' },
        // Tobler
        { label: 'Distinguished Speaker', value: 'speaker' },
      ],
    },
    { name: 'name', type: 'text', required: true },
    {
      name: 'affiliation',
      type: 'text',
      admin: { description: 'University or institution at time of award.' },
    },
    {
      name: 'paperTitle',
      type: 'text',
      admin: {
        description:
          'Student Honors: title of the submitted paper. Tobler: title of the distinguished lecture. Leave blank for Aangeenbrug.',
      },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Headshot of the winner/recipient/speaker.' },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description:
          'Optional short bio line or citation text to display under the name.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 100,
      admin: {
        position: 'sidebar',
        description:
          'Within the same year+position, lower numbers appear first (use for ties, e.g. two people sharing 2nd place).',
      },
    },
  ],
}
