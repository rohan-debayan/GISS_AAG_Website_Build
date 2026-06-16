/**
 * After media is re-uploaded to Railway, recreate the structural links:
 *   - rebuild the Gallery collection from /001.jpg... 101.jpg in Media
 *   - set officer.photo based on known filename patterns per officer
 *   - set winner.photo if their photo filename hints at their name
 *   - create Reports entries for the business-meeting docs that exist as Media
 *   - create the 2025 Newsletter entry if not present
 *
 * Uses direct Postgres; no REST needed for these table writes.
 */
import 'dotenv/config'
import { Client } from 'pg'

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()

async function q<T extends Record<string, any> = any>(
  sql: string,
  params: any[] = [],
) {
  return (await c.query<T>(sql, params)).rows
}

// --- helpers ---
async function findMediaId(filename: string): Promise<number | null> {
  // Prefer the un-suffixed (NNN.jpg) over (NNN-1.jpg) in case of duplicates.
  const rows = await q<{ id: number; filename: string }>(
    `SELECT id, filename FROM media WHERE filename = $1 ORDER BY id LIMIT 1`,
    [filename],
  )
  return rows[0]?.id ?? null
}

async function findMediaIdByLike(pattern: string): Promise<number | null> {
  const rows = await q<{ id: number }>(
    `SELECT id FROM media WHERE filename ILIKE $1 ORDER BY id LIMIT 1`,
    [pattern],
  )
  return rows[0]?.id ?? null
}

// --- 1. Rebuild Gallery (001.jpg ... 101.jpg, album "AAG 2026 San Francisco") ---
console.log('\n--- Gallery ---')
const existingGallery = await q<{ c: string }>(`SELECT COUNT(*) c FROM gallery`)
if (Number(existingGallery[0].c) === 0) {
  let created = 0
  for (let i = 1; i <= 101; i++) {
    const pad = String(i).padStart(3, '0')
    const filename = `${pad}.jpg`
    const mediaId = await findMediaId(filename)
    if (!mediaId) {
      console.log(`  miss ${filename}`)
      continue
    }
    await q(
      `INSERT INTO gallery (image_id, album, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [mediaId, 'AAG 2026 San Francisco', i],
    )
    created++
  }
  console.log(`  created ${created}/101 gallery rows`)
} else {
  console.log(`  already has ${existingGallery[0].c} rows, skipping`)
}

// --- 2. Officer photos ---
console.log('\n--- Officer photos ---')
const officerPhotos: Array<{ name: string; filenameLike: string }> = [
  { name: 'Debayan Mandal', filenameLike: 'Mandal_Debayan%.jpg' },
  { name: 'Lei Zou', filenameLike: 'Lei_Zou%' },
  { name: 'Gengchen Mai', filenameLike: 'Gengchen_Mai%' },
  { name: 'Yingjie Hu', filenameLike: 'Yingjie_UCSB%' },
  { name: 'Samantha T. Arundel', filenameLike: 'Prof_photo_small%' },
  { name: 'Zeping Liu', filenameLike: 'Zeping-Liu%' },
  { name: 'Siqin (Sisi) Wang', filenameLike: 'Sisi-Wang%' },
]
for (const op of officerPhotos) {
  const mediaId = await findMediaIdByLike(op.filenameLike)
  if (!mediaId) {
    console.log(`  no media match for ${op.name} (${op.filenameLike})`)
    continue
  }
  const r = await c.query(
    `UPDATE officers SET photo_id = $1 WHERE name = $2 AND is_current = true`,
    [mediaId, op.name],
  )
  console.log(`  ${op.name}: photo_id=${mediaId} (${r.rowCount} row(s) updated)`)
}

// --- 3. Reports (6 business-meeting docs) ---
console.log('\n--- Reports ---')
const reports: Array<{
  title: string
  year: number
  kind: 'minutes' | 'presentation' | 'budget'
  visibility: 'public' | 'officers'
  filename: string
}> = [
  { title: '2015 Business Meeting Presentation', year: 2015, kind: 'presentation', visibility: 'public', filename: '2015-BusinessMeeting-Presentation.pptx' },
  { title: '2015 Business Meeting Minutes', year: 2015, kind: 'minutes', visibility: 'officers', filename: '2015-BusinessMeeting-minutes.docx' },
  { title: '2014 Business Meeting Presentation', year: 2014, kind: 'presentation', visibility: 'public', filename: '2014-BusinessMeetingPresentation.pptx' },
  { title: '2014 Business Meeting Minutes', year: 2014, kind: 'minutes', visibility: 'officers', filename: '2014-BusinessMeeting-Minutes.docx' },
  { title: '2013 Business Meeting Minutes', year: 2013, kind: 'minutes', visibility: 'officers', filename: '2013-Minutes.docx' },
  { title: 'GISS-SG Budget, 2012\u20132014', year: 2014, kind: 'budget', visibility: 'public', filename: '2012-2014-Budget.xlsx' },
]
for (const r of reports) {
  const mediaId = await findMediaId(r.filename)
  if (!mediaId) {
    console.log(`  no media for ${r.filename}`)
    continue
  }
  const exists = await q<{ id: number }>(
    `SELECT id FROM reports WHERE title = $1`,
    [r.title],
  )
  if (exists.length) {
    await c.query(`UPDATE reports SET file_id = $1 WHERE title = $2`, [mediaId, r.title])
    console.log(`  ${r.title}: updated file_id=${mediaId}`)
  } else {
    await c.query(
      `INSERT INTO reports (title, year, kind, visibility, file_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [r.title, r.year, r.kind, r.visibility, mediaId],
    )
    console.log(`  ${r.title}: created`)
  }
}

// --- 4. Newsletter (2025 inaugural) ---
console.log('\n--- Newsletter ---')
const nlExists = await q<{ id: number }>(
  `SELECT id FROM newsletters WHERE title LIKE 'First Newsletter%'`,
)
if (nlExists.length === 0) {
  const mediaId = await findMediaIdByLike('GISS_newsletter_2025%')
  if (!mediaId) {
    console.log('  no GISS_newsletter_2025.pdf in Media library yet')
  } else {
    await c.query(
      `INSERT INTO newsletters (title, issue_number, issue_date, pdf_id, summary, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [
        'First Newsletter of the GISS Specialty Group',
        '2025',
        '2025-09-01',
        mediaId,
        'The inaugural issue of the GISS-SG newsletter features a welcome note from Chair Dr. Lei Zou, highlights of AAG 2025 activities, community spotlights, and ways to get involved.',
      ],
    )
    console.log(`  created newsletter with pdf_id=${mediaId}`)
  }
} else {
  console.log('  already exists')
}

// --- 5. Award event posters ---
console.log('\n--- Award event posters ---')
const studentHonorsPoster = await findMediaIdByLike('Twitter_2026_AAG_GISS_competition_flyer%')
const toblerPoster = await findMediaIdByLike('Twitter_2026_AAG_GISS_Tobler%')
if (studentHonorsPoster) {
  const r = await c.query(
    `UPDATE award_events SET poster_id = $1 WHERE award = 'student-honors' AND year = 2026`,
    [studentHonorsPoster],
  )
  console.log(`  Student Honors 2026 poster: ${studentHonorsPoster} (${r.rowCount} row(s))`)
}
if (toblerPoster) {
  const r = await c.query(
    `UPDATE award_events SET poster_id = $1 WHERE award = 'tobler-lecture' AND year = 2026`,
    [toblerPoster],
  )
  console.log(`  Tobler 2026 poster: ${toblerPoster} (${r.rowCount} row(s))`)
}

await c.end()
console.log('\nDone.')
process.exit(0)
