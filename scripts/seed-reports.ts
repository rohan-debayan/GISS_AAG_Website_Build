/**
 * Seed the Reports collection from existing business-meeting documents
 * already in the Media library. Idempotent — matches on (year + kind).
 *
 * Defaults:
 *   - Minutes -> visibility 'officers' (internal deliberations)
 *   - Budget, Presentation -> 'public' (numbers and slides are sharable)
 *
 * Run: npx tsx scripts/seed-reports.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

interface Seed {
  filename: string
  title: string
  year: number
  kind: 'minutes' | 'presentation' | 'budget' | 'annual-report' | 'other'
  visibility: 'public' | 'officers'
  summary?: string
  sortOrder?: number
}

const SEEDS: Seed[] = [
  {
    filename: '2015-BusinessMeeting-Presentation.pptx',
    title: '2015 Business Meeting Presentation',
    year: 2015,
    kind: 'presentation',
    visibility: 'public',
  },
  {
    filename: '2015-BusinessMeeting-minutes.docx',
    title: '2015 Business Meeting Minutes',
    year: 2015,
    kind: 'minutes',
    visibility: 'officers',
    summary: 'Notes from the 2015 AAG Business Meeting session.',
  },
  {
    filename: '2014-BusinessMeetingPresentation.pptx',
    title: '2014 Business Meeting Presentation',
    year: 2014,
    kind: 'presentation',
    visibility: 'public',
  },
  {
    filename: '2014-BusinessMeeting-Minutes.docx',
    title: '2014 Business Meeting Minutes',
    year: 2014,
    kind: 'minutes',
    visibility: 'officers',
    summary: 'Notes from the 2014 AAG Business Meeting session.',
  },
  {
    filename: '2013-Minutes.docx',
    title: '2013 Business Meeting Minutes',
    year: 2013,
    kind: 'minutes',
    visibility: 'officers',
  },
  {
    filename: '2012-2014-Budget.xlsx',
    title: 'GISS-SG Budget, 2012\u20132014',
    year: 2014,
    kind: 'budget',
    visibility: 'public',
    sortOrder: 200,
  },
]

async function main() {
  const payload = await getPayload({ config: await config })

  let created = 0
  let skipped = 0

  for (const seed of SEEDS) {
    // Find the Media doc by filename
    const { docs: mediaDocs } = await payload.find({
      collection: 'media',
      where: { filename: { equals: seed.filename } },
      limit: 1,
    })
    const mediaId = (mediaDocs[0] as any)?.id as number | undefined
    if (!mediaId) {
      console.log(`  skip "${seed.title}": Media filename '${seed.filename}' not found`)
      continue
    }

    // De-dupe on year + kind + title (minor variants shouldn't duplicate).
    const existing = await payload.find({
      collection: 'reports',
      where: {
        and: [
          { year: { equals: seed.year } },
          { kind: { equals: seed.kind } },
          { title: { equals: seed.title } },
        ],
      },
      limit: 1,
    })
    if (existing.docs.length) {
      skipped++
      continue
    }

    await payload.create({
      collection: 'reports',
      data: {
        title: seed.title,
        year: seed.year,
        kind: seed.kind,
        visibility: seed.visibility,
        file: mediaId,
        summary: seed.summary,
        sortOrder: seed.sortOrder ?? 100,
      },
    })
    created++
    console.log(
      `  + ${seed.year} ${seed.kind.padEnd(13)} ${seed.visibility.padEnd(8)} ${seed.title}`,
    )
  }

  console.log(`\nCreated: ${created}  Skipped: ${skipped}`)
  process.exit(0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
