/**
 * Enrich the Officers collection with public bios and portrait photos
 * from each person's faculty / institutional page.
 *
 * Skips officers who already have a photo set (so user-uploaded photos
 * are preserved). Skips officers who already have a bio.
 *
 * Run:
 *     npx tsx scripts/enrich-officers.ts
 *     npx tsx scripts/enrich-officers.ts --dry-run
 */
import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFile } from 'node:fs/promises'

import { getPayload } from 'payload'
import { JSDOM } from 'jsdom'
import { convertHTMLToLexical } from '@payloadcms/richtext-lexical'

import config from '../src/payload.config'

const here = path.dirname(fileURLToPath(import.meta.url))
const dryRun = process.argv.includes('--dry-run')

interface Enrichment {
  name: string
  photoUrl: string | null
  bioHtml: string
  source: string
}

const UA =
  'GISS-SG-Migration/1.0 (https://github.com/rohan-debayan/gissaag.github.io)'

/**
 * Public-domain / institutional-page portrait URLs and bios drawn from
 * each officer's official faculty page (source URL in `source`).
 */
const ENRICHMENTS: Enrichment[] = [
  {
    name: 'Gengchen Mai',
    photoUrl:
      'https://sites.utexas.edu/seai/wp-content/uploads/sites/5884/2024/09/Gengchen_Mai-4.jpeg',
    bioHtml:
      '<p>Tenure-track Assistant Professor at the University of Texas at Austin\u2019s Department of Geography and the Environment, directing the Spatially Explicit Artificial Intelligence (SEAI) Lab. His research focuses on geographic question answering and spatially-explicit machine learning, spanning GeoAI, deep learning for remote sensing, geographic knowledge graphs, and geo-foundation models.</p>',
    source: 'https://gengchenmai.github.io/',
  },
  {
    name: 'Yingjie Hu',
    photoUrl: 'https://geoai.geog.buffalo.edu/wp-content/uploads/2019/04/Yingjie_UCSB-Copy2.jpg',
    bioHtml:
      '<p>Associate Professor and Director of Graduate Studies in the Department of Geography at the University at Buffalo, and director of the GeoAI Lab. His research centers on geographic information science, geospatial artificial intelligence, and their application to natural hazards and disaster management.</p>',
    source: 'https://www.buffalo.edu/cas/geography/faculty/faculty_directory/yingjie-hu.html',
  },
  {
    name: 'Siqin (Sisi) Wang',
    photoUrl: null,
    bioHtml:
      '<p>Associate Professor (Teaching) of Spatial Sciences at USC\u2019s Dornsife College. Her work spans GIScience, spatiotemporal big data analytics, computational social science, digital health geography, human-centered GeoAI, human mobility, and smart cities. She also serves as Associated Chair for the Spatial Data Lab at Harvard University.</p>',
    source: 'https://dornsife.usc.edu/spatial/profile/siqin-sisi-wang/',
  },
  {
    name: 'Nan Ding',
    photoUrl: null,
    bioHtml:
      '<p>Chief Product Officer at EZRouting, a transportation routing and logistics software company serving school districts nationwide. She holds a PhD in Geography from the University at Buffalo with prior graduate study in the Clark University GISDE program, and works at the intersection of GIS, cartography, urban planning, and spatial analysis.</p>',
    source: 'https://www.linkedin.com/in/nanding/',
  },
  {
    name: 'Samantha T. Arundel',
    photoUrl:
      'https://d9-wret.s3.us-west-2.amazonaws.com/assets/palladium/production/s3fs-public/styles/staff_profile/public/thumbnails/image/Prof_photo_small.jpg',
    bioHtml:
      '<p>Research Geographer at the U.S. Geological Survey, Director of the Center of Excellence for Geospatial Information Science (CEGIS), and Senior Science Advisor to the USGS National Geospatial Program. Her research focuses on GeoAI for automated terrain and map-feature extraction, and on building the Intelligent National Map (INM) using coordinated agents and authoritative USGS datasets.</p>',
    source: 'https://www.usgs.gov/staff-profiles/samantha-t-arundel',
  },
  {
    name: 'Zeping Liu',
    photoUrl:
      'https://sites.utexas.edu/seai/wp-content/uploads/sites/5884/2024/09/Zeping-Liu.jpg',
    bioHtml:
      '<p>Doctoral student in the Department of Geography and the Environment at the University of Texas at Austin, working with Dr. Gengchen Mai in the SEAI Lab. His research focuses on geospatial AI, geo-foundation models, spatial representation learning, and remote sensing. He is a 2025 Amazon AI PhD Fellow and won First Prize at the 2024 UT GIS Day Poster Competition.</p>',
    source: 'https://liberalarts.utexas.edu/geography/faculty/zl22853',
  },
]

async function downloadImage(url: string): Promise<{ buf: Buffer; mime: string; name: string }> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const mime = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg'
  // Derive a filename from the URL path.
  const parsed = new URL(url)
  const base = path.basename(parsed.pathname) || 'photo.jpg'
  // Sanitize
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, '_')
  return { buf, mime, name: clean }
}

async function bioToLexical(html: string): Promise<any> {
  const cfg = await config
  const editorConfig =
    cfg.editor && 'editorConfig' in cfg.editor ? await cfg.editor.editorConfig : undefined
  if (!editorConfig) throw new Error('editorConfig not resolvable')
  return convertHTMLToLexical({ editorConfig, html, JSDOM })
}

async function main() {
  console.log(`\n=== Officer enrichment ${dryRun ? '(DRY RUN)' : ''}\n`)
  const payload = await getPayload({ config: await config })

  for (const e of ENRICHMENTS) {
    const { docs } = await payload.find({
      collection: 'officers',
      where: { and: [{ name: { equals: e.name } }, { isCurrent: { equals: true } }] },
      limit: 1,
      depth: 1,
    })
    const officer = docs[0] as any
    if (!officer) {
      console.log(`  skip: ${e.name} not found in officers`)
      continue
    }

    const hasPhoto = officer.photo && (typeof officer.photo === 'object' || typeof officer.photo === 'number')
    const hasBio =
      officer.bio &&
      typeof officer.bio === 'object' &&
      officer.bio.root?.children?.some((c: any) => (c.children || []).length > 0)

    const updates: Record<string, unknown> = {}
    let actions: string[] = []

    // --- Bio
    if (hasBio) {
      actions.push('bio exists')
    } else {
      const bioLex = await bioToLexical(e.bioHtml)
      if (!dryRun) updates.bio = bioLex
      actions.push('set bio')
    }

    // --- Photo
    if (hasPhoto) {
      actions.push('photo exists')
    } else if (e.photoUrl) {
      if (dryRun) {
        actions.push(`would fetch photo ${e.photoUrl}`)
      } else {
        try {
          const img = await downloadImage(e.photoUrl)
          const media = await payload.create({
            collection: 'media',
            data: {
              alt: `Portrait of ${e.name}`,
              credit: `Source: ${e.source}`,
            },
            file: { data: img.buf, mimetype: img.mime, name: img.name, size: img.buf.length },
          })
          updates.photo = media.id
          actions.push(`uploaded photo (media id=${media.id})`)
        } catch (err) {
          actions.push(`photo fetch failed: ${err}`)
        }
      }
    } else {
      actions.push('no photo source (initials fallback will show)')
    }

    if (Object.keys(updates).length > 0 && !dryRun) {
      await payload.update({
        collection: 'officers',
        id: officer.id,
        data: updates,
      })
    }
    console.log(`  ${e.name}: ${actions.join(' | ')}`)
  }

  console.log('\nDone.')
  process.exit(0)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
