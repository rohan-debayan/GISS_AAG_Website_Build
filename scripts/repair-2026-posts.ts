/**
 * Repair the 2 posts imported from the live REST API snapshot that were
 * missing their flyer images and "Click here..." link paragraphs:
 *
 *   - wp id 615 / slug announcing-the-2026-giss-sg-honors-competition-finalists
 *   - wp id 608 / slug the-waldo-tobler-distinguished-lecture-2026
 *
 * Root cause: the original WordPress HTML references the flyer image at
 * a resized URL (e.g. Twitter_2026_..._competition_flyer-709x1024.jpg)
 * while our uploaded Media doc's wpSourceUrl points at the -scaled.jpg
 * variant. The import-time upload-node fixer didn't normalize the
 * size suffix, so the upload node was dropped entirely, leaving empty
 * paragraphs. This script normalizes image URLs and re-converts the
 * content, then updates the posts in place.
 *
 * Run:  npx tsx scripts/repair-2026-posts.ts
 *       npx tsx scripts/repair-2026-posts.ts --dry-run
 */
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'
import { JSDOM } from 'jsdom'
import { convertHTMLToLexical } from '@payloadcms/richtext-lexical'

import config from '../src/payload.config'

const here = path.dirname(fileURLToPath(import.meta.url))
const LIVE = path.resolve(here, '..', '..', 'migration', 'live', 'posts.json')
const TARGET_IDS = new Set([615, 608])

const dryRun = process.argv.includes('--dry-run')

function stripGutenberg(html: string): string {
  return html.replace(/<!--\s*\/?wp:[^>]*-->/g, '').trim()
}

/** Normalize a WordPress image URL by stripping size suffixes so
 *  -709x1024.jpg, -1024x576.jpg, -scaled.jpg all collapse to the
 *  underlying canonical image filename. */
function normalizeImageUrl(url: string): string {
  return url.replace(/-(?:\d+x\d+|scaled)(?=\.[a-zA-Z0-9]+$)/, '')
}

function sanitize(html: string): string {
  let out = stripGutenberg(html || '')
  // Pre-emptively normalize <img src> URLs so they match our Media map.
  out = out.replace(/<img\b[^>]*>/gi, (img) =>
    img.replace(/src\s*=\s*"([^"]+)"/i, (_, src: string) => `src="${normalizeImageUrl(src)}"`),
  )
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
        // Exact match first, then fall back to normalized.
        mediaId = urlToMediaId.get(raw)
        if (!mediaId) mediaId = urlToMediaId.get(normalizeImageUrl(raw))
      } else if (typeof raw === 'number') {
        mediaId = raw
      }
      if (mediaId) {
        kept.push({ ...child, value: mediaId, relationTo: child.relationTo || 'media' })
      }
      // else drop
    } else {
      fixUploadNodes(child, urlToMediaId)
      kept.push(child)
    }
  }
  if (Array.isArray(node.children)) node.children = kept
}

/** Remove paragraph nodes that have no text descendants. */
function pruneEmptyParagraphs(node: any): void {
  if (!node || typeof node !== 'object') return
  const kids = Array.isArray(node.children) ? node.children : []
  const kept: any[] = []
  for (const child of kids) {
    if (child?.type === 'paragraph') {
      const hasText = containsText(child)
      if (hasText) {
        pruneEmptyParagraphs(child)
        kept.push(child)
      }
      continue
    }
    pruneEmptyParagraphs(child)
    kept.push(child)
  }
  if (Array.isArray(node.children)) node.children = kept
}

function containsText(n: any): boolean {
  if (!n) return false
  if (n.type === 'text' && (n.text || '').trim().length > 0) return true
  if (n.type === 'upload' || n.type === 'link') return true
  for (const c of n.children || []) {
    if (containsText(c)) return true
  }
  return false
}

async function main() {
  console.log(`\n=== Repair 2026 posts ${dryRun ? '(DRY RUN)' : ''}\n`)
  const payload = await getPayload({ config: await config })

  // Build media map with BOTH original and normalized keys.
  const allMedia = await payload.find({ collection: 'media', limit: 500, depth: 0 })
  const urlToMediaId = new Map<string, number>()
  for (const m of allMedia.docs as any[]) {
    if (m.wpSourceUrl) {
      urlToMediaId.set(m.wpSourceUrl, m.id as number)
      urlToMediaId.set(normalizeImageUrl(m.wpSourceUrl), m.id as number)
    }
  }
  console.log(`Media lookup: ${urlToMediaId.size} entries\n`)

  const livePosts = JSON.parse(await readFile(LIVE, 'utf-8'))
  const cfg = await config
  const editorConfig =
    cfg.editor && 'editorConfig' in cfg.editor ? await cfg.editor.editorConfig : undefined
  if (!editorConfig) throw new Error('editorConfig not resolvable')

  for (const p of livePosts) {
    if (!TARGET_IDS.has(p.id)) continue
    const html = p.content?.rendered || ''
    const cleaned = sanitize(html)

    const result = await convertHTMLToLexical({
      editorConfig,
      html: cleaned.startsWith('<') ? cleaned : `<p>${cleaned}</p>`,
      JSDOM,
    })
    fixUploadNodes(result.root as any, urlToMediaId)
    pruneEmptyParagraphs(result.root as any)

    // Convert HTML's built-in img->upload conversion is unreliable for
    // bare <img> tags with off-host src URLs. Append upload nodes
    // manually for any img in the sanitized HTML that we can map to a
    // Media doc via normalized URL.
    const imgMatches = Array.from(cleaned.matchAll(/<img\b[^>]*\bsrc\s*=\s*"([^"]+)"[^>]*>/gi))
    const seenMediaIds = new Set<number>()
    // Skip media already referenced by upload nodes that survived conversion.
    ;(function scanExisting(n: any) {
      if (!n || typeof n !== 'object') return
      if (n.type === 'upload' && typeof n.value === 'number') seenMediaIds.add(n.value)
      for (const c of n.children || []) scanExisting(c)
    })(result.root as any)

    for (const m of imgMatches) {
      const src = m[1]
      const mediaId = urlToMediaId.get(src) || urlToMediaId.get(normalizeImageUrl(src))
      if (!mediaId || seenMediaIds.has(mediaId)) continue
      // Append a block-level upload node at the end of the content.
      ;(result.root as any).children.push({
        type: 'upload',
        format: '',
        version: 3,
        fields: null,
        relationTo: 'media',
        value: mediaId,
      } as any)
      seenMediaIds.add(mediaId)
    }

    // Find the corresponding Payload post by wpPostId and update.
    const existing = await payload.find({
      collection: 'posts',
      where: { wpPostId: { equals: String(p.id) } },
      limit: 1,
    })
    const target = existing.docs[0] as any
    if (!target) {
      console.log(`  skip wpId=${p.id}: no matching Post`)
      continue
    }

    const before = (target.content?.root?.children || []).length
    const after = (result.root as any).children.length
    console.log(`  wpId=${p.id} "${p.title.rendered}": ${before} -> ${after} blocks`)

    if (dryRun) continue

    await payload.update({
      collection: 'posts',
      id: target.id,
      data: { content: result as any },
    })
    console.log(`    updated`)
  }

  // Re-apply legacy-link rewrite logic for just these two posts so the
  // aag-giss.org link URLs get mapped to /awards/... paths.
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
    [/^\/competitions-awards\/tobler-lecture\/?$/i, '/awards/tobler-lecture'],
    [
      /^\/competitions-awards\/tobler-lecture\/announcing-the-2026[^/]*\/?$/i,
      '/awards/tobler-lecture',
    ],
    [/^\/officers\/?$/i, '/officers'],
  ]

  function mapAagGissUrl(url: string): string | null {
    try {
      const parsed = new URL(url, 'http://aag-giss.org')
      if (!/aag-giss\.org/i.test(parsed.host)) return null
      const pathOnly = parsed.pathname || '/'
      for (const [re, target] of PATH_MAP) if (re.test(pathOnly)) return target
      const upMatch = pathOnly.match(/\/wp-content\/uploads\/(.+)$/i)
      if (upMatch) return null
      return '/'
    } catch {
      return null
    }
  }

  function walkLinks(node: any): boolean {
    if (!node || typeof node !== 'object') return false
    let changed = false
    if (node.type === 'link') {
      const url = node.fields?.url || node.url
      if (typeof url === 'string' && /aag-giss\.org/i.test(url)) {
        const next = mapAagGissUrl(url)
        if (next && next !== url) {
          if (node.fields) node.fields.url = next
          else node.url = next
          changed = true
        }
      }
    }
    for (const c of node.children || []) if (walkLinks(c)) changed = true
    return changed
  }

  for (const wpId of TARGET_IDS) {
    const existing = await payload.find({
      collection: 'posts',
      where: { wpPostId: { equals: String(wpId) } },
      limit: 1,
    })
    const t = existing.docs[0] as any
    if (!t) continue
    if (walkLinks(t.content?.root) && !dryRun) {
      await payload.update({
        collection: 'posts',
        id: t.id,
        data: { content: t.content },
      })
      console.log(`  post-rewrite links updated on wpId=${wpId}`)
    }
  }

  console.log('\nDone.')
  process.exit(0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
