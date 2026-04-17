import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import {
  lexicalEditor,
  FixedToolbarFeature,
  InlineToolbarFeature,
  LinkFeature,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Pages } from './collections/Pages'
import { Officers } from './collections/Officers'
import { Events } from './collections/Events'
import { Newsletters } from './collections/Newsletters'
import { Jobs } from './collections/Jobs'
import { Gallery } from './collections/Gallery'
import { Winners } from './collections/Winners'
import { AwardEvents } from './collections/AwardEvents'
import { Reports } from './collections/Reports'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — GISS-SG Admin',
    },
  },
  collections: [
    // People
    Users,
    Officers,
    // Content
    Pages,
    Posts,
    Events,
    Newsletters,
    Winners,
    AwardEvents,
    Reports,
    Jobs,
    // Library
    Media,
    Gallery,
  ],
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures,
      // Always-visible toolbar above every rich-text field so headings,
      // links, lists, and image inserts are one click away.
      FixedToolbarFeature(),
      InlineToolbarFeature(),
      // LinkFeature is in defaults but make it explicit so we can add
      // external/new-tab handling later if needed.
      LinkFeature({ enabledCollections: ['pages', 'posts'] }),
    ],
  }),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
      // Railway's managed Postgres uses self-signed certs when accessed
      // over the public network. Accept them.
      ssl: process.env.DATABASE_URL?.includes('railway.app')
        ? { rejectUnauthorized: false }
        : undefined,
    },
    // Staging: let Drizzle sync the schema on boot so a fresh Railway
    // DB gets all our tables created automatically. Before going to
    // true production we'll switch to explicit migrations.
    push: true,
  }),
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: process.env.RESEND_API_KEY,
        defaultFromAddress: process.env.RESEND_FROM || 'onboarding@resend.dev',
        defaultFromName: process.env.RESEND_FROM_NAME || 'GISS-SG Specialty Group',
      })
    : undefined,
  sharp,
  plugins: [],
})
