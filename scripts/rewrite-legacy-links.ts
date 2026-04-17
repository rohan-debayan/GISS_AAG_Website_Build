/**
 * Rewrite any aag-giss.org links in Post/Page content to the new site
 * paths so the content stays self-contained after the old site goes down.
 *
 * Rules:
 *   - http(s)://aag-giss.org/                      -> /
 *   - /constitution/                               -> /pages/constitution
 *   - /competitions-awards/*                       -> /awards/<slug>
 *   - /wp-content/uploads/<file>                   -> matched Media doc URL
 *   - any other aag-giss.org path                  -> root path kept (/) with a log
 *
 * Walks each post's Lexical content, updating 'link' node fields.url.
 * Idempotent: re-running is safe because rewritten URLs no longer match.
 *
 * Run:  npx tsx scripts/rewrite-legacy-links.ts
 *       npx tsx scripts/rewrite-legacy-links.ts --dry-run
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const dryRun = process.argv.includes('--dry-run')

/** Static path-based redirects we know about. */
const PATH_MAP: Array<[RegExp, string]> = [
  [/^\/?$/i, '/'],
  [/^\/constitution\/?$/i, '/pages/constitution'],
  [/^\/competitions-awards\/?$/i, '/awards'],
  [/^\/competitions-awards\/student-honors-paper-competition\/?$/i, '/awards/student-honors'],
  [
    /^\/competitions-awards\/student-honors-paper-competition\/aag-2026-[^/]+\/?$/i,
    '/awards/student-honors',
  ],
  [/^\/competitions-awards\/aangeenbrug-award\/?$/i, '/awards/aangeenbrug'],
  [
    /^\/competitions-awards\/tobler-lecture\/?$/i,
    '/awards/tobler-lecture',
  ],
  [
    /^\/competitions-awards\/tobler-lecture\/announcing-the-2026[^/]*\/?$/i,
    '/awards/tobler-lecture',
  ],
  [/^\/officers\/?$/i, '/officers'],
]

async function main() {
  const payload = await getPayload({ config: await config })

  // Build a lookup for wp-content/uploads/<path> -> Media.url.
  const mediaMap = new Map<string, string>()
  const allMedia = await payload.find({
    collection: 'media',
    limit: 500,
    depth: 0,
  })
  for (const m of allMedia.docs as any[]) {
    if (m.wpSourceUrl && m.url) {
      // Key on the trailing path after /wp-content/uploads/
      const match = m.wpSourceUrl.match(/\/wp-content\/uploads\/(.+)$/i)
      if (match) mediaMap.set(match[1].toLowerCase(), m.url)
    }
  }
  console.log(`Media lookup: ${mediaMap.size} entries\n`)

  function rewriteUrl(url: string): string | null {
    try {
      const parsed = new URL(url, 'http://aag-giss.org')
      if (!/aag-giss\.org/i.test(parsed.host)) return null
      const path = parsed.pathname || '/'

      // Direct match against path map
      for (const [re, target] of PATH_MAP) {
        if (re.test(path)) return target
      }

      // wp-content/uploads: resolve via media map
      const upMatch = path.match(/\/wp-content\/uploads\/(.+)$/i)
      if (upMatch) {
        const key = upMatch[1].toLowerCase()
        const mediaUrl = mediaMap.get(key)
        if (mediaUrl) return mediaUrl
        return null // unmatched media, leave as-is
      }

      // Anything else under aag-giss.org -> send to the new home page.
      return '/'
    } catch {
      return null
    }
  }

  let scannedPosts = 0
  let updatedPosts = 0
  let urlsRewritten = 0
  let urlsUnresolved = 0

  async function walkAndRewrite(node: any): Promise<boolean> {
    if (!node || typeof node !== 'object') return false
    let changed = false

    if (node.type === 'link') {
      const url = node.fields?.url || node.url
      if (typeof url === 'string' && /aag-giss\.org/i.test(url)) {
        const next = rewriteUrl(url)
        if (next && next !== url) {
          if (node.fields) node.fields.url = next
          else node.url = next
          urlsRewritten++
          changed = true
        } else if (!next) {
          urlsUnresolved++
          console.log(`  unresolved URL: ${url}`)
        }
      }
    }

    // Also rewrite bare aag-giss.org URLs that appear as text (not
    // wrapped in a link node). We do a plain string replacement, so
    // the paragraph reads like "Visit us at /awards/student-honors".
    if (node.type === 'text' && typeof node.text === 'string' && /aag-giss\.org/i.test(node.text)) {
      const originalText = node.text
      let nextText = originalText
      const urlRe = /https?:\/\/aag-giss\.org[^\s,"'<>)\]]*/gi
      nextText = nextText.replace(urlRe, (m) => {
        const mapped = rewriteUrl(m)
        if (mapped) {
          urlsRewritten++
          return mapped
        }
        urlsUnresolved++
        return m
      })
      if (nextText !== originalText) {
        node.text = nextText
        changed = true
      }
    }

    for (const c of node.children || []) {
      if (await walkAndRewrite(c)) changed = true
    }
    return changed
  }

  // ---- POSTS ----
  const posts = await payload.find({
    collection: 'posts',
    where: { _status: { equals: 'published' } },
    limit: 500,
    depth: 0,
  })
  for (const p of posts.docs as any[]) {
    scannedPosts++
    const root = p.content?.root
    if (!root) continue
    const snapshot = JSON.stringify(p.content)
    const changed = await walkAndRewrite(root)
    if (!changed) continue
    const after = JSON.stringify(p.content)
    if (snapshot === after) continue
    if (dryRun) {
      console.log(`  would update post: "${p.title}"`)
      updatedPosts++
      continue
    }
    await payload.update({
      collection: 'posts',
      id: p.id,
      data: { content: p.content },
    })
    updatedPosts++
    console.log(`  updated post: "${p.title}"`)
  }

  // ---- PAGES ----
  let scannedPages = 0
  let updatedPages = 0
  const pages = await payload.find({
    collection: 'pages',
    where: { _status: { equals: 'published' } },
    limit: 100,
    depth: 0,
  })
  for (const pg of pages.docs as any[]) {
    scannedPages++
    const root = pg.content?.root
    if (!root) continue
    const snapshot = JSON.stringify(pg.content)
    const changed = await walkAndRewrite(root)
    if (!changed) continue
    const after = JSON.stringify(pg.content)
    if (snapshot === after) continue
    if (dryRun) {
      console.log(`  would update page: "${pg.title}"`)
      updatedPages++
      continue
    }
    await payload.update({
      collection: 'pages',
      id: pg.id,
      data: { content: pg.content },
    })
    updatedPages++
    console.log(`  updated page: "${pg.title}"`)
  }

  console.log('\n=== Summary ===')
  console.log(`Posts scanned:    ${scannedPosts}`)
  console.log(`Posts updated:    ${updatedPosts}`)
  console.log(`Pages scanned:    ${scannedPages}`)
  console.log(`Pages updated:    ${updatedPages}`)
  console.log(`URLs rewritten:   ${urlsRewritten}`)
  console.log(`URLs unresolved:  ${urlsUnresolved}`)
  process.exit(0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
