/**
 * WordPress → Payload migration script.
 *
 * Reads the JSON produced by ../../migration/parse_wxr.py and the media
 * files in ../../migration/assets/, then creates corresponding documents
 * via Payload's Local API. Safe to re-run (idempotent by wp* id fields).
 *
 * Run:
 *     npm run import:wp                     # full import
 *     npm run import:wp -- --dry-run        # report only, no writes
 *     npm run import:wp -- --limit 5        # import only first 5 of each type
 *
 * Assumes:
 * - docker compose up -d is running (Postgres reachable via DATABASE_URL)
 * - migration/content/*.json exists (run `python migration/parse_wxr.py`)
 * - migration/assets/ has downloaded files (run `python migration/download_assets.py`)
 */
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { createReadStream, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'
import { JSDOM } from 'jsdom'
import { convertHTMLToLexical } from '@payloadcms/richtext-lexical'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import config from '../src/payload.config'

// --- Paths ------------------------------------------------------------------
const here = path.dirname(fileURLToPath(import.meta.url))
const MIGRATION_DIR = path.resolve(here, '..', '..', 'migration')
const CONTENT_DIR = path.join(MIGRATION_DIR, 'content')
const ASSETS_DIR = path.join(MIGRATION_DIR, 'assets')

// --- CLI flags --------------------------------------------------------------
const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const limitIdx = argv.indexOf('--limit')
const limit = limitIdx >= 0 ? parseInt(argv[limitIdx + 1], 10) : Infinity

// --- Types (subset of WXR JSON shape) ---------------------------------------
interface WxrAuthor {
  id: string
  login: string
  email: string
  display_name: string
  first_name: string
  last_name: string
}

interface WxrItem {
  wp_id: string
  post_type: string
  status: string
  title: string
  slug: string
  creator: string
  post_date: string
  post_date_gmt: string
  link: string
  parent_id: string
  menu_order: string
  categories: string[]
  tags: string[]
  content_html: string
  excerpt_html: string
  attachment_url: string
}

// --- Helpers ----------------------------------------------------------------
async function loadJson<T>(name: string): Promise<T> {
  const p = path.join(CONTENT_DIR, name)
  const buf = await readFile(p, 'utf-8')
  return JSON.parse(buf) as T
}

/**
 * Strip WordPress Gutenberg block comments from HTML.
 * They look like:  <!-- wp:paragraph --> ... <!-- /wp:paragraph -->
 */
function stripGutenberg(html: string): string {
  return html.replace(/<!--\s*\/?wp:[^>]*-->/g, '').trim()
}

/**
 * Clean up patterns that break Payload's Lexical link validator:
 * - bare `<a>` with no href  (unwrap, keep text)
 * - `<a href="mailto:...">` / `tel:` / `javascript:`  (unwrap, keep text;
 *   Lexical's default LinkFeature only accepts http/https/relative URLs)
 * - `<a>` wrapping an `<img>` (unwrap — we want the image, not the link
 *   to the raw-file URL on aag-giss.org that will stop existing soon)
 * - empty `href=""`  (unwrap)
 * - href starting or ending with whitespace (trim inside the attribute)
 */
function sanitizeWpHtml(html: string): string {
  let out = stripGutenberg(html || '')

  // <figure>…</figure>  →  unwrap (keep inner HTML). Gutenberg emits figures
  // around images and captions that Lexical has trouble parsing nested.
  out = out.replace(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi, '$1')

  // <figcaption>…</figcaption>  →  turn into a paragraph.
  out = out.replace(
    /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi,
    '<p>$1</p>',
  )

  // <a …><img …/></a>  →  drop the link, keep the img.
  // Handles both self-closing and not, with arbitrary whitespace.
  out = out.replace(
    /<a\b[^>]*>\s*(<img\b[^>]*?\/?>)\s*<\/a>/gi,
    '$1',
  )

  // Trim whitespace inside href="..."  (common in copy-pasted links)
  out = out.replace(/href\s*=\s*"\s*([^"]+?)\s*"/gi, 'href="$1"')

  // Unwrap <a> with no href, empty href, or non-http(s) protocol href.
  // Keep the inner text.  Use a loop to handle nested/repeating matches.
  const badLinkRe =
    /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  out = out.replace(badLinkRe, (match, attrs: string, inner: string) => {
    const hrefMatch = /href\s*=\s*"([^"]*)"/i.exec(attrs)
    const href = hrefMatch?.[1] ?? ''
    const ok =
      href &&
      (href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('/') ||
        href.startsWith('#'))
    if (ok) return match
    return inner
  })

  return out
}

/**
 * Convert WordPress HTML to Lexical editor state.
 * Returns Payload's Lexical richText value shape.
 */
async function htmlToLexical(
  html: string,
  urlToMediaId: Map<string, number> = new Map(),
): Promise<{ root: SerializedEditorState['root'] }> {
  const cleaned = sanitizeWpHtml(html || '')
  const wrapped = cleaned.startsWith('<') ? cleaned : `<p>${cleaned}</p>`
  const configResolved = await config
  const editorConfig =
    configResolved.editor && 'editorConfig' in configResolved.editor
      ? await configResolved.editor.editorConfig
      : undefined
  if (!editorConfig) {
    throw new Error('Could not resolve Lexical editorConfig from Payload config.')
  }
  const result = await convertHTMLToLexical({
    editorConfig,
    html: wrapped,
    JSDOM,
  })
  fixUploadNodes(result.root as any, urlToMediaId)
  return result
}

/**
 * The HTML converter turns <img src="http://aag-giss.org/..."> into upload
 * nodes whose value is the source URL. Payload's validator rejects those —
 * it expects the value to be a real Media doc id. Walk the tree and:
 *   • replace value with the Payload media id if we have it in urlToMediaId
 *   • drop the node entirely if we don't (upstream WP image won't resolve
 *     post-cutover, so a broken img is worse than no img)
 */
function fixUploadNodes(
  node: any,
  urlToMediaId: Map<string, number>,
): void {
  if (!node || typeof node !== 'object') return
  const children: any[] = Array.isArray(node.children) ? node.children : []
  const kept: any[] = []
  for (const child of children) {
    if (child && child.type === 'upload') {
      const raw = typeof child.value === 'string' ? child.value : child.value?.id
      // Look up by best match — any URL pointing at our uploads dir.
      let mediaId: number | undefined
      if (typeof raw === 'string') {
        // Exact match first
        mediaId = urlToMediaId.get(raw)
        if (!mediaId) {
          // Filename suffix match (e.g. "...-1024x576.jpg" vs full-size)
          const base = raw.split('/').pop()?.split('?')[0]?.split('-').slice(0, 3).join('-')
          if (base) {
            for (const [k, v] of urlToMediaId) {
              if (k.includes(base)) {
                mediaId = v
                break
              }
            }
          }
        }
      } else if (typeof raw === 'number') {
        mediaId = raw // already an id
      }
      if (mediaId) {
        kept.push({
          ...child,
          value: mediaId,
          relationTo: child.relationTo || 'media',
        })
      }
      // else: drop
    } else {
      fixUploadNodes(child, urlToMediaId)
      kept.push(child)
    }
  }
  if (Array.isArray(node.children)) {
    node.children = kept
  }
}

/** Derive local file path from the original aag-giss.org URL. */
function assetLocalPath(url: string): string | null {
  const m = url.match(/\/wp-content\/uploads\/(.+)$/i)
  if (!m) return null
  return path.join(ASSETS_DIR, decodeURIComponent(m[1]))
}

/** Simple in-memory counters for the end-of-run summary. */
const stats = {
  users: { created: 0, skipped: 0 },
  media: { created: 0, skipped: 0, missingFile: 0 },
  pages: { created: 0, skipped: 0 },
  posts: { created: 0, skipped: 0 },
  errors: [] as { kind: string; id: string; msg: string }[],
}

// --- Main -------------------------------------------------------------------
async function main() {
  console.log(
    `\n=== WordPress → Payload import ${dryRun ? '(DRY RUN)' : ''} ${
      limit !== Infinity ? `[limit=${limit}]` : ''
    }\n`,
  )
  const payload = await getPayload({ config })

  // Preload data
  const authors = await loadJson<WxrAuthor[]>('authors.json')
  const pages = await loadJson<WxrItem[]>('pages.json')
  const posts = await loadJson<WxrItem[]>('posts.json')
  const attachments = await loadJson<WxrItem[]>('attachments.json')

  console.log(
    `Loaded: ${authors.length} authors, ${pages.length} pages, ${posts.length} posts, ${attachments.length} attachments\n`,
  )

  // -------- 1. USERS ---------------------------------------------------------
  console.log('--- Importing authors as Users ---')
  const authorIdToUserId = new Map<string, number>()
  for (const a of authors) {
    if (!a.email) {
      console.log(`  skip: author ${a.login} has no email`)
      continue
    }
    // Does a user with this email already exist?
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: a.email } },
      limit: 1,
    })
    if (existing.docs.length) {
      authorIdToUserId.set(a.id, existing.docs[0].id as number)
      stats.users.skipped += 1
      console.log(`  skip: ${a.email} (already exists as id=${existing.docs[0].id})`)
      continue
    }
    if (dryRun) {
      stats.users.created += 1
      console.log(`  would create: ${a.email}  (${a.display_name})`)
      continue
    }
    // Generate a random placeholder password; the user can reset via "forgot password" flow later.
    const pwd = `wp_${Math.random().toString(36).slice(2)}_${Date.now()}`
    const created = await payload.create({
      collection: 'users',
      data: {
        email: a.email,
        name: a.display_name || a.login,
        password: pwd,
        role: 'author',
        wpAuthorId: a.id,
      },
    })
    authorIdToUserId.set(a.id, created.id as number)
    stats.users.created += 1
    console.log(`  create: ${a.email}  id=${created.id}`)
  }

  // -------- 2. MEDIA --------------------------------------------------------
  console.log('\n--- Importing attachments as Media ---')
  const urlToMediaId = new Map<string, number>()
  let mediaCount = 0
  for (const att of attachments) {
    if (mediaCount >= limit) break
    mediaCount++
    const url = att.attachment_url
    if (!url) continue
    // Already imported?
    const existing = await payload.find({
      collection: 'media',
      where: { wpAttachmentId: { equals: att.wp_id } },
      limit: 1,
    })
    if (existing.docs.length) {
      urlToMediaId.set(url, existing.docs[0].id as number)
      stats.media.skipped += 1
      console.log(`  skip: ${path.basename(url)} (id=${existing.docs[0].id})`)
      continue
    }
    const localPath = assetLocalPath(url)
    if (!localPath || !existsSync(localPath)) {
      stats.media.missingFile += 1
      stats.errors.push({
        kind: 'media',
        id: att.wp_id,
        msg: `local file missing: ${localPath}`,
      })
      console.log(`  MISS: ${url}  (not at ${localPath})`)
      continue
    }
    if (dryRun) {
      stats.media.created += 1
      console.log(`  would create: ${path.basename(url)}`)
      continue
    }
    try {
      const buf = await readFile(localPath)
      const altText = att.title || path.basename(url)
      const created = await payload.create({
        collection: 'media',
        data: {
          alt: altText,
          wpAttachmentId: att.wp_id,
          wpSourceUrl: url,
        },
        file: {
          data: buf,
          mimetype: guessMime(localPath),
          name: path.basename(localPath),
          size: buf.length,
        },
      })
      urlToMediaId.set(url, created.id as number)
      stats.media.created += 1
      console.log(`  create: ${path.basename(url)}  id=${created.id}`)
    } catch (e) {
      stats.media.missingFile += 1
      stats.errors.push({ kind: 'media', id: att.wp_id, msg: String(e) })
      console.log(`  ERR : ${url}  ${e}`)
    }
  }

  // -------- 3. PAGES --------------------------------------------------------
  console.log('\n--- Importing pages ---')
  let pageCount = 0
  for (const pg of pages) {
    if (pageCount >= limit) break
    pageCount++
    if (pg.status !== 'publish') {
      console.log(`  skip: "${pg.title}" status=${pg.status}`)
      continue
    }
    const existing = await payload.find({
      collection: 'pages',
      where: { wpPageId: { equals: pg.wp_id } },
      limit: 1,
    })
    if (existing.docs.length) {
      stats.pages.skipped += 1
      console.log(`  skip: "${pg.title}" (already id=${existing.docs[0].id})`)
      continue
    }
    if (dryRun) {
      stats.pages.created += 1
      console.log(`  would create page: ${pg.title}`)
      continue
    }
    try {
      const content = await htmlToLexical(pg.content_html, urlToMediaId)
      const created = await payload.create({
        collection: 'pages',
        data: {
          title: pg.title,
          slug: pg.slug || slugify(pg.title),
          content: content as any,
          menuOrder: parseInt(pg.menu_order, 10) || 100,
          wpPageId: pg.wp_id,
          _status: 'published',
        },
      })
      stats.pages.created += 1
      console.log(`  create: "${pg.title}"  id=${created.id}`)
    } catch (e) {
      stats.errors.push({ kind: 'page', id: pg.wp_id, msg: String(e) })
      console.log(`  ERR : "${pg.title}"  ${e}`)
    }
  }

  // -------- 4. POSTS --------------------------------------------------------
  console.log('\n--- Importing posts ---')
  let postCount = 0
  for (const p of posts) {
    if (postCount >= limit) break
    postCount++
    if (p.status !== 'publish') {
      console.log(`  skip: "${p.title}" status=${p.status}`)
      continue
    }
    const existing = await payload.find({
      collection: 'posts',
      where: { wpPostId: { equals: p.wp_id } },
      limit: 1,
    })
    if (existing.docs.length) {
      stats.posts.skipped += 1
      console.log(`  skip: "${p.title}" (already id=${existing.docs[0].id})`)
      continue
    }
    // Resolve author
    const author =
      authors.find(
        (a) => a.display_name === p.creator || a.login === p.creator,
      )
    const authorUserId = author ? authorIdToUserId.get(author.id) : undefined
    if (!authorUserId && !dryRun) {
      console.log(`  WARN: no author match for "${p.creator}" on "${p.title}"`)
    }

    const category = mapCategory(p.categories)
    if (dryRun) {
      stats.posts.created += 1
      console.log(`  would create post [${category}]: ${p.title}`)
      continue
    }
    try {
      const content = await htmlToLexical(p.content_html, urlToMediaId)
      const created = await payload.create({
        collection: 'posts',
        data: {
          title: p.title,
          slug: p.slug || slugify(p.title),
          content: content as any,
          excerpt: stripHtml(p.excerpt_html).slice(0, 300) || undefined,
          category,
          tags: p.tags?.map((t) => ({ tag: t })) || [],
          author: authorUserId ?? 1, // fallback to admin user (id=1)
          publishedAt: p.post_date || p.post_date_gmt,
          wpPostId: p.wp_id,
          _status: 'published',
        },
      })
      stats.posts.created += 1
      console.log(`  create: "${p.title}"  id=${created.id}  cat=${category}`)
    } catch (e: any) {
      const detail =
        e?.data?.errors?.map((er: any) => `${er.path}: ${er.message}`).join(' | ') ||
        e?.data ||
        String(e)
      stats.errors.push({ kind: 'post', id: p.wp_id, msg: String(detail) })
      console.log(`  ERR : "${p.title}"  ${String(detail).slice(0, 400)}`)
    }
  }

  // -------- SUMMARY ---------------------------------------------------------
  console.log('\n=== Summary ===')
  console.log(`Users:  created=${stats.users.created}  skipped=${stats.users.skipped}`)
  console.log(
    `Media:  created=${stats.media.created}  skipped=${stats.media.skipped}  missing-files=${stats.media.missingFile}`,
  )
  console.log(`Pages:  created=${stats.pages.created}  skipped=${stats.pages.skipped}`)
  console.log(`Posts:  created=${stats.posts.created}  skipped=${stats.posts.skipped}`)
  console.log(`Errors: ${stats.errors.length}`)
  if (stats.errors.length) {
    console.log('\nFirst 10 errors:')
    for (const e of stats.errors.slice(0, 10)) {
      console.log(`  [${e.kind} ${e.id}] ${e.msg}`)
    }
  }

  process.exit(stats.errors.length ? 1 : 0)
}

// --- small utils ------------------------------------------------------------
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

function stripHtml(s: string): string {
  return (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function guessMime(p: string): string {
  const ext = path.extname(p).toLowerCase()
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
  return map[ext] ?? 'application/octet-stream'
}

function mapCategory(cats: string[]): string {
  const lc = cats.map((c) => c.toLowerCase())
  if (lc.includes('jobs')) return 'jobs'
  if (lc.includes('awards')) return 'award'
  if (lc.includes('meetings')) return 'meeting'
  if (lc.includes('events')) return 'event'
  if (lc.includes('call for papers')) return 'call-for-papers'
  if (lc.includes('newsletter')) return 'newsletter'
  if (lc.includes('board nominations')) return 'board-nomination'
  if (lc.includes('website updates')) return 'website-update'
  return 'news'
}

main().catch((err) => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
