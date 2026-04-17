/**
 * Seed the Winners collection with past Aangeenbrug Award recipients
 * and past Waldo Tobler Distinguished Lecture speakers.
 *
 * Data drawn from the original aag-giss.org awards pages; no photos
 * attached (admins can upload headshots later via the admin panel).
 *
 * Idempotent: re-running this script will skip any row that already
 * exists (matched on award + year + name).
 *
 * Run:
 *     npx tsx scripts/seed-winners.ts
 *     npx tsx scripts/seed-winners.ts --dry-run
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const dryRun = process.argv.includes('--dry-run')

interface Seed {
  award: 'aangeenbrug' | 'tobler-lecture' | 'student-honors'
  year: number
  position: 'recipient' | 'speaker' | 'first' | 'second' | 'third'
  name: string
  affiliation?: string
  paperTitle?: string
  sortOrder?: number
}

/** Aangeenbrug Distinguished Career Award, 2005 onwards. */
const AANGEENBRUG: Seed[] = [
  { award: 'aangeenbrug', year: 2015, position: 'recipient', name: 'Dr. Timothy Nyerges', affiliation: 'Professor of Geography, University of Washington' },
  { award: 'aangeenbrug', year: 2014, position: 'recipient', name: 'Dr. Gerard Rushton', affiliation: 'Emeritus Professor of Geography, University of Iowa' },
  { award: 'aangeenbrug', year: 2013, position: 'recipient', name: 'Dr. David Mark', affiliation: 'Professor of Geography, University at Buffalo, SUNY' },
  { award: 'aangeenbrug', year: 2012, position: 'recipient', name: 'Dr. David Cowen', affiliation: 'Professor of Geography, University of South Carolina' },
  { award: 'aangeenbrug', year: 2011, position: 'recipient', name: 'Dr. Donna Peuquet', affiliation: 'Professor of Geography, Pennsylvania State University' },
  { award: 'aangeenbrug', year: 2010, position: 'recipient', name: 'Dr. J. Ronald Eastman', affiliation: 'Professor of Geography, Clark University' },
  { award: 'aangeenbrug', year: 2009, position: 'recipient', name: 'Dr. Jerome Dobson', affiliation: 'Professor of Geography, University of Kansas' },
  { award: 'aangeenbrug', year: 2008, position: 'recipient', name: 'Dr. Arthur Getis', affiliation: 'Emeritus Professor of Geography, San Diego State University' },
  { award: 'aangeenbrug', year: 2007, position: 'recipient', name: 'Dr. Duane Marble', affiliation: 'Emeritus Professor of Geography, The Ohio State University' },
  { award: 'aangeenbrug', year: 2006, position: 'recipient', name: 'Dr. Michael F. Goodchild', affiliation: 'Emeritus Professor of Geography, University of California, Santa Barbara' },
  { award: 'aangeenbrug', year: 2005, position: 'recipient', name: 'Dr. Roger Tomlinson', affiliation: 'Fellow of the Royal Geographical Society' },
]

/** Waldo Tobler Distinguished Lecture in GIScience, 2008 onwards. */
const TOBLER: Seed[] = [
  { award: 'tobler-lecture', year: 2025, position: 'speaker', name: 'Dr. Kathleen Stewart', affiliation: 'University of Maryland \u2013 College Park', sortOrder: 1 },
  { award: 'tobler-lecture', year: 2025, position: 'speaker', name: 'Dr. Song Gao', affiliation: 'University of Wisconsin-Madison', sortOrder: 2 },
  { award: 'tobler-lecture', year: 2024, position: 'speaker', name: 'Dr. A-Xing Zhu', affiliation: 'University of Wisconsin-Madison', sortOrder: 1 },
  { award: 'tobler-lecture', year: 2024, position: 'speaker', name: 'Dr. Yao-Yi Chiang', affiliation: 'University of Minnesota-Twin Cities', sortOrder: 2 },
  { award: 'tobler-lecture', year: 2023, position: 'speaker', name: 'Dr. Shaowen Wang', affiliation: 'University of Illinois Urbana-Champaign', sortOrder: 1 },
  { award: 'tobler-lecture', year: 2023, position: 'speaker', name: 'Dr. Christopher Lippitt', affiliation: 'University of New Mexico', sortOrder: 2 },
  { award: 'tobler-lecture', year: 2022, position: 'speaker', name: 'Dr. Trisalyn Nelson', affiliation: 'University of California, Santa Barbara', sortOrder: 1 },
  { award: 'tobler-lecture', year: 2022, position: 'speaker', name: 'Dr. Clio Andris', affiliation: 'Georgia Institute of Technology', sortOrder: 2 },
  { award: 'tobler-lecture', year: 2021, position: 'speaker', name: 'Dr. Robert Roth', affiliation: 'University of Wisconsin, Madison', sortOrder: 1 },
  { award: 'tobler-lecture', year: 2021, position: 'speaker', name: 'Dr. Elizabeth Delmelle', affiliation: 'University of North Carolina, Charlotte', sortOrder: 2 },
  { award: 'tobler-lecture', year: 2019, position: 'speaker', name: 'Dr. Keith Clarke', affiliation: 'University of California, Santa Barbara' },
  { award: 'tobler-lecture', year: 2018, position: 'speaker', name: 'Dr. May Yuan', affiliation: 'The University of Texas at Dallas' },
  { award: 'tobler-lecture', year: 2017, position: 'speaker', name: 'Dr. Arthur Getis', affiliation: 'San Diego State University' },
  { award: 'tobler-lecture', year: 2016, position: 'speaker', name: 'Dr. Alan MacEachren', affiliation: 'The Pennsylvania State University' },
  { award: 'tobler-lecture', year: 2015, position: 'speaker', name: 'Dr. Elizabeth Wentz', affiliation: 'Arizona State University' },
  { award: 'tobler-lecture', year: 2014, position: 'speaker', name: 'Dr. Matt Duckham', affiliation: 'University of Melbourne' },
  { award: 'tobler-lecture', year: 2013, position: 'speaker', name: 'Dr. Dawn Wright', affiliation: 'Environmental Systems Research Institute (Esri)' },
  { award: 'tobler-lecture', year: 2012, position: 'speaker', name: 'Dr. Andrew Frank and Dr. Nick Chrisman', affiliation: 'Discussant: Dr. Daniel Sui', sortOrder: 1 },
  { award: 'tobler-lecture', year: 2011, position: 'speaker', name: 'Dr. Richard J. Aspinall', affiliation: 'Macaulay Institute' },
  { award: 'tobler-lecture', year: 2010, position: 'speaker', name: 'Dr. Andr\u00e9 Skupin', affiliation: 'San Diego State University' },
  { award: 'tobler-lecture', year: 2009, position: 'speaker', name: 'Dr. David M. Mark', affiliation: 'University at Buffalo' },
  { award: 'tobler-lecture', year: 2008, position: 'speaker', name: 'Dr. Marc P. Armstrong', affiliation: 'University of Iowa' },
]

async function main() {
  console.log(`\n=== Winners seed ${dryRun ? '(DRY RUN)' : ''}\n`)
  const payload = await getPayload({ config: await config })

  let created = 0
  let skipped = 0

  for (const seed of [...AANGEENBRUG, ...TOBLER]) {
    const existing = await payload.find({
      collection: 'winners',
      where: {
        and: [
          { award: { equals: seed.award } },
          { year: { equals: seed.year } },
          { name: { equals: seed.name } },
        ],
      },
      limit: 1,
    })
    if (existing.docs.length) {
      skipped++
      continue
    }
    if (dryRun) {
      console.log(`  would add: [${seed.award}] ${seed.year} ${seed.position} - ${seed.name}`)
      created++
      continue
    }
    await payload.create({
      collection: 'winners',
      data: {
        award: seed.award,
        year: seed.year,
        position: seed.position as any,
        name: seed.name,
        affiliation: seed.affiliation,
        paperTitle: seed.paperTitle,
        sortOrder: seed.sortOrder ?? 100,
      },
    })
    created++
    console.log(`  added: [${seed.award}] ${seed.year} - ${seed.name}`)
  }

  console.log(`\nSummary: created=${created}  skipped=${skipped}`)
  process.exit(0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
