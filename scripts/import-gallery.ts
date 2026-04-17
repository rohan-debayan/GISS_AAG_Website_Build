/**
 * Upload processed AAG 2026 gallery photos to Payload.
 *
 * Reads site/../migration/gallery_processed/NNN.jpg (produced by
 * migration/prep_gallery.py) and, for each image:
 *   1. creates a Media doc (if a media doc with the same filename
 *      doesn't already exist),
 *   2. creates a Gallery item linking to that Media doc with
 *      album = "AAG 2026 San Francisco" and sortOrder from the
 *      filename number.
 *
 * Idempotent; re-running skips files that already have a Gallery entry.
 *
 * Run:
 *     npx tsx scripts/import-gallery.ts
 *     npx tsx scripts/import-gallery.ts --dry-run
 */
import 'dotenv/config'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'
import config from '../src/payload.config'

const here = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(here, '..', '..', 'migration', 'gallery_processed')
const ALBUM = 'AAG 2026 San Francisco'

const dryRun = process.argv.includes('--dry-run')

async function main() {
  console.log(`\n=== Gallery import ${dryRun ? '(DRY RUN)' : ''}\n`)
  const payload = await getPayload({ config: await config })

  const entries = (await readdir(SRC))
    .filter((f) => f.toLowerCase().endsWith('.jpg'))
    .sort()

  console.log(`Found ${entries.length} processed images in ${SRC}\n`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const filename of entries) {
    const idx = parseInt(filename.replace(/\D/g, ''), 10) || 999
    const localPath = path.join(SRC, filename)

    // De-dupe by media filename.
    const existingMedia = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
    })

    let mediaId: number | null = null
    if (existingMedia.docs.length) {
      mediaId = existingMedia.docs[0].id as number
    } else if (dryRun) {
      console.log(`  would upload: ${filename}`)
      created++
      continue
    } else {
      try {
        const buf = await readFile(localPath)
        const media = await payload.create({
          collection: 'media',
          data: {
            alt: `AAG 2026 photograph ${idx}`,
          },
          file: {
            data: buf,
            mimetype: 'image/jpeg',
            name: filename,
            size: buf.length,
          },
        })
        mediaId = media.id as number
      } catch (e) {
        errors++
        console.log(`  ERR media ${filename}: ${e}`)
        continue
      }
    }

    // Check if a Gallery entry already references this media id.
    const existingGallery = await payload.find({
      collection: 'gallery',
      where: { image: { equals: mediaId } },
      limit: 1,
    })
    if (existingGallery.docs.length) {
      skipped++
      continue
    }
    if (dryRun) {
      console.log(`  would add gallery item -> ${filename}`)
      continue
    }

    try {
      await payload.create({
        collection: 'gallery',
        data: {
          image: mediaId,
          album: ALBUM,
          sortOrder: idx,
        },
      })
      created++
      if (created % 10 === 0) {
        console.log(`  progress: ${created} added`)
      }
    } catch (e) {
      errors++
      console.log(`  ERR gallery ${filename}: ${e}`)
    }
  }

  console.log(`\nSummary: created=${created}  skipped=${skipped}  errors=${errors}`)
  process.exit(errors ? 1 : 0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
