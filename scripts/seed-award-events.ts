/**
 * Seed the AwardEvents collection with the 2026 Student Honors Paper
 * Competition session details.
 *
 * Poster reuses media id 30 (already in the library:
 *   Twitter_2026_AAG_GISS_competition_flyer-scaled.jpg).
 *
 * Run: npx tsx scripts/seed-award-events.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function main() {
  const payload = await getPayload({ config: await config })

  // Locate the competition flyer in the Media library by filename.
  const { docs: flyerDocs } = await payload.find({
    collection: 'media',
    where: {
      filename: {
        equals: 'Twitter_2026_AAG_GISS_competition_flyer-scaled.jpg',
      },
    },
    limit: 1,
  })
  const posterId = flyerDocs[0]?.id as number | undefined

  const existing = await payload.find({
    collection: 'award-events',
    where: {
      and: [{ award: { equals: 'student-honors' } }, { year: { equals: 2026 } }],
    },
    limit: 1,
  })
  if (existing.docs.length) {
    console.log('2026 Student Honors event already exists, skipping')
    process.exit(0)
  }

  const created = await payload.create({
    collection: 'award-events',
    data: {
      award: 'student-honors',
      year: 2026,
      poster: posterId,
      eventDate: '2026-03-17T14:30:00-08:00',
      location:
        'Imperial B, Ballroom Level, Hilton, Tower 1, 2, 3 (San Francisco, California)',
      format: 'Hybrid (In-person, Streamed, and Recorded)',
      sessions: [
        {
          title: 'Paper Competition I',
          time: '2:30 PM \u2013 3:50 PM PST',
          presenters: [
            {
              name: 'Tao Peng',
              affiliation: 'University of Connecticut',
              paperTitle:
                'Contextual Autoencoder: A Self-Supervised Learning Framework for Spatiotemporal Interpolation under Diverse Data Coverage Patterns',
            },
            {
              name: 'Andy Qin',
              affiliation: 'The University of Texas at Austin',
              paperTitle:
                'Leveraging Reinforcement Learning for Maternity Care Resource Reallocation',
            },
            {
              name: 'Junbo Wang',
              affiliation: 'University of Tennessee',
              paperTitle: 'SounDiT: Geo-Contextual Soundscape-to-Landscape Generation',
            },
            {
              name: 'Meicheng Xiong',
              affiliation: 'University of Minnesota Twin Cities',
              paperTitle:
                'A graph-based deep population downscaling model on irregular spatial units',
            },
            {
              name: 'Qianheng Zhang',
              affiliation: 'University of Wisconsin\u2013Madison',
              paperTitle:
                'Spatial Epistemic Collapse: A Framework for Quantifying Spatial Bias in Generative GeoAI Using Street View Imagery',
            },
          ],
        },
        {
          title: 'Paper Competition II',
          time: '4:10 PM \u2013 5:30 PM PST',
          presenters: [
            {
              name: 'Qian Cao',
              affiliation: 'University of Georgia',
              paperTitle:
                'Benchmarking Generative Models for Environmental Visualization and Urban Planning Decision Support',
            },
            {
              name: 'Mahbub Ul Hasan',
              affiliation: 'Texas A&M University',
              paperTitle:
                'Global Assessment of Grasslands: Three Decades of Shifting Connectivity and Rising Fragmentation Across Regions and Scales',
            },
            {
              name: 'Yuhao Jia',
              affiliation: 'Emory University',
              paperTitle:
                'A Unified Framework for Next-Gen Urban Forecasting via LLM-driven Dependency Retrieval and GeoTransformer',
            },
            {
              name: 'Xin Jin',
              affiliation: 'The Chinese University of Hong Kong',
              paperTitle:
                'The Utility Gap in Human Mobility Modeling: Evidence from Environmental Exposure Assessment',
            },
            {
              name: 'Yifan Yang',
              affiliation: 'Texas A&M University',
              paperTitle:
                'DamageArbiter: A Disagreement-driven Arbitration Framework for Hurricane Damage Assessment from Street-View Imagery',
            },
          ],
        },
      ],
    },
  })
  console.log(`Created AwardEvent id=${created.id}: 2026 Student Honors`)
  process.exit(0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
