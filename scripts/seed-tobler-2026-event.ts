/**
 * Seed the 2026 Waldo Tobler Distinguished Lecture event (AwardEvent +
 * Winners entries for the two speakers), and enrich past Tobler speakers
 * + past Aangeenbrug recipients with their current professional titles.
 *
 * Idempotent: each Winners row is matched on (award, year, name);
 * the 2026 AwardEvent is matched on (award, year).
 *
 * Run: npx tsx scripts/seed-tobler-2026-event.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

// 2026 Tobler speakers (both appear as current-year winners).
const TOBLER_2026: Array<{
  name: string
  affiliation: string
  paperTitle: string
  sortOrder: number
}> = [
  {
    name: 'Dr. Peter Kedron',
    affiliation: 'Associate Professor of Geography, University of California, Santa Barbara',
    paperTitle: 'New Directions in Geographic Research on Replication',
    sortOrder: 1,
  },
  {
    name: 'Dr. Shawn Newsam',
    affiliation: 'Professor, School of Engineering (EECS), University of California, Merced',
    paperTitle: 'Over 25 years of GeoAI: From the Alexandria Digital Library Project to Now',
    sortOrder: 2,
  },
]

// Enriched affiliations for past Tobler speakers (current public title +
// institution as of April 2026). Keyed on (year, name). Where a speaker
// is not listed here, the existing affiliation is preserved.
const TOBLER_PAST_POSITIONS: Record<string, string> = {
  '2025|Dr. Kathleen Stewart':
    'Professor of Geographical Sciences, University of Maryland, College Park',
  '2025|Dr. Song Gao':
    'Associate Professor of Geography, University of Wisconsin\u2013Madison',
  '2024|Dr. A-Xing Zhu':
    'Vilas Distinguished Achievement Professor of Geography, University of Wisconsin\u2013Madison',
  '2024|Dr. Yao-Yi Chiang':
    'Associate Professor of Computer Science, University of Minnesota\u2013Twin Cities',
  '2023|Dr. Shaowen Wang':
    'Professor of Geography, Director of CyberGIS Center, University of Illinois Urbana-Champaign',
  '2023|Dr. Christopher Lippitt':
    'Professor of Geography, University of New Mexico',
  '2022|Dr. Trisalyn Nelson':
    'Jack and Laura Dangermond Chair in Geography, University of California, Santa Barbara',
  '2022|Dr. Clio Andris':
    'Associate Professor of City and Regional Planning, Georgia Institute of Technology',
  '2021|Dr. Robert Roth':
    'Professor of Geography, University of Wisconsin, Madison',
  '2021|Dr. Elizabeth Delmelle':
    'Professor of Geography, Washington University in St. Louis',
  '2019|Dr. Keith Clarke':
    'Distinguished Professor of Geography, University of California, Santa Barbara',
  '2018|Dr. May Yuan':
    'Ashbel Smith Professor of Geospatial Information Sciences, The University of Texas at Dallas',
  '2017|Dr. Arthur Getis':
    'Distinguished Emeritus Professor of Geography, San Diego State University',
  '2016|Dr. Alan MacEachren':
    'Emeritus Professor of Geography, The Pennsylvania State University',
  '2015|Dr. Elizabeth Wentz':
    'Dean of Graduate Education and Professor of Geographical Sciences, Arizona State University',
  '2014|Dr. Matt Duckham':
    'Professor of Geospatial Science, RMIT University',
  '2013|Dr. Dawn Wright':
    'Chief Scientist, Environmental Systems Research Institute (Esri)',
  '2012|Dr. Andrew Frank and Dr. Nick Chrisman':
    'Emeritus Professor, TU Wien / Emeritus Professor, Universit\u00e9 Laval',
  '2011|Dr. Richard J. Aspinall':
    'Independent Scholar; formerly James Hutton Institute (Macaulay)',
  '2010|Dr. Andr\u00e9 Skupin':
    'Professor of Geography, San Diego State University',
  '2009|Dr. David M. Mark':
    'SUNY Distinguished Professor Emeritus of Geography, University at Buffalo (1947\u20132023)',
  '2008|Dr. Marc P. Armstrong':
    'Emeritus Professor of Geographical and Sustainability Sciences, University of Iowa',
}

// Prefixes already in Aangeenbrug affiliations are complete, but we
// swap a couple where current institution or title changed.
const AANGEENBRUG_POSITIONS: Record<string, string> = {
  '2008|Dr. Arthur Getis':
    'Distinguished Emeritus Professor of Geography, San Diego State University',
}

async function main() {
  const payload = await getPayload({ config: await config })

  // --- 2026 AwardEvent for Tobler ---
  const existingEvent = await payload.find({
    collection: 'award-events',
    where: { and: [{ award: { equals: 'tobler-lecture' } }, { year: { equals: 2026 } }] },
    limit: 1,
  })
  if (!existingEvent.docs.length) {
    // Find the Tobler flyer media by filename.
    const { docs: flyerDocs } = await payload.find({
      collection: 'media',
      where: {
        filename: { equals: 'Twitter_2026_AAG_GISS_Tobler-flyer_v1.jpg' },
      },
      limit: 1,
    })
    const posterId = flyerDocs[0]?.id as number | undefined
    const created = await payload.create({
      collection: 'award-events',
      data: {
        award: 'tobler-lecture',
        year: 2026,
        poster: posterId,
        eventDate: '2026-03-18T14:30:00-08:00',
        location:
          'Imperial B, Ballroom Level, Hilton, Tower 1, 2, 3, San Francisco, California',
        format: 'In-person (Streamed and Recorded for virtual attendees)',
        sessions: [
          {
            title: 'Distinguished Lecture',
            time: '2:30 PM \u2013 3:50 PM PST',
            presenters: TOBLER_2026.map((s) => ({
              name: s.name,
              affiliation: s.affiliation,
              paperTitle: s.paperTitle,
            })),
          },
        ],
      },
    })
    console.log(`Created 2026 Tobler AwardEvent id=${created.id}`)
  } else {
    console.log('2026 Tobler AwardEvent already exists')
  }

  // --- Winners: 2026 Tobler speakers (hero card) ---
  for (const s of TOBLER_2026) {
    const existing = await payload.find({
      collection: 'winners',
      where: {
        and: [
          { award: { equals: 'tobler-lecture' } },
          { year: { equals: 2026 } },
          { name: { equals: s.name } },
        ],
      },
      limit: 1,
    })
    if (existing.docs.length) continue
    await payload.create({
      collection: 'winners',
      data: {
        award: 'tobler-lecture',
        year: 2026,
        position: 'speaker',
        name: s.name,
        affiliation: s.affiliation,
        paperTitle: s.paperTitle,
        sortOrder: s.sortOrder,
      },
    })
    console.log(`Added 2026 Tobler winner: ${s.name}`)
  }

  // --- Enrich past Tobler speakers' affiliations ---
  for (const [key, fullTitle] of Object.entries(TOBLER_PAST_POSITIONS)) {
    const [yearStr, name] = key.split('|')
    const year = parseInt(yearStr, 10)
    const { docs } = await payload.find({
      collection: 'winners',
      where: {
        and: [
          { award: { equals: 'tobler-lecture' } },
          { year: { equals: year } },
          { name: { equals: name } },
        ],
      },
      limit: 1,
    })
    const doc = docs[0] as any
    if (!doc) continue
    if (doc.affiliation === fullTitle) continue
    await payload.update({
      collection: 'winners',
      id: doc.id,
      data: { affiliation: fullTitle },
    })
    console.log(`  Tobler ${year} ${name}: affiliation updated`)
  }

  // --- Enrich Aangeenbrug recipients where a current role was inferred ---
  for (const [key, fullTitle] of Object.entries(AANGEENBRUG_POSITIONS)) {
    const [yearStr, name] = key.split('|')
    const year = parseInt(yearStr, 10)
    const { docs } = await payload.find({
      collection: 'winners',
      where: {
        and: [
          { award: { equals: 'aangeenbrug' } },
          { year: { equals: year } },
          { name: { equals: name } },
        ],
      },
      limit: 1,
    })
    const doc = docs[0] as any
    if (!doc) continue
    await payload.update({
      collection: 'winners',
      id: doc.id,
      data: { affiliation: fullTitle },
    })
    console.log(`  Aangeenbrug ${year} ${name}: affiliation updated`)
  }

  console.log('\nDone.')
  process.exit(0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
