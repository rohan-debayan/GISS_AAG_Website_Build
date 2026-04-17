/**
 * Import officers (current + past chairs) into Payload's Officers
 * collection from ../../migration/content/officers.json.
 *
 * Run:
 *     npx tsx scripts/import-officers.ts
 *     npx tsx scripts/import-officers.ts --dry-run
 *     npx tsx scripts/import-officers.ts --skip-past   (only current officers)
 *
 * Idempotent by (name, role_slug) pair: re-running will skip existing
 * records rather than duplicating them.
 */
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'
import config from '../src/payload.config'

const here = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(here, '..', '..', 'migration', 'content', 'officers.json')

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const skipPast = argv.includes('--skip-past')

interface CurrentOfficer {
  role_label: string
  role_slug: string
  name: string
  title: string
  affiliation: string
  email: string | null
  sort_order: number
}

interface PastChair {
  role_label: string
  role_slug: string
  name: string
  term_start: string
  term_end: string
}

async function main() {
  console.log(
    `\n=== Officer import ${dryRun ? '(DRY RUN)' : ''} ${
      skipPast ? '(current only)' : ''
    }\n`,
  )

  const payload = await getPayload({ config: await config })
  const data = JSON.parse(await readFile(SRC, 'utf-8')) as {
    current: CurrentOfficer[]
    past_chairs: PastChair[]
  }

  let createdCurrent = 0
  let skippedCurrent = 0
  console.log('--- Current officers ---')
  for (const o of data.current) {
    // De-dupe on (name + role_slug).
    const existing = await payload.find({
      collection: 'officers',
      where: {
        and: [{ name: { equals: o.name } }, { role: { equals: o.role_slug } }],
      },
      limit: 1,
    })
    if (existing.docs.length) {
      skippedCurrent++
      console.log(`  skip: ${o.name} (${o.role_slug})`)
      continue
    }
    if (dryRun) {
      createdCurrent++
      console.log(`  would create: ${o.name} (${o.role_slug})  ${o.email || ''}`)
      continue
    }
    try {
      const affiliationLine = [o.title, o.affiliation]
        .filter(Boolean)
        .join(', ')
      const created = await payload.create({
        collection: 'officers',
        data: {
          name: o.name,
          role: o.role_slug as any,
          affiliation: affiliationLine,
          email: o.email || undefined,
          isCurrent: true,
          sortOrder: o.sort_order,
        },
      })
      createdCurrent++
      console.log(`  create: ${o.name} (${o.role_slug}) id=${created.id}`)
    } catch (e) {
      console.log(`  ERR : ${o.name}  ${e}`)
    }
  }

  let createdPast = 0
  let skippedPast = 0
  if (!skipPast) {
    console.log('\n--- Past chairs ---')
    for (const p of data.past_chairs) {
      const existing = await payload.find({
        collection: 'officers',
        where: {
          and: [
            { name: { equals: p.name } },
            { role: { equals: 'past-chair' } },
            { termStart: { equals: p.term_start } },
          ],
        },
        limit: 1,
      })
      if (existing.docs.length) {
        skippedPast++
        continue
      }
      if (dryRun) {
        createdPast++
        console.log(`  would create: ${p.name} (${p.term_start.slice(0, 4)}:${p.term_end.slice(0, 4)})`)
        continue
      }
      try {
        const created = await payload.create({
          collection: 'officers',
          data: {
            name: p.name,
            role: 'past-chair' as any,
            affiliation: '',
            isCurrent: false,
            termStart: p.term_start,
            termEnd: p.term_end,
            sortOrder: 100 + parseInt(p.term_start.slice(0, 4), 10),
          },
        })
        createdPast++
        console.log(
          `  create: ${p.name} (${p.term_start.slice(0, 4)}:${p.term_end.slice(0, 4)}) id=${created.id}`,
        )
      } catch (e) {
        console.log(`  ERR : ${p.name}  ${e}`)
      }
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Current: created=${createdCurrent}  skipped=${skippedCurrent}`)
  if (!skipPast) {
    console.log(`Past:    created=${createdPast}  skipped=${skippedPast}`)
  }

  process.exit(0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
