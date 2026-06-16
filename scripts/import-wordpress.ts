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

const here = path.dirname(fileURLToPath(import.meta.url))
const MIGRATION_DIR = path.resolve(here, '..', '..', 'migration')
const CONTENT_DIR = path.join(MIGRATION_DIR, 'content')
const ASSETS_DIR = path.join(MIGRATION_DIR, 'assets')

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const limitIdx = argv.indexOf('--limit')
const limit = limitIdx >= 0 ? parseInt(argv[limitIdx + 1], 10) : Infinity

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

async function loadJson<T>(name: string): Promise<T> {
  const p = path.join(CONTENT_DIR, name)
  const buf = await readFile(p, 'utf-8')
  return JSON.parse(buf) as T
}

function stripGutenberg(html: string): string {
  return html.replace(/<!--\s*\/?wp:[^>]*-->/g, '').trim()
}

function sanitizeWpHtml(html: string): string {
  let out = stripGutenberg(html || '')

  out = out.replace(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi, '$1')

  out = out.replace(
    /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi,
    '<p>$1</p>',
  )

  out = out.replace(
    /<a\b[^>]*>\s*(<img\b[^>]*?\/?>)\s*<\/a>/gi,
    '$1',
  )

  out = out.replace(/href\s*=\s*"\s*([^"]+?)\s*"/gi, 'href="$1"')

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
      let mediaId: number | undefined
      if (typeof raw === 'string') {
        mediaId = urlToMediaId.get(raw)
        if (!mediaId) {
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
        mediaId = raw 
      }
      if (mediaId) {
        kept.push({
          ...child,
          value: mediaId,
          relationTo: child.relationTo || 'media',
        })
      }
    } else {
      fixUploadNodes(child, urlToMediaId)
      kept.push(child)
    }
  }
  if (Array.isArray(node.children)) {
    node.children = kept
  }
}

function assetLocalPath(url: string): string | null {
  const m = url.match(/\/wp-content\/uploads\/(.+)$/i)
  if (!m) return null
  return path.join(ASSETS_DIR, decodeURIComponent(m[1]))
}

const stats = {
  users: { created: 0, skipped: 0 },
  media: { created: 0, skipped: 0, missingFile: 0 },
  pages: { created: 0, skipped: 0 },
  posts: { created: 0, skipped: 0 },
  errors: [] as { kind: string; id: string; msg: string }[],
}

async function main() {
  console.log(
    `\n=== WordPress → Payload import ${dryRun ? '(DRY RUN)' : ''} ${
      limit !== Infinity ? `[limit=${limit}]` : ''
    }\n`,
  )
  const payload = await getPayload({ config })

  const authors = await loadJson<WxrAuthor[]>('authors.json')
  const pages = await loadJson<WxrItem[]>('pages.json')
  const posts = await loadJson<WxrItem[]>('posts.json')
  const attachments = await loadJson<WxrItem[]>('attachments.json')

  console.log(
    `Loaded: ${authors.length} authors, ${pages.length} pages, ${posts.length} posts, ${attachments.length} attachments\n`,
  )

  console.log('--- Importing authors as Users ---')
  const authorIdToUserId = new Map<string, number>()
  for (const a of authors) {
    if (!a.email) {
      console.log(`  skip: author ${a.login} has no email`)
      continue
    }
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
