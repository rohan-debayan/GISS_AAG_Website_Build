import type { CollectionConfig } from 'payload'
import { anyone, isAdminOrEditor } from '../access/byRole'

export const Officers: CollectionConfig = {
  slug: 'officers',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'termStart', 'termEnd', 'isCurrent'],
    group: 'People',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: [
        { label: 'Chair', value: 'chair' },
        { label: 'Vice Chair', value: 'vice-chair' },
        { label: 'Immediate Past Chair', value: 'immediate-past-chair' },
        { label: 'Past Chair', value: 'past-chair' },
        { label: 'Academic Director', value: 'academic-director' },
        { label: 'Communications Director', value: 'communication-director' },
        { label: 'Commercial Director', value: 'commercial-director' },
        { label: 'Government Director', value: 'government-director' },
        { label: 'Treasurer', value: 'treasurer' },
        { label: 'Secretary', value: 'secretary' },
        { label: 'Student Representative', value: 'student-rep' },
        { label: 'Board Member', value: 'board-member' },
        { label: 'Past Officer', value: 'past-officer' },
      ],
    },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    { name: 'affiliation', type: 'text' },
    {
      name: 'bio',
      type: 'richText',
    },
    { name: 'email', type: 'text' },
    {
      name: 'links',
      type: 'group',
      fields: [
        { name: 'website', type: 'text' },
        { name: 'twitter', type: 'text', label: 'X / Twitter' },
        { name: 'linkedin', type: 'text', label: 'LinkedIn' },
        { name: 'googleScholar', type: 'text', label: 'Google Scholar' },
        { name: 'orcid', type: 'text', label: 'ORCID' },
      ],
    },
    {
      name: 'termStart',
      type: 'date',
      admin: { date: { pickerAppearance: 'monthOnly' }, position: 'sidebar' },
    },
    {
      name: 'termEnd',
      type: 'date',
      admin: { date: { pickerAppearance: 'monthOnly' }, position: 'sidebar' },
    },
    {
      name: 'isCurrent',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Show on the current Officers page. Uncheck when term ends.',
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
