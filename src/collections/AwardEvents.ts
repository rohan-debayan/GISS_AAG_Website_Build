import type { CollectionConfig } from 'payload'
import { anyone, isAdminOrEditor } from '../access/byRole'

/**
 * One row per award + year. Captures the event-specific details for
 * each annual ceremony or competition session: poster, date, location,
 * format, and session agendas (sub-sessions with presenters).
 *
 * The /awards/<slug> page looks up the latest year's AwardEvent and
 * renders a poster-left / details-right block just above Recent
 * Announcements. If no AwardEvent exists for that award, the block is
 * hidden.
 */
export const AwardEvents: CollectionConfig = {
  slug: 'award-events',
  labels: { singular: 'Award Event', plural: 'Award Events' },
  admin: {
    useAsTitle: 'displayLabel',
    defaultColumns: ['award', 'year', 'location'],
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
      name: 'displayLabel',
      type: 'text',
      admin: {
        hidden: true,
        description: 'Internal: computed label for admin list view.',
      },
      hooks: {
        beforeChange: [
          ({ data }) => {
            const award = data?.award ?? 'award'
            const year = data?.year ?? '—'
            return `${year} ${award}`
          },
        ],
      },
    },
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
    },
    {
      name: 'poster',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Event poster / flyer. Shown at full size on the left of the award page.',
      },
    },
    {
      name: 'eventDate',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'When the event takes place.',
      },
    },
    {
      name: 'location',
      type: 'text',
      admin: {
        description:
          'e.g. "Imperial B, Ballroom Level, Hilton, Tower 1, 2, 3 (San Francisco, California)"',
      },
    },
    {
      name: 'format',
      type: 'text',
      admin: {
        description: 'e.g. "Hybrid (In-person, Streamed, and Recorded)"',
      },
    },
    {
      name: 'registrationUrl',
      type: 'text',
      admin: { description: 'Optional external registration / session link.' },
    },
    {
      name: 'sessions',
      type: 'array',
      labels: { singular: 'Session', plural: 'Sessions' },
      admin: {
        description:
          'Sub-sessions (e.g. Paper Competition I, II). Each session has a time and a table of presenters.',
      },
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'time',
          type: 'text',
          admin: { description: 'e.g. "2:30 PM – 3:50 PM PST"' },
        },
        {
          name: 'presenters',
          type: 'array',
          labels: { singular: 'Presenter', plural: 'Presenters' },
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'affiliation', type: 'text' },
            { name: 'paperTitle', type: 'textarea' },
          ],
        },
      ],
    },
  ],
}
