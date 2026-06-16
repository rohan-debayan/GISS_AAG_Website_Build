import 'dotenv/config'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

const here = path.dirname(fileURLToPath(import.meta.url))
const LOCAL_MEDIA = path.resolve(here, '..', 'media')
const BASE_URL =
  process.env.RAILWAY_URL || 'https://gissaagwebsitebuild-production.up.railway.app'

const SIZE_VARIANT = /-(\d+)x(\d+)\.(jpg|jpeg|png|webp)$/i

function mimeOf(p: string): string {
  const ext = path.extname(p).toLowerCase()
  return (
    {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    } as Record<string, string>
  )[ext] ?? 'application/octet-stream'
}

const FK_COLS: Array<[string, string]> = [
  ['officers', 'photo_id'],
  ['winners', 'photo_id'],
  ['gallery', 'image_id'],
  ['pages', 'hero_image_id'],
  ['posts', 'featured_image_id'],
  ['users', 'avatar_id'],
  ['award_events', 'poster_id'],
  ['newsletters', 'pdf_id'],
  ['newsletters', 'cover_id'],
  ['reports', 'file_id'],
]

async function login(): Promise<string> {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD required')
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { token?: string }
  if (!json.token) throw new Error('login response missing token')
  return json.token
}

async function uploadOne(
  token: string,
  filename: string,
  buf: Buffer,
): Promise<number | null> {
  const form = new FormData()
  const blob = new Blob([buf], { type: mimeOf(filename) })
  form.append('file', blob, filename)
  form.append('_payload', JSON.stringify({ alt: filename }))
  const res = await fetch(`${BASE_URL}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}` },
    body: form,
  })
  if (!res.ok) {
    const t = await res.text()
    console.log(`  FAIL ${filename}: ${res.status} ${t.slice(0, 150)}`)
    return null
  }
  const json = (await res.json()) as { doc?: { id: number } }
  return json.doc?.id ?? null
}

function collectUploadRefs(
  node: any,
  trail: any[] = [],
): Array<{ parent: any; key: string | number; oldId: number }> {
  const out: Array<{ parent: any; key: string | number; oldId: number }> = []
  if (!node || typeof node !== 'object') return out
  const kids = node.children || []
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i]
    if (c && c.type === 'upload' && typeof c.value === 'number') {
      out.push({ parent: c, key: 'value', oldId: c.value })
    }
    out.push(...collectUploadRefs(c, [...trail, node, i]))
  }
  return out
}

async function main() {
  console.log(`Logging in to ${BASE_URL}...`)
  const token = await login()
  console.log('  OK\n')

  const pg = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await pg.connect()

  const { rows: oldMedia } = await pg.query<{ id: number; filename: string }>(
    `SELECT id, filename FROM media`,
  )
  const oldIdToFilename = new Map<number, string>()
  for (const r of oldMedia) oldIdToFilename.set(r.id, r.filename)
  console.log(`Railway has ${oldMedia.length} existing (orphan) media rows.`)

  const snapshot: Array<{
    table: string
    col: string
    row_id: number
    filename: string
  }> = []
  for (const [table, col] of FK_COLS) {
    const { rows } = await pg.query<{ id: number; fk: number }>(
      `SELECT id AS id, ${col} AS fk FROM ${table} WHERE ${col} IS NOT NULL`,
    )
    for (const r of rows) {
      const filename = oldIdToFilename.get(r.fk)
      if (filename) snapshot.push({ table, col, row_id: r.id, filename })
    }
  }
  console.log(`Snapshot: ${snapshot.length} FK references recorded.`)

  const lexSnapshot: Array<{
    table: 'posts' | 'pages'
    row_id: number
    content: any
  }> = []
  for (const table of ['posts', 'pages'] as const) {
    const { rows } = await pg.query<{ id: number; content: any }>(
      `SELECT id, content FROM ${table} WHERE content IS NOT NULL`,
    )
    for (const r of rows) {
      const refs = collectUploadRefs(r.content?.root)
      if (refs.length > 0) {
        lexSnapshot.push({ table, row_id: r.id, content: r.content })
      }
    }
  }
  console.log(`Snapshot: ${lexSnapshot.length} posts/pages with embedded upload nodes.\n`)

  const { rowCount: deleted } = await pg.query(`DELETE FROM media`)
  console.log(`Deleted ${deleted} orphan media rows.\n`)

  const allFiles = await readdir(LOCAL_MEDIA)
  const originals = allFiles.filter((f) => !SIZE_VARIANT.test(f))
  console.log(`Local /media has ${allFiles.length} files; uploading ${originals.length} originals.`)

  const filenameToNewId = new Map<string, number>()
  let i = 0
  for (const filename of originals) {
    i++
    try {
      const buf = await readFile(path.join(LOCAL_MEDIA, filename))
      const newId = await uploadOne(token, filename, buf)
      if (newId) {
        filenameToNewId.set(filename, newId)
        if (i % 10 === 0 || i === originals.length) {
          console.log(`  [${i}/${originals.length}] ${filename} -> id=${newId}`)
        }
      }
    } catch (e) {
      console.log(`  [${i}/${originals.length}] ERR ${filename}: ${e}`)
    }
  }
  console.log(`\nUploaded ${filenameToNewId.size}/${originals.length} files.\n`)

  console.log('Restoring FK references...')
  let fkRestored = 0
  let fkMissed = 0
  for (const s of snapshot) {
    const newId = filenameToNewId.get(s.filename)
    if (!newId) {
      fkMissed++
      continue
    }
    await pg.query(
      `UPDATE ${s.table} SET ${s.col} = $1 WHERE id = $2`,
      [newId, s.row_id],
    )
    fkRestored++
  }
  console.log(`  restored=${fkRestored}  missed=${fkMissed}\n`)

  console.log('Remapping Lexical upload nodes...')
  let lexRestored = 0
  for (const entry of lexSnapshot) {
    const refs = collectUploadRefs(entry.content?.root)
    let changed = false
    for (const ref of refs) {
      const filename = oldIdToFilename.get(ref.oldId)
      if (!filename) continue
      const newId = filenameToNewId.get(filename)
      if (!newId) continue
      ref.parent[ref.key] = newId
      changed = true
    }
    if (changed) {
      await pg.query(
        `UPDATE ${entry.table} SET content = $1 WHERE id = $2`,
        [entry.content, entry.row_id],
      )
      lexRestored++
    }
  }
  console.log(`  ${lexRestored} documents with upload nodes remapped.\n`)

  await pg.end()
  console.log('Done.')
  process.exit(0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
