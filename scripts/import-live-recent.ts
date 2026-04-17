/**
 * Import the 2 posts + 2 pages that were added to aag-giss.org AFTER the
 * Oct 17 2025 WXR export, plus their 2 new media files. Data source is the
 * WP REST API snapshot saved at migration/live/*.json by fetch_live.py.
 *
 * Run:
 *     npx tsx scripts/import-live-recent.ts
 *     npx tsx scripts/import-live-recent.ts --dry-run
 *
 * Idempotent by wpPostId / wpPageId / wpAttachmentId.
 */
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'
import { JSDOM } from 'jsdom'
import { convertHTMLToLexical } from '@payloadcms/richtext-lexical'

import config from '../src/payload.config'

const here = path.dirname(fileURLToPath(import.meta.url))
const MIG = path.resolve(here, '..', '..', 'migration')
const LIVE = path.join(MIG, 'live')
const CONTENT = path.join(MIG, 'content')
const ASSETS = path.join(MIG, 'assets')

const dryRun = process.argv.includes('--dry-run')

// WXR category term_ids → Payload category slugs (from taxonomies.json).
const CATEGORY_BY_WP_ID: Record<number, string> = {
  9: 'award',
  10: 'board-nomination',
  13: 'event',
  16: 'jobs',
  20: 'meeting',
  24: 'call-for-papers',
  28: 'newsletter',
  4: 'website-update',
  1: 'news', // uncategorized → news
}

function stripGutenberg(html: string): string {
  return html.replace(/<!--\s*\/?wp:[^>]*-->/g, '').trim()
}

function sanitize(html: string): string {
  let out = stripGutenberg(html || '')
  out = out.replace(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi, '$1')
  out = out.replace(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi, '<p>$1</p>')
  out = out.replace(/<a\b[^>]*>\s*(<img\b[^>]*?\/?>)\s*<\/a>/gi, '$1')
  out = out.replace(/href\s*=\s*"\s*([^"]+?)\s*"/gi, 'href="$1"')
  out = out.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (match, attrs: string, inner: string) => {
    const hrefMatch = /href\s*=\s*"([^"]*)"/i.exec(attrs)
    const href = hrefMatch?.[1] ?? ''
    const ok =
      href &&
      (href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('/') ||
        href.startsWith('#'))
    return ok ? match : inner
  })
  return out
}

function fixUploadNodes(node: any, urlToMediaId: Map<string, number>): void {
  if (!node || typeof node !== 'object') return
  const children = Array.isArray(node.children) ? node.children : []
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
        kept.push({ ...child, value: mediaId, relationTo: child.relationTo || 'media' })
      }
    } else {
      fixUploadNodes(child, urlToMediaId)
      kept.push(child)
    }
  }
  if (Array.isArray(node.children)) node.children = kept
}

async function htmlToLexical(html: string, urlToMediaId: Map<string, number>) {
  const cleaned = sanitize(html || '')
  const wrapped = cleaned.startsWith('<') ? cleaned : `<p>${cleaned}</p>`
  const cfg = await config
  const editorConfig =
    cfg.editor && 'editorConfig' in cfg.editor ? await cfg.editor.editorConfig : undefined
  if (!editorConfig) throw new Error('editorConfig not resolvable')
  const result = await convertHTMLToLexical({ editorConfig, html: wrapped, JSDOM })
  fixUploadNodes(result.root as any, urlToMediaId)
  return result
}

function mimeOf(p: string): string {
  const ext = path.extname(p).toLowerCase()
  return (
    {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.pdf': 'application/pdf',
    } as Record<string, string>
  )[ext] ?? 'application/octet-stream'
}

function assetLocal(url: string): string | null {
  const m = url.match(/\/wp-content\/uploads\/(.+)$/i)
  if (!m) return null
  return path.join(ASSETS, decodeURIComponent(m[1]))
}

/** Remove WP's auto-appended read-more suffix + decode common HTML entities. */
function cleanExcerpt(s: string): string {
  let out = (s || '').replace(/<[^>]+>/g, '')
  // Strip WordPress's default "Continue reading →" suffix.
  out = out.replace(/\s*&hellip;\s*Continue reading\s*&rarr;\s*$/i, '\u2026')
  out = out.replace(/\s*\u2026\s*Continue reading\s*\u2192\s*$/i, '\u2026')
  // Decode the most common named entities we'd actually see in excerpts.
  out = out
    .replace(/&hellip;/g, '\u2026')
    .replace(/&rarr;/g, '\u2192')
    .replace(/&larr;/g, '\u2190')
    .replace(/&middot;/g, '\u00b7')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  return out.replace(/\s+/g, ' ').trim()
}

function stripHtml(s: string): string {
  return (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

async function main() {
  console.log(`\n=== Live-recent import ${dryRun ? '(DRY RUN)' : ''}\n`)
  const payload = await getPayload({ config: await config })

  // --- Determine which are NEW (not in WXR export)
  const livePosts = JSON.parse(await readFile(path.join(LIVE, 'posts.json'), 'utf-8'))
  const livePages = JSON.parse(await readFile(path.join(LIVE, 'pages.json'), 'utf-8'))
  const liveMedia = JSON.parse(await readFile(path.join(LIVE, 'media.json'), 'utf-8'))

  const wxrPosts = JSON.parse(await readFile(path.join(CONTENT, 'posts.json'), 'utf-8'))
  const wxrPages = JSON.parse(await readFile(path.join(CONTENT, 'pages.json'), 'utf-8'))
  const wxrAtts = JSON.parse(await readFile(path.join(CONTENT, 'attachments.json'), 'utf-8'))

  const wxrPostIds = new Set(wxrPosts.map((p: any) => String(p.wp_id)))
  const wxrPageIds = new Set(wxrPages.map((p: any) => String(p.wp_id)))
  const wxrAttIds = new Set(wxrAtts.map((a: any) => String(a.wp_id)))

  const newPosts = livePosts.filter((p: any) => !wxrPostIds.has(String(p.id)))
  const newPages = livePages.filter((p: any) => !wxrPageIds.has(String(p.id)))
  const newMedia = liveMedia.filter((m: any) => !wxrAttIds.has(String(m.id)))

  console.log(`New posts:  ${newPosts.length}`)
  console.log(`New pages:  ${newPages.length}`)
  console.log(`New media:  ${newMedia.length}\n`)

  // --- Build urlToMediaId from already-imported media (so inline images resolve)
  const urlToMediaId = new Map<string, number>()
  const allMedia = await payload.find({ collection: 'media', limit: 500, depth: 0 })
  for (const m of allMedia.docs as any[]) {
    if (m.wpSourceUrl) urlToMediaId.set(m.wpSourceUrl, m.id as number)
  }

  // --- Import new media
  console.log('--- Media ---')
  for (const m of newMedia) {
    const existing = await payload.find({
      collection: 'media',
      where: { wpAttachmentId: { equals: String(m.id) } },
      limit: 1,
    })
    if (existing.docs.length) {
      urlToMediaId.set(m.source_url, existing.docs[0].id as number)
      console.log(`  skip: ${path.basename(m.source_url)} (id=${existing.docs[0].id})`)
      continue
    }
    const local = assetLocal(m.source_url)
    if (!local || !existsSync(local)) {
      console.log(`  MISS: ${m.source_url} (not at ${local})`)
      continue
    }
    if (dryRun) {
      console.log(`  would create media: ${path.basename(local)}`)
      continue
    }
    try {
      const buf = await readFile(local)
      const created = await payload.create({
        collection: 'media',
        data: {
          alt: m.title?.rendered || path.basename(local),
          wpAttachmentId: String(m.id),
          wpSourceUrl: m.source_url,
        },
        file: {
          data: buf,
          mimetype: mimeOf(local),
          name: path.basename(local),
          size: buf.length,
        },
      })
      urlToMediaId.set(m.source_url, created.id as number)
      console.log(`  create: ${path.basename(local)}  id=${created.id}`)
    } catch (e) {
      console.log(`  ERR : ${m.source_url}  ${e}`)
    }
  }

  // --- Import new pages
  console.log('\n--- Pages ---')
  for (const pg of newPages) {
    const existing = await payload.find({
      collection: 'pages',
      where: { wpPageId: { equals: String(pg.id) } },
      limit: 1,
    })
    if (existing.docs.length) {
      console.log(`  skip: "${pg.title.rendered}"`)
      continue
    }
    if (dryRun) {
      console.log(`  would create page: ${pg.title.rendered}`)
      continue
    }
    try {
      const content = await htmlToLexical(pg.content?.rendered || '', urlToMediaId)
      const created = await payload.create({
        collection: 'pages',
        data: {
          title: stripHtml(pg.title.rendered),
          slug: pg.slug,
          content: content as any,
          menuOrder: parseInt(pg.menu_order || '100', 10) || 100,
          wpPageId: String(pg.id),
          _status: 'published',
        },
      })
      console.log(`  create: "${created.title}"  id=${created.id}`)
    } catch (e) {
      console.log(`  ERR : "${pg.title.rendered}"  ${e}`)
    }
  }

  // --- Import new posts
  console.log('\n--- Posts ---')
  for (const p of newPosts) {
    if (p.status !== 'publish') {
      console.log(`  skip (status=${p.status}): ${p.title.rendered}`)
      continue
    }
    const existing = await payload.find({
      collection: 'posts',
      where: { wpPostId: { equals: String(p.id) } },
      limit: 1,
    })
    if (existing.docs.length) {
      console.log(`  skip: "${p.title.rendered}"`)
      continue
    }
    const catId = Array.isArray(p.categories) ? p.categories[0] : undefined
    const category = (catId && CATEGORY_BY_WP_ID[catId]) || 'news'
    // Resolve author by wpAuthorId
    const authors = await payload.find({
      collection: 'users',
      where: { wpAuthorId: { equals: String(p.author) } },
      limit: 1,
    })
    const authorId = authors.docs[0]?.id ?? 1
    if (dryRun) {
      console.log(`  would create post [${category}]: ${p.title.rendered}`)
      continue
    }
    try {
      const content = await htmlToLexical(p.content?.rendered || '', urlToMediaId)
      const created = await payload.create({
        collection: 'posts',
        data: {
          title: stripHtml(p.title.rendered),
          slug: p.slug,
          content: content as any,
          excerpt: cleanExcerpt(p.excerpt?.rendered || '').slice(0, 300) || undefined,
          category,
          author: authorId as number,
          publishedAt: p.date,
          wpPostId: String(p.id),
          _status: 'published',
        } as any,
      })
      console.log(`  create: "${created.title}"  id=${created.id}  cat=${category}`)
    } catch (e) {
      console.log(`  ERR : "${p.title.rendered}"  ${e}`)
    }
  }

  console.log('\nDone.')
  process.exit(0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
