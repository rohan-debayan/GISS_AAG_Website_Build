import type { CollectionConfig } from 'payload'
import { anyone, isAdminOrEditor } from '../access/byRole'

export const Jobs: CollectionConfig = {
  slug: 'jobs',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'organization', 'deadline', 'status'],
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
    { name: 'organization', type: 'text', required: true },
    {
      name: 'location',
      type: 'text',
      admin: { description: 'e.g. "Toronto, ON" or "Remote"' },
    },
    {
      name: 'jobType',
      type: 'select',
      options: [
        { label: 'Tenure-Track Faculty', value: 'tenure-track' },
        { label: 'Tenured Faculty', value: 'tenured' },
        { label: 'Lecturer / Instructor', value: 'lecturer' },
        { label: 'Postdoctoral', value: 'postdoc' },
        { label: 'PhD Position', value: 'phd' },
        { label: 'Industry / Government', value: 'industry' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'deadline',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description: 'Application deadline, if known.',
      },
    },
    {
      name: 'applicationUrl',
      type: 'text',
      admin: { description: 'External application link.' },
    },
    {
      name: 'pdf',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional PDF flyer or full job ad.' },
    },
    {
      name: 'postedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Closed', value: 'closed' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: { position: 'sidebar' },
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
      },
    },
  ],
}
